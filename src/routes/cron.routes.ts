import { Router, Request, Response } from 'express';
import { Blog } from '../models/Blog';
import { Article } from '../models/Article';
import { News } from '../models/News';
import { generateBlog } from '../services/gemini.service';
import { generateArticle } from '../services/articleGenerator';
import { generateNews } from '../services/newsGenerator';

const router = Router();

// POST /api/cron/generate-blog
// Protected by CRON_SECRET — called by Vercel Cron or manually
router.post('/generate-blog', async (req: Request, res: Response) => {
  try {
    // Verify secret to prevent unauthorized access
    const secret = req.headers['x-cron-secret'] || req.body.secret;
    if (secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Enforce exactly 1 blog per day
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const existingToday = await Blog.findOne({ publishedAt: { $gte: startOfDay } });
    if (existingToday) {
      console.log('⚠️ Blog already generated today. Skipping.');
      return res.json({ success: true, message: 'Already generated a blog today. Skipping.' });
    }

    console.log('⏰ Cron job triggered — generating blog...');

    // Generate blog from Gemini
    const blogData = await generateBlog();

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
    console.error('❌ Blog generation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Blog generation failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/cron/generate-article
router.post('/generate-article', async (req: Request, res: Response) => {
  try {
    const secret = req.headers['x-cron-secret'] || req.body.secret;
    if (secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Enforce exactly 1 article per day
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const existingToday = await Article.findOne({ publishedAt: { $gte: startOfDay } });
    if (existingToday) {
      console.log('⚠️ Article already generated today. Skipping.');
      return res.json({ success: true, message: 'Already generated an article today. Skipping.' });
    }

    console.log('⏰ Cron job triggered — generating article...');

    const articleData = await generateArticle();

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
    console.error('❌ Article generation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Article generation failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/cron/generate-news
router.post('/generate-news', async (req: Request, res: Response) => {
  try {
    const secret = req.headers['x-cron-secret'] || req.body.secret;
    if (secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const newsCountToday = await News.countDocuments({ publishedAt: { $gte: startOfDay } });

    if (newsCountToday >= 3) {
      console.log('⚠️ Already generated 3 news articles today. Skipping.');
      return res.json({ success: true, message: 'Already generated 3 news articles today. Skipping.' });
    }

    console.log(`⏰ Cron job triggered — generating news (Count today: ${newsCountToday})...`);

    const newsData = await generateNews();

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
    console.error('❌ News generation failed:', error);
    res.status(500).json({
      success: false,
      message: 'News generation failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
