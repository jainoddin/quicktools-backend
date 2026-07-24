import { News } from '../models/News';
import { runWithFailover } from './geminiClient';

const NEWS_TOPICS = [
  { topic: "OpenAI Launches GPT-4o Mini with Major Performance Boost", category: "Product Launches", tags: ["OpenAI", "GPT-4o Mini", "AI Models", "Product Launch"] },
  { topic: "Google Gemini 1.5 Pro Gets Context Window Upgrade", category: "Product Launches", tags: ["Google", "Gemini", "AI Models", "Product Update"] },
  { topic: "Anthropic Raises $4B in Series E Funding Round", category: "Funding", tags: ["Anthropic", "Funding", "Business"] },
  { topic: "Microsoft Integrates AI Copilot in All Office 365 Apps", category: "Partnerships", tags: ["Microsoft", "Copilot", "Integration", "Productivity"] },
  { topic: "Meta Unveils Llama 3.1: Better Performance, Lower Cost", category: "Research", tags: ["Meta", "Llama 3", "Open Source", "Research"] },
  { topic: "NVIDIA Unveils Next-Gen AI Chips for 2026", category: "Industry", tags: ["NVIDIA", "Hardware", "Chips", "Industry"] },
  { topic: "EU Passes Comprehensive AI Regulation Act", category: "Regulation", tags: ["EU", "Regulation", "AI Ethics", "Law"] },
  { topic: "Apple Intelligence Debuts in iOS 18", category: "Product Launches", tags: ["Apple", "Apple Intelligence", "iOS", "Mobile AI"] }
];

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
  const currentYear = new Date().getFullYear();
  const existingNews = await News.find({}, 'title slug category').lean();
  const usedTitles = existingNews.map(n => n.title.toLowerCase());

  let availableTopics = NEWS_TOPICS.filter(t =>
    !usedTitles.some(used => used.includes(t.topic.toLowerCase()))
  );

  if (availableTopics.length === 0) {
    console.log("⚠️ All predefined News topics used. Reusing existing pool.");
    availableTopics = NEWS_TOPICS;
  }

  const randomTopic = availableTopics[Math.floor(Math.random() * availableTopics.length)];
  const topicToGenerate = topicOverride || randomTopic.topic;
  const category = topicOverride ? 'AI News' : randomTopic.category;
  const tags = topicOverride ? ['AI', 'News', 'Update'] : randomTopic.tags;

  // Find related news
  let relatedNews = existingNews.filter(n => n.category === category);
  if (relatedNews.length < 4) {
    relatedNews = existingNews; // fallback
  }
  const shuffledRelated = relatedNews.sort(() => 0.5 - Math.random()).slice(0, 4);
  const relatedSlugs = shuffledRelated.map(n => n.slug);

  const prompt = `You are a Professional Tech Journalist reporting for QuickTools.ai News.

Write a factual, engaging, and professional News Article around this topic/event:
Topic: ${topicToGenerate}

This news page MUST strictly follow ALL of these rules:

CONTENT REQUIREMENTS:
1. Strong News Title (50–60 characters).
2. Short Summary ("In Short"): 2-3 lines explaining the complete news concisely.
3. Length: 700–1200 words. Neutral, journalistic tone. No fluff.
4. "What Happened?": Detailed explanation of the news event.
5. "Key Highlights": Array of 3-5 short, impactful bullet points.
6. "Why It Matters": Explain the impact on users, businesses, or the industry.
7. "Industry Reaction": Mention official announcements, quotes, or public reactions (use factual knowledge up to your training cutoff).
8. "QuickTools Insight": 2-3 lines of insight. Example: "If you're comparing AI models, our AI Tools directory can help you explore available options."
9. "Conclusion": Short summary of what's next.

STRICT RULES:
- Neutral reporting.
- FACTUAL accuracy. Do NOT invent fake quotes or fake events. If discussing recent tech, stick to known facts about the model/company.
- Never use "In today's digital world", "As an AI".
- Valid JSON ONLY.
- CRUCIAL YEAR RULE: You MUST use the year "${currentYear}" anywhere a year is mentioned (especially in titles, descriptions, and content). STRICTLY avoid using 2024 or 2025.

Return STRICTLY a raw JSON object matching this exact schema:
{
  "title": "News Title",
  "metaTitle": "News Title - QuickTools AI",
  "metaDescription": "140-160 char meta description",
  "isBreaking": true,
  "summary": "2-3 lines complete news summary.",
  "readTime": "3 min read",
  "whatHappened": "Markdown formatted explanation of what happened...",
  "whyItMatters": "Markdown formatted explanation of why it matters...",
  "keyHighlights": [
    "Highlight 1",
    "Highlight 2",
    "Highlight 3"
  ],
  "industryReaction": "Markdown formatted reaction and quotes...",
  "quickToolsInsight": "Markdown formatted QuickTools insight...",
  "conclusion": "Markdown formatted short conclusion..."
}`;

  try {
    const parsedContent = await runWithFailover(async (genAIInstance) => {
      const model = genAIInstance.getGenerativeModel({
        model: 'gemini-3-flash-preview',
        generationConfig: {
          temperature: 0.3, // Lower temperature for more factual, journalistic reporting
          maxOutputTokens: 4096,
          responseMimeType: 'application/json'
        }
      });
      console.log(`📰 Generating News for topic: "${topicToGenerate}"`);
      const result = await model.generateContent(prompt);
      let rawText = result.response.text().trim();
      if (rawText.startsWith('```json')) {
        rawText = rawText.substring(7);
      } else if (rawText.startsWith('```')) {
        rawText = rawText.substring(3);
      }
      if (rawText.endsWith('```')) {
        rawText = rawText.substring(0, rawText.length - 3);
      }
      rawText = rawText.trim();
      return JSON.parse(rawText);
    });

    return {
      slug: generateSlug(parsedContent.title),
      title: parsedContent.title,
      isBreaking: parsedContent.isBreaking || false,
      summary: parsedContent.summary,

      // Use pollinations for a relevant hero image
      heroImage: `https://image.pollinations.ai/prompt/${encodeURIComponent(parsedContent.title + ' cinematic technology news editorial photography 8k resolution highly detailed')}?width=1200&height=630&nologo=true&seed=${Math.floor(Math.random() * 100000)}`,

      author: {
        name: 'QuickTools AI Team',
        avatar: '/icon.svg',
      },
      publishedAt: new Date(),
      readTime: parsedContent.readTime || '3 min read',

      whatHappened: parsedContent.whatHappened,
      whyItMatters: parsedContent.whyItMatters,
      keyHighlights: parsedContent.keyHighlights || [],
      industryReaction: parsedContent.industryReaction,
      quickToolsInsight: parsedContent.quickToolsInsight,
      conclusion: parsedContent.conclusion,

      relatedSlugs: relatedSlugs,
      tags: tags,
      category: category,

      metaTitle: parsedContent.metaTitle || parsedContent.title,
      metaDescription: parsedContent.metaDescription || parsedContent.summary
    };

  } catch (error) {
    console.error("AI News Generation Error:", error);
    throw error;
  }
}
