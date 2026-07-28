import { News } from '../models/News';
import { runWithFailover } from './geminiClient';
import { generateAndUploadImage } from './r2.service';
import Parser from 'rss-parser';
import { CronLock } from '../models/CronLock';

const parser = new Parser();

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export async function generateNews(topicOverride?: string): Promise<any> {
  try {
    await CronLock.create({ key: 'news_generator' });
  } catch (error) {
    console.log("⚠️ News generation is already in progress. Skipping to prevent duplicates.");
    throw new Error('Generation already in progress (DB lock active)');
  }

  try {
    const currentYear = new Date().getFullYear();
    const existingNewsUrls = (await News.find({ sourceUrl: { $exists: true } }, 'sourceUrl').lean()).map(n => n.sourceUrl);
    const existingNewsTitles = (await News.find({}, 'title').lean()).map(n => n.title.toLowerCase());

    let selectedArticle: { title: string, contentSnippet: string, link: string, pubDate: string, sourceName: string } | null = null;

    // Fetch from Google News RSS
    // Querying for AI, artificial intelligence, etc. in English
    const feedUrl = 'https://news.google.com/rss/search?q=AI+artificial+intelligence+when:24h&hl=en-US&gl=US&ceid=US:en';
    
    try {
      const feed = await parser.parseURL(feedUrl);
      // Find the first article we haven't summarized yet
      for (const item of feed.items) {
        if (!item.link || !item.title) continue;
        
        const isDuplicateUrl = existingNewsUrls.includes(item.link);
        const isDuplicateTitle = existingNewsTitles.some(t => item.title && t.includes(item.title.toLowerCase().substring(0, 30)));
        
        if (!isDuplicateUrl && !isDuplicateTitle) {
          selectedArticle = {
            title: item.title,
            contentSnippet: item.contentSnippet || item.content || item.title,
            link: item.link,
            pubDate: item.pubDate || new Date().toISOString(),
            sourceName: item.source || 'Google News'
          };
          break;
        }
      }
    } catch (e) {
      console.error("Failed to parse RSS feed", e);
    }

    if (!selectedArticle) {
      console.log("⚠️ No fresh news articles found in RSS feed that haven't been summarized.");
      throw new Error("No fresh news articles found.");
    }

    // Find related news to link
    const existingNews = await News.find({}, 'title slug category').lean();
    let relatedNews = existingNews.filter(n => n.category === 'AI News');
    if (relatedNews.length < 4) relatedNews = existingNews;
    const shuffledRelated = relatedNews.sort(() => 0.5 - Math.random()).slice(0, 4);
    const relatedSlugs = shuffledRelated.map(n => n.slug);

    const prompt = `You are a Professional Tech Journalist reporting for quicktool.space News in the year ${currentYear}.

We have fetched a real news snippet. Your task is to summarize this news article, add necessary context, and explain why it matters to the AI industry. 

STRICT RULES:
- DO NOT invent facts. If information is unavailable, say so.
- Summarize the provided news article ONLY.
- Length: 500-800 words. Neutral, journalistic tone. No fluff.
- E-E-A-T signals: Mention "Reporting by quicktool.space Team" and reference the source context provided.
- Every news article MUST have a distinct structure in its markdown sections. 

Here is the News Article to Summarize:
TITLE: ${selectedArticle.title}
SOURCE: ${selectedArticle.sourceName}
SNIPPET: ${selectedArticle.contentSnippet}

Return STRICTLY a raw JSON object matching this exact schema:
{
  "title": "A highly engaging, SEO optimized 50-60 character news title based on the original",
  "metaTitle": "Title - quicktool.space",
  "metaDescription": "140-160 char meta description",
  "isBreaking": false,
  "summary": "2-3 lines complete news summary.",
  "readTime": "3 min read",
  "whatHappened": "Markdown formatted factual explanation of what happened...",
  "whyItMatters": "Markdown formatted explanation of why it matters to users/industry...",
  "keyHighlights": [
    "Highlight 1",
    "Highlight 2",
    "Highlight 3"
  ],
  "industryReaction": "Markdown formatted reaction, if available, or what the industry expects...",
  "quickToolsInsight": "Markdown formatted 'Related AI Tools' insights relevant to the news...",
  "conclusion": "Markdown formatted short conclusion..."
}`;

    const parsedContent = await runWithFailover(async (genAIInstance, modelName) => {
      const model = genAIInstance.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.2, // Lower temperature for factual summary
          maxOutputTokens: 4096,
          responseMimeType: 'application/json'
        }
      });
      console.log(`📰 Generating News Summary for: "${selectedArticle?.title}"`);
      const result = await model.generateContent(prompt);
      let rawText = result.response.text().trim();
      if (rawText.startsWith('\`\`\`json')) rawText = rawText.substring(7);
      else if (rawText.startsWith('\`\`\`')) rawText = rawText.substring(3);
      if (rawText.endsWith('\`\`\`')) rawText = rawText.substring(0, rawText.length - 3);
      rawText = rawText.trim();
      return JSON.parse(rawText);
    });

    return {
      slug: generateSlug(parsedContent.title),
      title: parsedContent.title,
      isBreaking: parsedContent.isBreaking || false,
      summary: parsedContent.summary,

      // Use generateAndUploadImage to upload to R2
      heroImage: await generateAndUploadImage(parsedContent.title, 'news_covers'),
      author: {
        name: 'QuickTools AI Team',
        avatar: '/icon.svg',
      },
      publishedAt: new Date(selectedArticle.pubDate),
      readTime: parsedContent.readTime || '3 min read',

      whatHappened: parsedContent.whatHappened,
      whyItMatters: parsedContent.whyItMatters,
      keyHighlights: parsedContent.keyHighlights || [],
      industryReaction: parsedContent.industryReaction,
      quickToolsInsight: parsedContent.quickToolsInsight,
      conclusion: parsedContent.conclusion,

      sourceName: selectedArticle.sourceName,
      sourceUrl: selectedArticle.link,

      relatedSlugs: relatedSlugs,
      tags: ['AI News'],
      category: 'AI News',

      metaTitle: parsedContent.metaTitle || parsedContent.title,
      metaDescription: parsedContent.metaDescription || parsedContent.summary
    };

  } catch (error) {
    console.error("AI News Generation Error:", error);
    throw error;
  } finally {
    await CronLock.deleteOne({ key: 'news_generator' });
  }
}
