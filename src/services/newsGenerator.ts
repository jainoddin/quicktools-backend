import { News } from '../models/News';
import { runWithFailover } from './geminiClient';
import { generateAndUploadImage } from './r2.service';

const NEWS_TOPICS = [
  { topic: "OpenAI Launches GPT-6 with Native Video Reasoning", category: "Product Launches", tags: ["OpenAI", "GPT-6", "AI Models", "Product Launch"] },
  { topic: "Google Gemini 3.0 Achieves AGI Benchmarks", category: "Product Launches", tags: ["Google", "Gemini 3", "AI Models", "AGI"] },
  { topic: "Anthropic Claude 4 Introduces Real-time Action Agents", category: "Product Launches", tags: ["Anthropic", "Claude 4", "Agents"] },
  { topic: "Microsoft Unveils Windows 13 with Deep AI OS Integration", category: "Partnerships", tags: ["Microsoft", "Windows", "Integration", "OS"] },
  { topic: "Meta Unveils Llama 4: Open Source Meets Trillion Parameters", category: "Research", tags: ["Meta", "Llama 4", "Open Source", "Research"] },
  { topic: "NVIDIA Announces Blackwell 2.0 Chips with Quantum Enhancements", category: "Industry", tags: ["NVIDIA", "Hardware", "Chips", "Quantum"] },
  { topic: "Global AI Treaty Signed for Autonomous Systems Regulation", category: "Regulation", tags: ["Global", "Regulation", "AI Ethics", "Treaty"] },
  { topic: "Apple Intelligence 2.0 Debuts in iOS 20 with Holographic UI", category: "Product Launches", tags: ["Apple", "Apple Intelligence 2.0", "iOS", "Mobile AI"] },
  { topic: "Tesla Optimus Gen 3 Enters Mass Production", category: "Robotics", tags: ["Tesla", "Robotics", "Hardware"] },
  { topic: "Midjourney v8 Generates Interactive 3D Worlds", category: "Product Launches", tags: ["Midjourney", "AI Art", "3D Generation"] }
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

import { CronLock } from '../models/CronLock';

export async function generateNews(topicOverride?: string): Promise<any> {
  try {
    await CronLock.create({ key: 'news_generator' });
  } catch (error) {
    console.log("⚠️ News generation is already in progress. Skipping to prevent duplicates.");
    throw new Error('Generation already in progress (DB lock active)');
  }

  try {
    const currentYear = new Date().getFullYear();
    const existingNews = await News.find({}, 'title slug category').lean();
  const usedTitles = existingNews.map(n => n.title.toLowerCase());

  let availableTopics = NEWS_TOPICS.filter(t => {
    const topicKeywords = t.topic.toLowerCase().split(' ').filter(w => w.length > 3);
    return !usedTitles.some(used => 
      topicKeywords.filter(kw => used.includes(kw)).length >= 2 // if 2+ significant words match, consider it a duplicate
    );
  });

  let randomTopic;
  if (availableTopics.length === 0) {
    console.log("⚠️ All predefined News topics used. Requesting completely fresh 2026 news topic.");
    randomTopic = {
      topic: "Fresh AI Industry Breaking News (Invent a realistic 2026 event)",
      category: "Industry",
      tags: ["AI", "2026", "Update"]
    };
  } else {
    randomTopic = availableTopics[Math.floor(Math.random() * availableTopics.length)];
  }

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

  const prompt = `You are a Professional Tech Journalist reporting for QuickTools.ai News in the year ${currentYear}.

Write a factual, engaging, and professional News Article around this topic/event or generate a completely fresh news topic if requested:
Topic: ${topicToGenerate}
Previously Used Titles (DO NOT REPEAT THESE TOPICS/THEMES): ${usedTitles.join(', ')}

This news page MUST strictly follow ALL of these rules:

CONTENT REQUIREMENTS:
1. Strong News Title (50–60 characters). It MUST perfectly match the content body and be 100% unique from Previously Used Titles.
2. Short Summary ("In Short"): 2-3 lines explaining the complete news concisely.
3. Length: 700–1200 words. Neutral, journalistic tone. No fluff.
4. "What Happened?": Detailed explanation of the news event. The event details MUST exactly match the headline!
5. "Key Highlights": Array of 3-5 short, impactful bullet points.
6. "Why It Matters": Explain the impact on users, businesses, or the industry.
7. "Industry Reaction": Mention official announcements, quotes, or public reactions.
8. "QuickTools Insight": 2-3 lines of insight. Example: "If you're comparing AI models, our AI Tools directory can help you explore available options."
9. "Conclusion": Short summary of what's next.

STRICT RULES:
- Neutral reporting.
- CRUCIAL FUTURE CONTEXT: You are reporting in the year ${currentYear}. DO NOT write about old 2024 events (like GPT-4o mini, Llama 3.1, or the original 2024 EU AI Act) and pretend they are breaking news today. Instead, invent plausible, highly realistic new product launches (e.g. GPT-6, Claude 4, new regulations) that fit the year ${currentYear}.
- FACTUAL consistency. The headline and the body MUST be about the exact same event. Do NOT put "GPT-6" in the title and talk about "GPT-4o mini" in the body.
- Never use "In today's digital world", "As an AI".
- Valid JSON ONLY.
- CRUCIAL YEAR RULE: You MUST use the year "${currentYear}" anywhere a year is mentioned. STRICTLY avoid using 2024 or 2025.

Return STRICTLY a raw JSON object matching this exact schema:
{
  "title": "News Title",
  "metaTitle": "News Title - QuickTools AI",
  "metaDescription": "140-160 char meta description",
  "isBreaking": false, // Set to true ONLY if this is genuinely major, urgent industry news (e.g. massive product launch, regulation). Most articles should be false.
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

  const parsedContent = await runWithFailover(async (genAIInstance) => {
      const model = genAIInstance.getGenerativeModel({
        model: 'gemini-flash-latest',
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

      // Use generateAndUploadImage to upload to R2
      heroImage: await generateAndUploadImage(parsedContent.title, 'news_covers'),
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
  } finally {
    await CronLock.deleteOne({ key: 'news_generator' });
  }
}
