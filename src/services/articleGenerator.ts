import { Article } from '../models/Article';
import { runWithFailover } from './geminiClient';

const ARTICLE_KEYWORDS = [
  { keyword: "Best AI Resume Builders", category: "AI & Tools" },
  { keyword: "Top AI Video Generators", category: "Marketing" },
  { keyword: "AI SEO Tools to Rank Higher", category: "Marketing" },
  { keyword: "Best AI Image Generators", category: "Design" },
  { keyword: "Essential AI Tools for Small Businesses", category: "Business" },
  { keyword: "Best AI Code Assistants for Developers", category: "Development" },
  { keyword: "Top AI Voice Generators", category: "Marketing" },
  { keyword: "AI Website Builders Evaluated", category: "Development" },
  { keyword: "AI Presentation Makers Reviewed", category: "Business" },
  { keyword: "AI Writing Assistants Comparison", category: "Productivity" }
];

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, 'and')          // & → and
    .replace(/[^a-z0-9\s-]/g, '') // remove special chars
    .replace(/\s+/g, '-')         // spaces → hyphens
    .replace(/-+/g, '-')          // collapse double hyphens
    .trim();
}

export async function generateArticle(): Promise<any> {
  const currentYear = new Date().getFullYear();
  const existingArticles = await Article.find({}, 'title slug category').lean();
  const usedKeywords = existingArticles.map(a => a.title.toLowerCase());
  
  let availableKeywords = ARTICLE_KEYWORDS.filter(k => 
    !usedKeywords.some(used => used.includes(k.keyword.toLowerCase()))
  );

  if (availableKeywords.length === 0) {
    console.log("⚠️ All Article keywords used. Reusing existing keywords pool.");
    availableKeywords = ARTICLE_KEYWORDS;
  }

  const randomTopic = availableKeywords[Math.floor(Math.random() * availableKeywords.length)];
  const { keyword, category } = randomTopic;

  let relatedArticles = existingArticles.filter(a => a.category === category);
  if (relatedArticles.length < 3) {
    relatedArticles = existingArticles; // fallback
  }
  const shuffledRelated = relatedArticles.sort(() => 0.5 - Math.random()).slice(0, 4);
  const relatedSlugs = shuffledRelated.map(a => a.slug);



  const prompt = `You are a Senior SEO Content Strategist, Expert Copywriter, and AI Analyst writing for QuickTools.ai — a premium platform for AI tools.

Write a concise, engaging, and high-quality ARTICLE around this keyword:
Primary Keyword: ${keyword}

This article MUST strictly follow ALL of these rules:

CONTENT REQUIREMENTS:
1. Strong SEO Title (50–60 characters) — keyword at the start.
2. Meta Description (140–160 characters) — make it compelling and click-worthy.
3. Length: 800–1200 words maximum. Be concise, punchy, and avoid unnecessary filler.
4. One H1 only (your title). Do NOT repeat it in the content body.
5. Strong Introduction (H2): State the problem, the solution, and what readers will learn. 100–150 words maximum.
6. "What You'll Learn" — a bullet list of 3–4 key takeaways immediately after the intro.
7. 3–4 H2 sections maximum, keeping paragraphs short (2-3 sentences each).
8. Include practical examples, real use cases, and actionable tips throughout.
9. Include a dedicated "Top Tips" section with 3 short numbered tips.
10. Comparison Table (Tool, Pricing, Best For, Rating out of 5).
11. Pros & Cons for the main tools/approaches discussed.
12. 3 FAQs maximum at the end (before Conclusion).
13. Strong Conclusion: Summary + final recommendation + call to action.
14. Human writing style ONLY. STRICTLY AVOID: "In today's digital world", "As an AI language model", "In conclusion", "It's worth noting". Use conversational, expert tone.
15. Keyword density 1–2%. No stuffing.
16. E-E-A-T signals: Mention why QuickTools.ai recommends these tools, real limitations, and who this is best for.
17. Naturally mention QuickTools.ai 2–3 times as the go-to AI tools platform.
18. CRUCIAL YEAR RULE: You MUST use the year "${currentYear}" anywhere a year is mentioned (especially in titles, descriptions, and content). STRICTLY avoid using 2024 or 2025.


INTERNAL LINKS (very important for SEO):
Suggest 5–8 internal link anchor texts + their QuickTools.ai paths. Use realistic paths like:
- /tools/ai-image-generator
- /tools/ai-writer  
- /tools/ai-chat-assistant
- /articles/best-ai-seo-tools
- /blog/chatgpt-guide
Include these as a separate JSON field called "internalLinks".

EXTERNAL LINKS:
Suggest 3–5 authoritative external links. Use ONLY official sites like openai.com, anthropic.com, ai.google, github.com/features/copilot.
Include as a separate JSON field called "externalLinks".

STRICT JSON RULES:
- Return ONLY a valid JSON object.
- CRUCIAL: You MUST escape all double quotes inside the string values properly (e.g. use \\\" instead of raw double quotes).
- Do not include any comments or trailing commas.

Return STRICTLY a JSON object matching this EXACT structure:
{
  "title": "SEO Title (50-60 chars, keyword first)",
  "metaTitle": "Same as title",
  "metaDescription": "Compelling 140-160 char meta description",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"],
  "readTime": "10 min read",
  "whatYoullLearn": [
    "Key takeaway 1",
    "Key takeaway 2",
    "Key takeaway 3",
    "Key takeaway 4",
    "Key takeaway 5"
  ],
  "content": "Full markdown article body. Start with ## Introduction. Include H2 (##), H3 (###), **bold**, *italic*, bullet lists, numbered lists, blockquotes (> text). \nCRUCIAL: You MUST include 4 to 5 inline images throughout the content using this exact markdown format: ![Descriptive Alt Text](https://image.pollinations.ai/prompt/Highly%20detailed%20description%20of%20the%20image%20related%20to%20the%20section%20clean%20modern%20tech%20editorial%20photography?width=800&height=400&nologo=true). Space these images out evenly between major H2 sections. Do NOT include the H1 title here. Do NOT include the FAQ, Pros/Cons or Comparison table — those are separate fields.",
  "tableOfContents": [
    { "id": 1, "title": "Introduction" },
    { "id": 2, "title": "Section Heading" }
  ],
  "prosAndCons": {
    "pros": ["Pro 1", "Pro 2", "Pro 3", "Pro 4", "Pro 5"],
    "cons": ["Con 1", "Con 2", "Con 3"]
  },
  "comparisonTable": {
    "headers": ["Tool", "Pricing", "Best For", "Rating"],
    "rows": [
      ["Tool A", "Free / $10/mo", "Beginners", "4.8/5"],
      ["Tool B", "$20/mo", "Professionals", "4.9/5"]
    ]
  },
  "faq": [
    { "question": "Question 1?", "answer": "Detailed answer 1." },
    { "question": "Question 2?", "answer": "Detailed answer 2." }
  ],
  "internalLinks": [
    { "anchor": "AI Image Generator", "path": "/tools/ai-image-generator" },
    { "anchor": "AI Writer", "path": "/tools/ai-writer" }
  ],
  "externalLinks": [
    { "anchor": "OpenAI Official Site", "url": "https://openai.com" },
    { "anchor": "Google AI", "url": "https://ai.google" }
  ]
}`;


  let jsonString: string | undefined = undefined;
  try {
    let rawText = await runWithFailover(async (genAI: any) => {
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-3-flash-preview',
        generationConfig: {
          temperature: 0.3, 
          maxOutputTokens: 8192,
          responseMimeType: 'application/json'
        }
      });
      const result = await model.generateContent(prompt);
      return result.response.text();
    });
    
    // Extract JSON block using regex to bypass backticks or external conversational wrappers
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('--- GEMINI RAW RESPONSE FAILED TO MATCH JSON ---');
      console.error(rawText);
      throw new Error('No valid JSON found in Gemini response');
    }

    jsonString = jsonMatch[0];

    // Escape literal control characters inside JSON string values to prevent JSON parse errors
    jsonString = (jsonString as string).replace(/"([^"\\]|\\.)*"/g, (match) => {
      return match
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
    });

    const parsedContent = JSON.parse(jsonString);

    // Ensure the table of contents has active states
    const toc = parsedContent.tableOfContents.map((item: any, index: number) => ({
      id: index + 1,
      title: item.title,
      isActive: index === 0
    }));

    return {
      slug: generateSlug(parsedContent.title),
      title: parsedContent.title,
      description: parsedContent.metaDescription, // Use metaDescription as the card description
      category: category,
      tags: parsedContent.tags,
      coverImage: `https://image.pollinations.ai/prompt/${encodeURIComponent(parsedContent.title + ' clean modern tech editorial photography 8k resolution highly detailed')}?width=1200&height=800&nologo=true&seed=${Math.floor(Math.random() * 100000)}`,
      author: {
        name: 'QuickTools AI Team',
        avatar: 'https://ui-avatars.com/api/?name=QuickTools+AI&background=6D5EF8&color=fff',
        isVerified: true,
        bio: 'AI enthusiasts and researchers passionate about the future of artificial intelligence and productivity.'
      },
      readTime: parsedContent.readTime || '10 min read',
      publishedAt: new Date(),
      views: '1.2K views', // Mock initial views
      
      content: parsedContent.content,
      tableOfContents: toc,
      whatYoullLearn: parsedContent.whatYoullLearn || [],
      
      prosAndCons: parsedContent.prosAndCons || { pros: [], cons: [] },
      comparisonTable: parsedContent.comparisonTable || { headers: [], rows: [] },
      faq: parsedContent.faq || [],
      
      relatedSlugs: relatedSlugs,
      internalLinks: parsedContent.internalLinks || [],
      externalLinks: parsedContent.externalLinks || [],
      
      metaTitle: parsedContent.metaTitle,
      metaDescription: parsedContent.metaDescription
    };

  } catch (error) {
    console.error("AI Article Generation Error:", error);
    try {
      if (typeof jsonString !== 'undefined') {
        require('fs').writeFileSync('debug_json.json', jsonString);
        console.log('Saved debug_json.json for troubleshooting.');
      }
    } catch (e) {
      console.error('Failed to save debug JSON:', e);
    }
    throw error;
  }
}
