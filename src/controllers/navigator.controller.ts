import { Request, Response } from 'express';
import { runWithFailover } from '../services/geminiClient';
import { Blog } from '../models/Blog';
import { Article } from '../models/Article';
import { News } from '../models/News';
import { Prompt } from '../models/Prompt';
import { LearnCourse } from '../models/LearnCourse';
import { LearnLesson } from '../models/LearnLesson';
import toolsData from '../data/tools.json';

const clean = (value: unknown, max: number) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SITE_CAPABILITIES = `QuickTools pages: Home (/), All Tools (/tools), Prompts (/prompts), Blogs (/blog), Articles (/articles), News (/news), Community (/community), Learn (/learn), Pricing (/pricing), About (/about), Contact (/contact).
Supported actions: open pages; search tools/prompts; find blog/article/news by date or latest; read/explain the current page; save resolved content for a signed-in user; go back; pause/resume/stop speech. Saving requires login. Never claim success before the client confirms it.`;

export async function answerNavigatorQuestion(req: Request, res: Response) {
  const question = clean(req.body?.question, 500);
  if (question.length < 3) return res.status(400).json({ success: false, message: 'Please enter a clear question.' });

  const page = {
    path: clean(req.body?.page?.path, 180),
    title: clean(req.body?.page?.title, 180),
    description: clean(req.body?.page?.description, 400),
    content: clean(req.body?.page?.content, 5000),
    actions: clean(req.body?.page?.actions, 1800),
  };
  const language = ['en', 'te', 'hi'].includes(req.body?.language) ? req.body.language : 'en';
  const history = clean(JSON.stringify(Array.isArray(req.body?.history) ? req.body.history.slice(-8) : []), 2200);
  const session = clean(JSON.stringify(req.body?.session || {}), 1800);

  try {
    const answer = await runWithFailover(async (genAI, modelName) => {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(`You are QuickTools AI Navigator, a concise website assistant for quicktool.space.
Answer only about QuickTools, the current page, AI tools, prompts, courses, blogs, articles, or news.
Use the supplied page context when relevant. Never invent page features, prices, claims, or links.
If the context is insufficient, say so and suggest using the site search. Keep the answer under 90 words.
Reply in ${language === 'te' ? 'natural Telugu or Telugu-English matching the user' : language === 'hi' ? 'natural Hindi' : 'English'}. Respect requests for simple or detailed explanations.

Site capability registry: ${SITE_CAPABILITIES}

Current page path: ${page.path || 'unknown'}
Current page title: ${page.title || 'unknown'}
Page description: ${page.description || 'not supplied'}
Visible page content: ${page.content || 'not supplied'}
Visible buttons and links: ${page.actions || 'not supplied'}
Lightweight session context: ${session || 'not supplied'}
Recent conversation: ${history || 'not supplied'}

User question: ${question}`);
      return result.response.text().trim();
    });
    return res.json({ success: true, answer });
  } catch (error) {
    console.error('[Navigator] Q&A failed:', error);
    return res.status(503).json({ success: false, message: 'AI help is temporarily unavailable. Navigation and search still work.' });
  }
}

export async function searchNavigatorData(req: Request, res: Response) {
  const query = clean(req.query.q, 120);
  if (query.length < 2) return res.status(400).json({ success: false, message: 'Enter at least two characters.' });
  const regex = new RegExp(escapeRegex(query), 'i');
  try {
    const tools = (toolsData as Array<any>)
      .filter(tool => regex.test(`${tool.name} ${tool.description} ${tool.category}`))
      .slice(0, 4)
      .map(tool => ({ type: 'tool', id: tool.slug, title: tool.name, description: tool.description, path: tool.slug }));
    const [prompts, courses, lessons, blogs, articles, news] = await Promise.all([
      Prompt.find({ status: 'published', $or: [{ title: regex }, { description: regex }, { tags: regex }] }).sort({ qualityScore: -1, publishedAt: -1 }).limit(4).select('slug title description models').lean(),
      LearnCourse.find({ isPublished: true, $or: [{ title: regex }, { description: regex }, { provider: regex }] }).limit(3).select('slug title description firstLessonSlug').lean(),
      LearnLesson.find({ status: 'published', $or: [{ title: regex }, { excerpt: regex }, { tags: regex }] }).limit(3).select('courseId slug title excerpt').populate('courseId', 'slug').lean(),
      Blog.find({ $or: [{ title: regex }, { description: regex }, { tags: regex }] }).sort({ publishedAt: -1 }).limit(3).select('slug title description').lean(),
      Article.find({ $or: [{ title: regex }, { description: regex }, { tags: regex }] }).sort({ publishedAt: -1 }).limit(3).select('slug title description').lean(),
      News.find({ $or: [{ title: regex }, { summary: regex }, { tags: regex }] }).sort({ publishedAt: -1 }).limit(3).select('slug title summary').lean(),
    ]);
    const results = [
      ...tools,
      ...prompts.map((item: any) => ({ type: 'prompt', id: String(item._id), title: item.title, description: item.description, path: `/prompts/${String(item.models?.[0] || 'chatgpt').toLowerCase()}/${item.slug}` })),
      ...courses.map((item: any) => ({ type: 'course', id: String(item._id), title: item.title, description: item.description, path: item.firstLessonSlug ? `/learn/${item.slug}/${item.firstLessonSlug}` : '/learn' })),
      ...lessons.map((item: any) => ({ type: 'lesson', id: String(item._id), title: item.title, description: item.excerpt, path: `/learn/${item.courseId?.slug}/${item.slug}` })),
      ...blogs.map((item: any) => ({ type: 'blog', id: String(item._id), title: item.title, description: item.description, path: `/blog/${item.slug}` })),
      ...articles.map((item: any) => ({ type: 'article', id: String(item._id), title: item.title, description: item.description, path: `/articles/${item.slug}` })),
      ...news.map((item: any) => ({ type: 'news', id: String(item._id), title: item.title, description: item.summary, path: `/news/${item.slug}` })),
    ];
    return res.json({ success: true, data: results.slice(0, 15) });
  } catch (error) {
    console.error('[Navigator] Search failed:', error);
    return res.status(500).json({ success: false, message: 'Search is temporarily unavailable.' });
  }
}

export async function getAdjacentNavigatorContent(req: Request, res: Response) {
  const type = clean(req.query.type, 20);
  const slug = clean(req.query.slug, 220);
  const direction = req.query.direction === 'previous' ? 'previous' : 'next';
  if (!['blog', 'article', 'news'].includes(type) || !slug) return res.status(400).json({ success: false, message: 'Invalid content request.' });
  try {
    const Model: any = type === 'article' ? Article : type === 'news' ? News : Blog;
    const current = await Model.findOne({ slug }).select('publishedAt').lean();
    if (!current) return res.status(404).json({ success: false, message: 'Current content was not found.' });
    const comparison = direction === 'next' ? '$lt' : '$gt';
    const sort = direction === 'next' ? -1 : 1;
    const item = await Model.findOne({ publishedAt: { [comparison]: current.publishedAt } }).sort({ publishedAt: sort, _id: sort }).select('slug title publishedAt').lean();
    if (!item) return res.status(404).json({ success: false, message: `No ${direction} ${type} is available.` });
    return res.json({ success: true, data: { id: String(item._id), type, title: item.title, slug: item.slug, path: `/${type === 'article' ? 'articles' : type}/${item.slug}` } });
  } catch (error) {
    console.error('[Navigator] Adjacent content failed:', error);
    return res.status(500).json({ success: false, message: 'Could not load adjacent content.' });
  }
}

export async function resolveNavigatorContent(req: Request, res: Response) {
  const requestText = clean(req.body?.request, 500);
  if (requestText.length < 3) return res.status(400).json({ success: false, message: 'Please enter a content request.' });

  try {
    const plan = await runWithFailover(async (genAI, modelName) => {
      const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: 'application/json' } });
      const result = await model.generateContent(`Convert this multilingual QuickTools website request into JSON only.
Current date in India: ${new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())}
Schema: {"contentType":"blog|article|news","date":"YYYY-MM-DD|null","latest":boolean,"language":"te|te-en|hi|en","explain":boolean,"read":boolean,"navigate":boolean,"save":boolean}
Interpret Telugu/Hindi/English and mixed language naturally. "today/aaj/eeroju" means current India date. "latest/newest/recent" means latest=true. If user says do not open, navigate=false.
Set save=true only when the user explicitly asks to save or bookmark the content.
Request: ${requestText}`);
      return JSON.parse(result.response.text());
    }) as { contentType?: string; date?: string | null; latest?: boolean; language?: string; explain?: boolean; read?: boolean; navigate?: boolean; save?: boolean };

    const type = ['blog', 'article', 'news'].includes(plan.contentType || '') ? plan.contentType! : 'blog';
    const filter: Record<string, unknown> = {};
    if (plan.date && /^\d{4}-\d{2}-\d{2}$/.test(plan.date)) {
      const start = new Date(`${plan.date}T00:00:00+05:30`);
      const end = new Date(`${plan.date}T23:59:59.999+05:30`);
      filter.publishedAt = { $gte: start, $lte: end };
    }
    const projection = 'slug title description summary publishedAt';
    const found = type === 'article'
      ? await Article.findOne(filter).sort({ publishedAt: -1, _id: -1 }).select(projection).lean()
      : type === 'news'
        ? await News.findOne(filter).sort({ publishedAt: -1, _id: -1 }).select(projection).lean()
        : await Blog.findOne(filter).sort({ publishedAt: -1, _id: -1 }).select(projection).lean();
    const item = found as unknown as { _id: unknown; slug: string; title: string; publishedAt: Date } | null;
    if (!item) {
      const alternative = type === 'article'
        ? await Article.findOne({}).sort({ publishedAt: -1, _id: -1 }).select(projection).lean()
        : type === 'news'
          ? await News.findOne({}).sort({ publishedAt: -1, _id: -1 }).select(projection).lean()
          : await Blog.findOne({}).sort({ publishedAt: -1, _id: -1 }).select(projection).lean();
      return res.status(404).json({
        success: false,
        message: plan.date ? `No ${type} was published on ${plan.date}.` : `No published ${type} is available.`,
        alternative: alternative ? { title: (alternative as any).title, path: `/${type === 'article' ? 'articles' : type}/${(alternative as any).slug}`, publishedAt: (alternative as any).publishedAt } : null,
      });
    }
    const path = `/${type === 'article' ? 'articles' : type}/${item.slug}`;
    return res.json({ success: true, data: { id: String(item._id), type, path, title: item.title, publishedAt: item.publishedAt, language: plan.language || 'en', explain: Boolean(plan.explain), read: Boolean(plan.read), navigate: plan.navigate !== false, save: Boolean(plan.save) } });
  } catch (error) {
    console.error('[Navigator] Content resolution failed:', error);
    return res.status(503).json({ success: false, message: 'I could not resolve that content request right now.' });
  }
}
