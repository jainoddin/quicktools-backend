import { runWithFailover } from './geminiClient';
import { Blog } from '../models/Blog';
import { Subscriber } from '../models/Subscriber';
import { generateAndUploadImage } from './r2.service';

const SEO_KEYWORDS = [
  { keyword: "Best AI Tools", category: "AI & Tools" },
  { keyword: "AI Resume Builder", category: "AI & Tools" },
  { keyword: "AI Image Generator", category: "Design" },
  { keyword: "AI Logo Generator", category: "Design" },
  { keyword: "ChatGPT Prompts", category: "Productivity" },
  { keyword: "Claude AI", category: "AI & Tools" },
  { keyword: "Gemini AI", category: "AI & Tools" },
  { keyword: "Perplexity AI", category: "Productivity" },
  { keyword: "AI Coding Tools", category: "Development" },
  { keyword: "Best Free AI Tools", category: "AI & Tools" },
  { keyword: "AI Productivity Tools", category: "Productivity" },
  { keyword: "AI Writing Assistant", category: "Productivity" },
  { keyword: "AI Video Generator", category: "Marketing" },
  { keyword: "AI Voice Generator", category: "Marketing" },
  { keyword: "AI Presentation Maker", category: "Business" },
  { keyword: "AI SEO Tools", category: "Marketing" },
  { keyword: "AI Marketing Tools", category: "Marketing" },
  { keyword: "AI Email Generator", category: "Business" },
  { keyword: "AI Website Builder", category: "Development" },
  { keyword: "AI Business Ideas", category: "Business" }
];

import { CronLock } from '../models/CronLock';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export async function generateBlog(): Promise<any> {
  try {
    await CronLock.create({ key: 'blog_generator' });
  } catch (error) {
    console.log("⚠️ Blog generation is already in progress. Skipping to prevent duplicates.");
    throw new Error('Generation already in progress (DB lock active)');
  }

  try {
    const currentYear = new Date().getFullYear();
    // 1. Fetch all existing blogs to avoid duplicate keywords and slugs
    const existingBlogs = await Blog.find({}, 'title slug category').lean();
    
    // 2. Filter out keywords that we have already written about (Duplicate Topic Prevention)
    const usedKeywords = existingBlogs.map(b => b.title.toLowerCase());
    
    let availableKeywords = SEO_KEYWORDS.filter(k => {
      const topicKeywords = k.keyword.toLowerCase().split(' ').filter(w => w.length > 3);
      return !usedKeywords.some(used => 
        topicKeywords.filter(kw => used.includes(kw)).length >= 2
      );
    });

  let randomTopic;
  if (availableKeywords.length === 0) {
    console.log("⚠️ All keywords used. Requesting a completely fresh, unused AI topic.");
    randomTopic = {
      keyword: "Fresh AI Topic Not In The List (invent something new and relevant)",
      category: "AI & Tools"
    };
  } else {
    randomTopic = availableKeywords[Math.floor(Math.random() * availableKeywords.length)];
  }
  const { keyword, category } = randomTopic;

  // 4. Get Related Posts (Auto Related Posts)
  // Get 3 random blogs from the same category, or just any category if not enough
  let relatedBlogs = existingBlogs.filter(b => b.category === category);
  if (relatedBlogs.length < 3) {
    relatedBlogs = existingBlogs; // fallback
  }
  const shuffledRelated = relatedBlogs.sort(() => 0.5 - Math.random()).slice(0, 3);
  const relatedSlugs = shuffledRelated.map(b => b.slug);

  // 5. Read real tools for internal links
  let realToolsContext = "";
  try {
    const fs = require('fs');
    const path = require('path');
    const toolsData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tools_data.json'), 'utf-8'));
    const sampleTools = toolsData.sort(() => 0.5 - Math.random()).slice(0, 15);
    realToolsContext = sampleTools.map((t: any) => `- ${t.url} (Anchor: ${t.name})`).join('\n');
  } catch (e) {
    console.error("Could not load tools_data.json for internal links", e);
  }

  const prompt = `You are a Senior SEO Content Strategist and AI Journalist writing for QuickTools.ai — a premium platform for AI tools.

Write a comprehensive, engaging, and high-quality blog around this keyword:

Primary Keyword: ${keyword}

Requirements:
- 1800-2500 words minimum.
- Human writing style (avoid AI sounding phrases like "in conclusion", "it's important to note").
- Original and captivating introduction.
- Clear H2 and H3 headings.
- Include a comparison table or pros and cons section.
- Provide real-world examples and use cases.
- Include the latest industry information.
- A dedicated FAQ section with 5-8 common questions.
- A strong conclusion.
- Mention QuickTools.ai naturally 2-3 times as the go-to place for discovering AI tools.
- IMPORTANT: Use these REAL tools for any internal links you want to include:
${realToolsContext}
- Highly SEO optimized, beginner-friendly, but with expert-level insights.
- CRUCIAL YEAR RULE: You MUST use the year "${currentYear}" anywhere a year is mentioned (especially in titles, descriptions, and content). STRICTLY avoid using past years like 2024 or 2025.

Return ONLY valid JSON (no markdown wrapping, no backticks, no comments). Escape all strings properly. Use this EXACT structure:
{
  "title": "Catchy SEO optimized title including the keyword",
  "description": "Compelling meta description under 160 characters",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "tableOfContents": ["Introduction", "Heading 1", "Heading 2", "FAQ", "Conclusion"],
  "whatYoullLearn": [
    "Specific actionable takeaway 1",
    "Specific actionable takeaway 2",
    "Specific actionable takeaway 3",
    "Specific actionable takeaway 4"
  ],
  "content": "Full blog post in markdown format. Start with ## Introduction. Include H2 (##), H3 (###), **bold**, lists, and tables. \nCRUCIAL: You MUST include 4 to 5 inline images throughout the content using this exact markdown format: ![Descriptive Alt Text](https://image.pollinations.ai/prompt/Highly%20detailed%20description%20of%20the%20image%20related%20to%20the%20section%20futuristic%20clean%20high%20quality?width=800&height=400&nologo=true). Space these images out evenly between major H2 sections.",
  "faq": [
    {"question": "Question 1", "answer": "Answer 1"},
    {"question": "Question 2", "answer": "Answer 2"}
  ],
  "metaTitle": "SEO optimized meta title under 60 characters",
  "metaDescription": "SEO optimized meta description under 160 characters",
  "readTime": "X min read"
}
`;

  console.log(`🤖 Generating enterprise SEO blog for keyword: "${keyword}" in category: "${category}"`);

  let text = "";
  try {
    text = await runWithFailover(async (genAI) => {
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash-latest',
        generationConfig: {
          temperature: 0.7, 
          maxOutputTokens: 8192,
          responseMimeType: 'application/json'
        }
      });
      const result = await model.generateContent(prompt);
      return result.response.text();
    });
  } catch (error) {
    console.error("❌ Failed to generate content from Gemini:", error);
    throw error;
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("Failed to parse JSON. Raw response:", text);
    throw new Error('No valid JSON found in Gemini response');
  }

  let generated;
  try {
    generated = JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("JSON Parsing Error:", error);
    throw new Error("Invalid JSON generated by AI.");
  }

  const slug = generateSlug(generated.title);

  const wordCount = generated.content.split(/\s+/).length;
  const readTime = generated.readTime || `${Math.ceil(wordCount / 200)} min read`;

  return {
    slug,
    title: generated.title,
    description: generated.description,
    category,
    tags: generated.tags || [],
    coverImage: await generateAndUploadImage(generated.title, 'blog_covers'),
    author: {
      name: 'QuickTools AI',
      avatar: 'https://pub-68a98c57e70a4a1fa317739dd20098b9.r2.dev/1b9be0e4-c385-49a5-b0b5-ef158e8ef402.png',
    },
    readTime,
    publishedAt: new Date(),
    featured: false,
    tableOfContents: generated.tableOfContents || [],
    whatYoullLearn: generated.whatYoullLearn || [],
    content: generated.content,
    faq: generated.faq || [],
    relatedSlugs,
    metaTitle: generated.metaTitle || generated.title,
    metaDescription: generated.metaDescription || generated.description,
  };
  } catch (error) {
    console.error("AI Blog Generation Error:", error);
    throw error;
  } finally {
    await CronLock.deleteOne({ key: 'blog_generator' });
  }
}

export async function generateToolText(params: {
  prompt: string;
  contentType: string;
  tone: string;
  language: string;
  creativity: number;
}): Promise<string> {

  const systemPrompt = `You are an expert AI Writer and Content Creator.
Your task is to write high-quality, engaging content based on the user's requirements.

Format Requirements:
- Content Type: ${params.contentType}
- Tone of Voice: ${params.tone}
- Language: ${params.language}
- Output format: Clean Markdown (use headings, bullet points, etc. where appropriate).

Do NOT include any extra conversational text (e.g., "Here is your blog post:"). Output ONLY the requested content.`;

  const finalPrompt = `${systemPrompt}\n\nUser Request/Topic:\n${params.prompt}`;

  console.log(`🤖 Generating ${params.contentType} for prompt: "${params.prompt.substring(0, 50)}..."`);

  return await runWithFailover(async (genAI) => {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash-latest',
      generationConfig: {
        temperature: params.creativity / 10,
      }
    });
    const result = await model.generateContent(finalPrompt);
    return result.response.text();
  });
}

export async function generateToolCode(params: {
  prompt: string;
  language: string;
  framework: string;
  codeType: string;
}): Promise<{ html: string; css: string; js: string; explanation: string[] }> {

  const systemPrompt = `You are a Senior Full-Stack Developer and Expert AI Code Generator.
Generate a complete, high-quality, and working code implementation based on the user request.

Required specifications:
- Programming Language: ${params.language}
- Framework/Library: ${params.framework}
- Application Type: ${params.codeType}

Output Format:
You MUST return a JSON object with this EXACT structure (escape double quotes correctly, do not wrap in markdown):
{
  "html": "The HTML code, or the primary codebase/script if this is a non-web language (like Python, SQL, C++)",
  "css": "The CSS code or stylesheet configurations (if applicable, otherwise empty string)",
  "js": "The JavaScript code or client logic code (if applicable, otherwise empty string)",
  "explanation": [
    "A list of 3-5 concise bullet points explaining what the code accomplishes and how to run it."
  ]
}

If the user requests a web project (like React, Tailwind, HTML/CSS/JS):
- Place the HTML/TSX component template in 'html'.
- Place styling or CSS directives in 'css'.
- Place application logic or scripting in 'js'.

If the user requests a backend or script-based language (like Python, SQL, C++, Java):
- Place the entire script/database schema code in the 'html' field.
- Set 'css' and 'js' fields to empty strings.`;

  const finalPrompt = `${systemPrompt}\n\nUser Request:\n${params.prompt}`;
  console.log(`🤖 Generating code using Gemini for: "${params.prompt.substring(0, 50)}..."`);

  const text = await runWithFailover(async (genAI) => {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash-latest',
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json"
      }
    });
    const result = await model.generateContent(finalPrompt);
    return result.response.text();
  });
  
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON structure generated by AI');
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("JSON Parsing Error in generateToolCode:", error);
    throw new Error("Invalid JSON generated by AI code generator.");
  }
}
