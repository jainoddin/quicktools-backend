import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// A large, curated pool of high-quality premium tech/business images from Unsplash.
// By using a global pool, we guarantee visual variety regardless of category.
const DYNAMIC_COVER_IMAGES: string[] = [
  'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=80',
  'https://images.unsplash.com/photo-1686191128892-3b37add4c844?w=800&q=80',
  'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80',
  'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=80',
  'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80',
  'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&q=80',
  'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800&q=80',
  'https://images.unsplash.com/photo-1558655146-d09347e92766?w=800&q=80',
  'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=800&q=80',
  'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=800&q=80',
  'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80',
  'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80', // Network
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80', // Circuit
  'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&q=80', // Finance/Money
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80', // Dashboard
  'https://images.unsplash.com/photo-1488229297570-58520851e868?w=800&q=80', // Code
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80', // Teamwork
];

const CATEGORIES = [
  'AI & Tools', 'Productivity', 'Development', 
  'Design', 'Marketing', 'Business', 'News & Updates'
];

function getRandomCategory() {
  return CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
}

function getCoverImage(): string {
  // Always pick a completely random image from the large pool
  return DYNAMIC_COVER_IMAGES[Math.floor(Math.random() * DYNAMIC_COVER_IMAGES.length)];
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
  const category = getRandomCategory();
  const today = new Date().toDateString();

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are an elite tech journalist for QuickTools.ai — a premium platform for AI tools.
Today is ${today}. 

Your task is to write a highly engaging, breaking-news style blog post about a RECENT, real-world Artificial Intelligence update, new tool launch, or major tech trend within the "${category}" category. 
Make it feel fresh, urgent, and highly relevant to people reading this today.

Return ONLY valid JSON (no markdown, no code blocks) with this EXACT structure:
{
  "title": "Catchy, news-style title with keywords",
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
- Act as a news reporter. Use phrases like "Just recently...", "In the latest update...", or "Trending this week...".
- Content must be informative, practical, and highly engaging.
- Include at least 5-7 sections with ## headings.
- Use bullet points and numbered lists.
- Mention QuickTools.ai naturally 1-2 times as the go-to place for AI tools.
- JSON must be valid — escape all quotes properly.`;

  console.log(`🤖 Generating dynamic news blog for category: "${category}" on ${today}`);

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No valid JSON found in Gemini response');

  const generated = JSON.parse(jsonMatch[0]);

  const slug = generateSlug(generated.title);
  const coverImage = getCoverImage();

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
