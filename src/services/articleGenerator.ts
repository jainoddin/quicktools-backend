import { Article } from '../models/Article';
import { runWithFailover } from './geminiClient';
import { classifySearchIntent } from './contentQualityPipeline';

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

function extractFirstJsonObject(value: string): string {
  const start = value.indexOf('{');
  if (start < 0) throw new Error('No valid JSON found in Gemini response');
  let depth = 0, inString = false, escaped = false;
  for (let i = start; i < value.length; i++) {
    const char = value[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') depth++;
    else if (char === '}' && --depth === 0) return value.slice(start, i + 1);
  }
  throw new Error('Incomplete JSON object in Gemini response');
}

import fs from 'fs';
import path from 'path';
import { CronLock } from '../models/CronLock';

export async function generateArticle(): Promise<any> {
  try {
    await CronLock.create({ key: 'article_generator' });
  } catch (error) {
    console.log("⚠️ Article generation is already in progress. Skipping to prevent duplicates.");
    throw new Error('Generation already in progress (DB lock active)');
  }

  try {
    const currentYear = new Date().getFullYear();
    const existingArticles = await Article.find({}, 'title slug category').lean();
    const usedKeywords = existingArticles.map(a => a.title.toLowerCase());

    let availableKeywords = ARTICLE_KEYWORDS.filter(k => {
      const topicKeywords = k.keyword.toLowerCase().split(' ').filter(w => w.length > 3);
      return !usedKeywords.some(used =>
        topicKeywords.filter(kw => used.includes(kw)).length >= 2
      );
    });

    let randomTopic;
    if (availableKeywords.length === 0) {
      console.log("⚠️ All predefined Article keywords used. Suggesting a completely fresh topic.");
      randomTopic = {
        keyword: "Fresh AI Topic Not In The List",
        category: "AI & Tools"
      };
    } else {
      const dailySeed = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).replace(/-/g, ''));
      randomTopic = availableKeywords[dailySeed % availableKeywords.length];
    }
    const { keyword, category } = randomTopic;
    const searchIntent = await classifySearchIntent(keyword, 'article');

    let relatedArticles = existingArticles.filter(a => a.category === category);
    if (relatedArticles.length < 3) {
      relatedArticles = existingArticles; // fallback
    }
    const shuffledRelated = relatedArticles.sort(() => 0.5 - Math.random()).slice(0, 4);
    const relatedSlugs = shuffledRelated.map(a => a.slug);

    // Read real tools for internal links - send ALL tools so AI doesn't invent fake slugs
    let realToolsContext = "";
    let validToolSlugs = new Set<string>();
    try {
      const toolsData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tools_data.json'), 'utf-8'));
      // Build set of all valid slugs for post-processing validation
      toolsData.forEach((t: any) => validToolSlugs.add(t.slug));
      // Shuffle and pick 20 relevant samples for the prompt (more = better accuracy)
      const sampleTools = toolsData.sort(() => 0.5 - Math.random()).slice(0, 25);
      realToolsContext = sampleTools.map((t: any) => `- https://quicktool.space/tools/${t.slug} (Anchor: ${t.name})`).join('\n');
    } catch (e) {
      console.error("Could not load tools_data.json for internal links", e);
    }

    const prompt = `You are a Senior SEO Content Strategist, Expert Copywriter, and AI Analyst writing for quicktool.space — a premium platform for AI tools.
Write a concise, engaging, and high-quality ARTICLE around this keyword or generate a completely fresh topic if requested.
Use original opinions, mention limitations, compare tools, give recommendations. Don't sound like AI. Don't repeat sentence patterns.
Primary Keyword: ${keyword}
Search Intent: ${searchIntent}. Select a title pattern and content structure that directly matches this intent.
Previously Used Topics (DO NOT REPEAT THESE): ${usedKeywords.join(', ')}

This article MUST strictly follow ALL of these rules:

SEARCH INTENT & DEDUPLICATION (CRITICAL):
Before writing, classify the keyword by search intent against the Previously Used Topics.
If a previously used topic already covers the same search intent (e.g., "Best AI Writer" covers "Top AI Writer"), DO NOT generate an article with the same intent. 
Instead, instantly pivot and generate a different keyword with a completely different search intent (e.g., "AI Writers for Students", "AI Writers vs ChatGPT", or "How AI Writers Work").
Avoid synonyms like: Best, Top, Leading, Ultimate, Complete Guide, Review when they target the same query.

CONTENT & SEO REQUIREMENTS:
1. Strong SEO Title (50–60 characters) — keyword at the start. It MUST be 100% unique from the Previously Used Topics.
2. Meta Description (140–160 characters) — make it completely unique, compelling, and click-worthy. STRICTLY AVOID generic templates.
3. Length: 1150-1500 words (hard acceptable range 1000-1800). Count the markdown body words before returning JSON. Be comprehensive without filler.
4. One H1 only (your title). Do NOT repeat it in the content body.
5. Structure MUST BE RANDOMIZED. Do NOT use the exact same template for every article. Mix it up with a checklist, common mistakes, decision framework, or workflow. Never invent a case study.
6. Include one original insight and one practical example that differs from previous articles.
7. Clear editorial style. STRICTLY AVOID invented first-hand experience and phrases such as "In today's digital world", "As an AI language model", "In conclusion", or "It's worth noting".
8. Keyword density 1–2%. No stuffing.
9. Do not put editorial notes, AI disclosures, or review-process text inside the article body; the page UI displays the AI-assistance disclosure separately. Never claim manual review or personal testing unless supplied as source context. Include a References or Sources section for factual claims.
10. FACT SAFETY: No invented statistics, percentages, benchmarks, surveys, quotations, customer outcomes, named standards, or references. Without supplied sources, use qualitative explanations and clearly framed recommendations only.
   - Do not write any percentage, cost-saving figure, performance number, market size, adoption figure, or benchmark. Years and numbered workflow steps are the only allowed numeric claims.
   - Never describe future/current market conditions as established fact. Use timeless practical guidance.
   - A References/Sources section may list only the exact official URLs selected in externalLinks; never invent paper titles, report names, authors, or research findings.
11. Mention quicktool.space naturally at most once in prose. Include no more than 2 inline QuickTools links in the article body; keep other recommendations only in the separate internalLinks field.
12. CRUCIAL YEAR RULE: You MUST use the year "${currentYear}" anywhere a year is mentioned (especially in titles, descriptions, and content). STRICTLY avoid using 2024 or 2025.
13. Every article MUST have a completely different structure. Never repeat introductions. Never repeat heading order. Never repeat conclusion style. Avoid AI writing patterns.

INTERNAL LINKS (very important for SEO):
Suggest 5–8 internal link anchor texts + their quicktool.space paths. 
CRUCIAL: You MUST ONLY select links from the following list of REAL tools on our platform. Do NOT invent fake URLs:
${realToolsContext}
Include these as a separate JSON field called "internalLinks" where "path" is the tool URL.

EXTERNAL LINKS:
Suggest 3–8 authoritative external links. Use ONLY official sites like openai.com, anthropic.com, ai.google, microsoft.com, github.com, huggingface.co.
Include as a separate JSON field called "externalLinks".

STRICT EDITORIAL RULES:
- Do not invent hallucinated metrics (e.g., "600 queries/day").
- Do not use absolute marketing claims like "completely unbiased", "virtually eliminates hallucination", or "superior pick".
- Do not invent exact pricing unless explicitly verified. 

STRICT JSON RULES:
- Return ONLY a valid JSON object.
- CRUCIAL: You MUST escape all double quotes inside the string values properly (e.g. use \\" instead of raw double quotes).
- Do not include any comments or trailing commas.

Return STRICTLY a JSON object matching this EXACT structure (but vary the content of 'content' block significantly):
{
  "title": "SEO Title (50-60 chars, keyword first)",
  "metaTitle": "Same as title",
  "metaDescription": "Unique, non-templated, compelling 140-160 char meta description",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"],
  "readTime": "15 min read",
  "whatYoullLearn": [
    "Key takeaway 1",
    "Key takeaway 2",
    "Key takeaway 3"
  ],
  "content": "Full 1150-1500 word markdown article body. Start with a unique hook. Include H2 (##), H3 (###), **bold**, *italic*, bullet lists, blockquotes (> text). Match the structure to search intent, use at most 2 inline QuickTools links, and avoid promotional repetition.",
  "tableOfContents": [
    { "id": 1, "title": "First Unique Heading" },
    { "id": 2, "title": "Second Unique Heading" }
  ],
  "prosAndCons": {
    "pros": ["Pro 1", "Pro 2", "Pro 3"],
    "cons": ["Con 1", "Con 2", "Con 3"]
  },
  "comparisonTable": {
    "headers": ["Feature/Tool", "Detail 1", "Detail 2", "Detail 3"],
    "rows": [
      ["Item A", "Data 1", "Data 2", "Data 3"],
      ["Item B", "Data 1", "Data 2", "Data 3"]
    ]
  },
  "faq": [
    { "question": "Unique Question 1?", "answer": "Detailed answer 1." }
  ],
  "internalLinks": [
    { "anchor": "AI Image", "path": "/tools/ai-image-generator" }
  ],
  "externalLinks": [
    { "anchor": "OpenAI", "url": "https://openai.com" }
  ]
}`;

      let jsonString: string | undefined = undefined;
      try {
        let rawText = await runWithFailover(async (genAI: any, modelName: string) => {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8192,
              responseMimeType: 'application/json'
            }
          });
          const result = await model.generateContent(prompt);
          return result.response.text();
        });

        jsonString = extractFirstJsonObject(rawText);

        jsonString = (jsonString as string).replace(/"([^"\\]|\\.)*"/g, (match) => {
          return match
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
        });

        const parsedContent = JSON.parse(jsonString);

        const toc = parsedContent.tableOfContents.map((item: any, index: number) => ({
          id: index + 1,
          title: item.title,
          isActive: index === 0
        }));

        // ── Post-Processing: Strip any invalid tool links AI may have invented ──
        let cleanContent = parsedContent.content;
        if (validToolSlugs.size > 0) {
          // Remove markdown links to non-existent tool pages: [anchor](https://quicktool.space/tools/bad-slug)
          cleanContent = cleanContent.replace(
            /\[([^\]]+)\]\(https?:\/\/quicktool\.space\/tools\/([a-zA-Z0-9-]+)\)/g,
            (match: string, anchor: string, slug: string) => validToolSlugs.has(slug) ? match : anchor
          );
          // Also strip relative /tools/ links
          cleanContent = cleanContent.replace(
            /\[([^\]]+)\]\(\/tools\/([a-zA-Z0-9-]+)\)/g,
            (match: string, anchor: string, slug: string) => validToolSlugs.has(slug) ? match : anchor
          );
        }

        // Filter internalLinks to only valid slugs
        const validInternalLinks = (parsedContent.internalLinks || []).filter((link: any) => {
          const slug = link.path?.split('/').pop();
          return slug && (validToolSlugs.size === 0 || validToolSlugs.has(slug));
        });

        return {
          topic: keyword,
          searchIntent,
          slug: generateSlug(parsedContent.title),
          title: parsedContent.title,
          description: parsedContent.metaDescription,
          category: category,
          tags: parsedContent.tags,
          coverImage: '',
          author: {
            name: 'QuickTools AI Team',
            avatar: 'https://pub-0a928134dcdc420da2af02e6238ef06b.r2.dev/brand/7d404a746424124dc6b13ea6908c7adc.webp',
            isVerified: true,
            bio: 'AI enthusiasts and researchers passionate about the future of artificial intelligence and productivity.'
          },
          readTime: parsedContent.readTime || '10 min read',
          publishedAt: new Date(),
          views: `0 views`,

          content: cleanContent,
          tableOfContents: toc,
          whatYoullLearn: parsedContent.whatYoullLearn || [],

          prosAndCons: parsedContent.prosAndCons || { pros: [], cons: [] },
          comparisonTable: parsedContent.comparisonTable || { headers: [], rows: [] },
          faq: parsedContent.faq || [],

          relatedSlugs: relatedSlugs,
          internalLinks: validInternalLinks,
          externalLinks: parsedContent.externalLinks || [],

          metaTitle: parsedContent.metaTitle,
          metaDescription: parsedContent.metaDescription
        };

      } catch (error) {
        console.error("AI Article Generation Error:", error);
        try {
          if (typeof jsonString !== 'undefined') {
          }
        } catch (e) {
          console.error('Failed to save debug JSON:', e);
        }
        throw error;
      }
    } finally {
      await CronLock.deleteOne({ key: 'article_generator' });
  }
}
