import { Router, Request, Response } from 'express';
import { Blog } from '../models/Blog';
import { generateBlog } from '../services/gemini.service';

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

export default router;
