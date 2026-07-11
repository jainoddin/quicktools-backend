import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Cover image map per category (Unsplash curated)
const COVER_IMAGES: Record<string, string[]> = {
  'AI & Tools': [
    'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=80',
    'https://images.unsplash.com/photo-1686191128892-3b37add4c844?w=800&q=80',
    'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80',
  ],
  'Productivity': [
    'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=80',
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80',
  ],
  'Development': [
    'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&q=80',
    'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800&q=80',
  ],
  'Design': [
    'https://images.unsplash.com/photo-1558655146-d09347e92766?w=800&q=80',
    'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=800&q=80',
  ],
  'Marketing': [
    'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=800&q=80',
  ],
  'Business': [
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80',
  ],
  'Tutorials': [
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80',
  ],
  'News & Updates': [
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80',
  ],
};

// 30 daily topics — rotate by day of year
const DAILY_TOPICS = [
  { topic: 'Top 10 AI tools for content creators in 2024', category: 'AI & Tools' },
  { topic: 'How to use ChatGPT to 10x your productivity', category: 'Productivity' },
  { topic: 'Best free AI image generators compared', category: 'AI & Tools' },
  { topic: 'AI tools for small businesses', category: 'Business' },
  { topic: 'How to remove image backgrounds with AI', category: 'AI & Tools' },
  { topic: 'Best AI writing assistants for bloggers', category: 'AI & Tools' },
  { topic: 'AI video generation — complete beginner guide', category: 'AI & Tools' },
  { topic: 'Top 5 AI coding assistants for developers', category: 'Development' },
  { topic: 'How to build a marketing strategy with AI', category: 'Marketing' },
  { topic: 'Prompt engineering tips for better AI results', category: 'Tutorials' },
  { topic: 'AI design tools that replace expensive software', category: 'Design' },
  { topic: 'How to automate repetitive tasks with AI', category: 'Productivity' },
  { topic: 'Best AI SEO tools to rank higher on Google', category: 'Marketing' },
  { topic: 'AI for ecommerce — boost sales with AI tools', category: 'Business' },
  { topic: 'How to use Gemini API in your web project', category: 'Development' },
  { topic: 'AI tools for social media content creation', category: 'Marketing' },
  { topic: 'Midjourney vs DALL-E 3 vs Stable Diffusion', category: 'AI & Tools' },
  { topic: 'How to start freelancing with AI tools', category: 'Business' },
  { topic: 'Best AI tools for students and researchers', category: 'Productivity' },
  { topic: 'AI news — biggest updates this week', category: 'News & Updates' },
  { topic: 'How to build a Next.js app with AI features', category: 'Development' },
  { topic: 'AI voice generators — top 5 compared', category: 'AI & Tools' },
  { topic: 'Building a personal brand using AI', category: 'Marketing' },
  { topic: 'Best no-code AI tools for non-developers', category: 'Tutorials' },
  { topic: 'How to write better with AI — 10 proven tips', category: 'Productivity' },
  { topic: 'AI logo makers — build your brand for free', category: 'Design' },
  { topic: 'How to use AI for customer support automation', category: 'Business' },
  { topic: 'Top Chrome extensions powered by AI', category: 'AI & Tools' },
  { topic: 'AI vs human — where AI beats humans in 2024', category: 'News & Updates' },
  { topic: 'How to monetize AI skills in 2024', category: 'Business' },
];

function getTodaysTopic() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return DAILY_TOPICS[dayOfYear % DAILY_TOPICS.length];
}

function getCoverImage(category: string): string {
  const images = COVER_IMAGES[category] || COVER_IMAGES['AI & Tools'];
  return images[Math.floor(Math.random() * images.length)];
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export async function generateBlog(): Promise<{
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  coverImage: string;
  author: { name: string; avatar: string };
  readTime: string;
  publishedAt: Date;
  featured: boolean;
  tableOfContents: string[];
  whatYoullLearn: string[];
  content: string;
  relatedSlugs: string[];
  metaTitle: string;
  metaDescription: string;
}> {
  const { topic, category } = getTodaysTopic();

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are a professional tech blogger for QuickTools.ai — a platform with 100+ AI tools.

Write a detailed, SEO-optimized blog post about: "${topic}"

Return ONLY valid JSON (no markdown, no code blocks) with this EXACT structure:
{
  "title": "Engaging blog title with keywords",
  "description": "1-2 sentence compelling summary under 160 characters",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "tableOfContents": ["Introduction", "section heading 1", "section heading 2", "section heading 3", "Conclusion"],
  "whatYoullLearn": [
    "Specific actionable takeaway 1",
    "Specific actionable takeaway 2", 
    "Specific actionable takeaway 3",
    "Specific actionable takeaway 4"
  ],
  "content": "Full blog post in markdown format. Include headings (##), bullet points, bold text, code blocks if relevant. Minimum 800 words.",
  "metaTitle": "SEO title under 60 characters",
  "metaDescription": "SEO description under 160 characters",
  "readTime": "X min read"
}

Rules:
- Content must be informative, practical, and relevant to QuickTools.ai users
- Include at least 5-7 sections with ## headings
- Use bullet points and numbered lists
- Add relevant examples
- Mention QuickTools.ai naturally 1-2 times
- JSON must be valid — escape all quotes properly`;

  console.log(`🤖 Generating blog for topic: "${topic}"`);

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No valid JSON found in Gemini response');

  const generated = JSON.parse(jsonMatch[0]);

  const slug = generateSlug(generated.title);
  const coverImage = getCoverImage(category);

  // Calculate read time from content (avg 200 words/min)
  const wordCount = generated.content.split(/\s+/).length;
  const readTime = generated.readTime || `${Math.ceil(wordCount / 200)} min read`;

  return {
    slug,
    title: generated.title,
    description: generated.description,
    category,
    tags: generated.tags || [],
    coverImage,
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
    relatedSlugs: [],
    metaTitle: generated.metaTitle || generated.title,
    metaDescription: generated.metaDescription || generated.description,
  };
}

export async function generateToolText(params: {
  prompt: string;
  contentType: string;
  tone: string;
  language: string;
  creativity: number;
}): Promise<string> {
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: params.creativity / 10, // Maps 1-10 to 0.1-1.0
    }
  });

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

  const result = await model.generateContent(finalPrompt);
  return result.response.text();
}
