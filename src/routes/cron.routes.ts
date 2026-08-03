import { Router, Request, Response } from 'express';
import { Blog } from '../models/Blog';
import { Article } from '../models/Article';
import { News } from '../models/News';
import { generateBlog } from '../services/gemini.service';
import { generateArticle } from '../services/articleGenerator';
import { generateNews } from '../services/newsGenerator';
import { sendAdminNotificationEmail } from '../services/emailService';
import { generateWithQualityGate, persistQualityAttempt } from '../services/contentQualityPipeline';
import { attachValidatedImage } from '../services/imageQualityPipeline';
import { CronLock } from '../models/CronLock';
import { getKolkataDateString, getKolkataStartOfDay } from '../utils/contentSchedule';

const router = Router();

async function acquireContentLock(kind: 'blog' | 'article' | 'news'): Promise<string | null> {
  const key = `${kind === 'news' ? 'news-Daily' : kind}-${getKolkataDateString()}`;
  const previous = await CronLock.findOneAndUpdate(
    { key }, { $setOnInsert: { key, createdAt: new Date() } }, { upsert: true, returnDocument: 'before' },
  );
  return previous === null ? key : null;
}

// POST /api/cron/generate-blog
// Protected by CRON_SECRET — called by Vercel Cron or manually
router.post('/generate-blog', async (req: Request, res: Response) => {
  let lockKey: string | null = null;
  try {
    // Verify secret to prevent unauthorized access
    const secret = req.headers['x-cron-secret'] || req.body.secret;
    if (secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Enforce exactly 1 blog per day
    lockKey = await acquireContentLock('blog');
    if (!lockKey) return res.status(409).json({ success: false, message: 'Blog generation is already running' });
    const existingToday = await Blog.findOne({ createdAt: { $gte: getKolkataStartOfDay() } });
    if (existingToday) {
      await CronLock.deleteOne({ key: lockKey });
      console.log('⚠️ Blog already generated today. Skipping.');
      return res.json({ success: true, message: 'Already generated a blog today. Skipping.' });
    }

    console.log('⏰ Cron job triggered — generating blog...');

    // Generate blog from Gemini
    const existingTitles = (await Blog.find({}, 'title').lean()).map(item => item.title);
    const gated = await generateWithQualityGate({ kind: 'blog', existingTitles, generate: () => generateBlog(), onAttempt: entry => persistQualityAttempt('blog', entry) });
    if (!gated.content) { await CronLock.deleteOne({ key: lockKey }); return res.status(422).json({ success: false, message: 'Blog failed quality gate', reviews: gated.reviews }); }
    const blogData = gated.content;
    if (!await attachValidatedImage('blog', blogData)) { await CronLock.deleteOne({ key: lockKey }); return res.status(422).json({ success: false, message: 'Blog image failed quality gate; content was not published' }); }

    // Check if slug already exists
    const existing = await Blog.findOne({ slug: blogData.slug });
    if (existing) {
      blogData.slug = `${blogData.slug}-${Date.now()}`;
    }

    // Save to MongoDB
    const blog = new Blog(blogData);
    await blog.save();

    console.log(`✅ Blog saved: "${blog.title}" (slug: ${blog.slug})`);

    res.json({
      success: true,
      message: 'Blog generated and saved successfully',
      data: {
        slug: blog.slug,
        title: blog.title,
        category: blog.category,
        publishedAt: blog.publishedAt,
      },
    });
  } catch (error) {
    if (lockKey) await CronLock.deleteOne({ key: lockKey }).catch(() => undefined);
    console.error('❌ Blog generation failed:', error);
    
    // Send email alert
    await sendAdminNotificationEmail(
      '🚨 CRITICAL: QuickTools Blog Generation Failed!',
      `<h3>Blog Generation Failed</h3>
       <p>The automated daily blog generation cron job encountered an error:</p>
       <pre style="background: #f4f4f4; padding: 10px; border-radius: 5px;">${error}</pre>
       <p>Please check the server logs immediately.</p>`
    );

    res.status(500).json({
      success: false,
      message: 'Blog generation failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/cron/generate-article
router.post('/generate-article', async (req: Request, res: Response) => {
  let lockKey: string | null = null;
  try {
    const secret = req.headers['x-cron-secret'] || req.body.secret;
    if (secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Enforce exactly 1 article per day
    lockKey = await acquireContentLock('article');
    if (!lockKey) return res.status(409).json({ success: false, message: 'Article generation is already running' });
    const existingToday = await Article.findOne({ createdAt: { $gte: getKolkataStartOfDay() } });
    if (existingToday) {
      await CronLock.deleteOne({ key: lockKey });
      console.log('⚠️ Article already generated today. Skipping.');
      return res.json({ success: true, message: 'Already generated an article today. Skipping.' });
    }

    console.log('⏰ Cron job triggered — generating article...');

    const existingTitles = (await Article.find({}, 'title').lean()).map(item => item.title);
    const gated = await generateWithQualityGate({ kind: 'article', existingTitles, generate: () => generateArticle(), onAttempt: entry => persistQualityAttempt('article', entry) });
    if (!gated.content) { await CronLock.deleteOne({ key: lockKey }); return res.status(422).json({ success: false, message: 'Article failed quality gate', reviews: gated.reviews }); }
    const articleData = gated.content;
    if (!await attachValidatedImage('article', articleData)) { await CronLock.deleteOne({ key: lockKey }); return res.status(422).json({ success: false, message: 'Article image failed quality gate; content was not published' }); }

    const existing = await Article.findOne({ slug: articleData.slug });
    if (existing) {
      articleData.slug = `${articleData.slug}-${Date.now()}`;
    }

    const article = new Article(articleData);
    await article.save();

    console.log(`✅ Article saved: "${article.title}" (slug: ${article.slug})`);

    res.json({
      success: true,
      message: 'Article generated and saved successfully',
      data: {
        slug: article.slug,
        title: article.title,
        category: article.category,
        publishedAt: article.publishedAt,
      },
    });
  } catch (error) {
    if (lockKey) await CronLock.deleteOne({ key: lockKey }).catch(() => undefined);
    console.error('❌ Article generation failed:', error);
    
    // Send email alert
    await sendAdminNotificationEmail(
      '🚨 CRITICAL: QuickTools Article Generation Failed!',
      `<h3>Article Generation Failed</h3>
       <p>The automated daily article generation cron job encountered an error:</p>
       <pre style="background: #f4f4f4; padding: 10px; border-radius: 5px;">${error}</pre>
       <p>Please check the server logs immediately.</p>`
    );

    res.status(500).json({
      success: false,
      message: 'Article generation failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/cron/generate-news
router.post('/generate-news', async (req: Request, res: Response) => {
  let lockKey: string | null = null;
  try {
    const secret = req.headers['x-cron-secret'] || req.body.secret;
    if (secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    lockKey = await acquireContentLock('news');
    if (!lockKey) return res.status(409).json({ success: false, message: 'News generation is already running' });
    const newsCountToday = await News.countDocuments({ createdAt: { $gte: getKolkataStartOfDay() } });

    if (newsCountToday >= 1) {
      await CronLock.deleteOne({ key: lockKey });
      console.log('⚠️ Already generated news today. Skipping.');
      return res.json({ success: true, message: 'Already generated news today. Skipping.' });
    }

    console.log(`⏰ Cron job triggered — generating news (Count today: ${newsCountToday})...`);

    const existingTitles = (await News.find({}, 'title').lean()).map(item => item.title);
    const gated = await generateWithQualityGate({ kind: 'news', existingTitles, generate: () => generateNews(), onAttempt: entry => persistQualityAttempt('news', entry) });
    if (!gated.content) { await CronLock.deleteOne({ key: lockKey }); return res.status(422).json({ success: false, message: 'News failed quality gate', reviews: gated.reviews }); }
    const newsData = gated.content;
    if (!await attachValidatedImage('news', newsData)) { await CronLock.deleteOne({ key: lockKey }); return res.status(422).json({ success: false, message: 'News image failed quality gate; content was not published' }); }

    const existing = await News.findOne({ slug: newsData.slug });
    if (existing) {
      newsData.slug = `${newsData.slug}-${Date.now()}`;
    }

    // First news of the day is breaking
    if (newsCountToday === 0) {
      newsData.isBreaking = true;
    } else {
      newsData.isBreaking = false;
    }

    const news = new News(newsData);
    await news.save();

    console.log(`✅ News saved: "${news.title}" (slug: ${news.slug})`);

    res.json({
      success: true,
      message: 'News generated and saved successfully',
      data: {
        slug: news.slug,
        title: news.title,
        category: news.category,
        isBreaking: news.isBreaking,
        publishedAt: news.publishedAt,
      },
    });
  } catch (error) {
    if (lockKey) await CronLock.deleteOne({ key: lockKey }).catch(() => undefined);
    console.error('❌ News generation failed:', error);
    
    // Send email alert
    await sendAdminNotificationEmail(
      '🚨 CRITICAL: QuickTools News Generation Failed!',
      `<h3>News Generation Failed</h3>
       <p>The automated daily news generation cron job encountered an error:</p>
       <pre style="background: #f4f4f4; padding: 10px; border-radius: 5px;">${error}</pre>
       <p>Please check the server logs immediately.</p>`
    );

    res.status(500).json({
      success: false,
      message: 'News generation failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/cron/generate-social
router.post('/generate-social', async (req: Request, res: Response) => {
  try {
    const secret = req.headers['x-cron-secret'] || req.body.secret;
    if (secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    console.log('⏰ Cron job triggered — generating social media post...');
    
    // Import dynamically to avoid circular/init issues if any, or just import at top
    const { generateAndPostToSocialMedia } = await import('../services/socialMediaGenerator');
    await generateAndPostToSocialMedia();

    res.json({
      success: true,
      message: 'Social media post generated and sent to Make.com successfully',
    });
  } catch (error) {
    console.error('❌ Social media generation failed:', error);
    
    await sendAdminNotificationEmail(
      '🚨 CRITICAL: QuickTools Social Media Post Failed!',
      `<h3>Social Media Post Failed</h3>
       <p>The automated social media cron job encountered an error:</p>
       <pre style="background: #f4f4f4; padding: 10px; border-radius: 5px;">${error}</pre>`
    );

    res.status(500).json({
      success: false,
      message: 'Social media generation failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
