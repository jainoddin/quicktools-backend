import { News } from '../models/News';
import { runWithFailover } from './geminiClient';
import Parser from 'rss-parser';
import { CronLock } from '../models/CronLock';
import fetch from 'node-fetch';

const parser = new Parser();

const NEWS_FEEDS = [
  { url: 'https://techcrunch.com/category/artificial-intelligence/feed/', name: 'TechCrunch' },
  { url: 'https://venturebeat.com/category/ai/feed/', name: 'VentureBeat' },
  { url: 'https://news.mit.edu/rss/topic/artificial-intelligence2', name: 'MIT News' },
  { url: 'https://news.google.com/rss/search?q=AI+artificial+intelligence+when:24h&hl=en-US&gl=US&ceid=US:en', name: 'Google News' },
];

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function plainText(html: string): string {
  return decodeHtml(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

async function fetchText(url: string, timeoutMs = 15000): Promise<{ text: string; finalUrl: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal as any,
      redirect: 'follow',
      headers: { 'user-agent': 'QuickTools-NewsBot/1.0 (+https://quicktool.space)' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { text: await response.text(), finalUrl: response.url };
  } finally {
    clearTimeout(timer);
  }
}

function extractArticleBody(html: string): string {
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
  for (const script of scripts) {
    const raw = script.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '').trim();
    try {
      const root = JSON.parse(raw);
      const queue: any[] = Array.isArray(root) ? [...root] : [root];
      while (queue.length) {
        const node = queue.shift();
        if (!node || typeof node !== 'object') continue;
        if (typeof node.articleBody === 'string' && plainText(node.articleBody).length >= 500) {
          return plainText(node.articleBody).slice(0, 16000);
        }
        if (Array.isArray(node['@graph'])) queue.push(...node['@graph']);
      }
    } catch { /* Ignore malformed publisher metadata. */ }
  }

  const article = html.match(/<article\b[^>]*>[\s\S]*?<\/article>/i)?.[0]
    || html.match(/<main\b[^>]*>[\s\S]*?<\/main>/i)?.[0]
    || '';
  return plainText(article).slice(0, 16000);
}

async function fetchArticleContext(url: string): Promise<{ context: string; finalUrl: string }> {
  if (url.includes('news.google.com/')) return { context: '', finalUrl: url };
  const page = await fetchText(url, 15000);
  return { context: extractArticleBody(page.text), finalUrl: page.finalUrl };
}

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

    let selectedArticle: { title: string, contentSnippet: string, articleContext: string, link: string, pubDate: string, sourceName: string } | null = null;

    const feedResults = await Promise.allSettled(NEWS_FEEDS.map(async source => {
      const xml = await fetchText(source.url, 12000);
      return { source, feed: await parser.parseString(xml.text) };
    }));

    for (const result of feedResults) {
      if (result.status === 'rejected') {
        console.warn('News feed unavailable:', result.reason?.message || result.reason);
        continue;
      }
      for (const item of result.value.feed.items.slice(0, 12)) {
        if (!item.link || !item.title) continue;
        const isDuplicateUrl = existingNewsUrls.includes(item.link);
        const titleKey = item.title.toLowerCase().substring(0, 40);
        const isDuplicateTitle = existingNewsTitles.some(t => t.includes(titleKey));
        if (isDuplicateUrl || isDuplicateTitle) continue;

        const snippet = plainText(item.contentSnippet || item.content || item.summary || '');
        try {
          const extracted = await fetchArticleContext(item.link);
          const combinedContext = extracted.context || snippet;
          if (combinedContext.split(/\s+/).length < 120) continue;
          selectedArticle = {
            title: plainText(item.title), contentSnippet: snippet,
            articleContext: combinedContext, link: extracted.finalUrl,
            pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
            sourceName: result.value.source.name,
          };
          break;
        } catch (error: any) {
          console.warn(`Article context unavailable (${result.value.source.name}):`, error.message);
        }
      }
      if (selectedArticle) break;
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

We have fetched a real news snippet. Produce a short sourced summary without adding facts that are not present in the supplied context.

STRICT RULES:
- DO NOT invent facts. If information is unavailable, say so.
- Summarize the provided news article ONLY.
- Total length across summary, whatHappened, whyItMatters, highlights, insight, and conclusion: TARGET 285-320 words; hard range 250-350. Count before returning JSON. Neutral, journalistic tone. No fluff.
- Clearly attribute the original source, but do not put editorial notes, AI disclosures, or review-process text inside the article body; the page UI displays that disclosure separately.
- Each fact should appear only once. Do not repeat the summary, highlights, or source wording in multiple sections.
- Use complete, natural paragraphs and briefly explain unfamiliar terms in plain language.
- Every news article MUST have a distinct structure in its markdown sections. 

Here is the News Article to Summarize:
TITLE: ${selectedArticle.title}
SOURCE: ${selectedArticle.sourceName}
SNIPPET: ${selectedArticle.contentSnippet}
SOURCE ARTICLE CONTEXT:
${selectedArticle.articleContext.slice(0, 14000)}

Return STRICTLY a raw JSON object matching this exact schema:
{
  "title": "A factual, engaging 45-58 character news title based on the original",
  "metaTitle": "A complete SEO meta title of 45-58 characters total, including any brand suffix",
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
  "industryReaction": "Only include a reaction explicitly present in the supplied snippet; otherwise use an empty string.",
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
      topic: selectedArticle.title,
      searchIntent: 'news' as const,
      slug: generateSlug(parsedContent.title),
      title: parsedContent.title,
      isBreaking: parsedContent.isBreaking || false,
      summary: parsedContent.summary,

      heroImage: '',
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
      sourceContext: {
        title: selectedArticle.title,
        snippet: selectedArticle.contentSnippet,
        articleText: selectedArticle.articleContext,
        publishedAt: selectedArticle.pubDate,
      },

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
