import cron from 'node-cron';
import { Blog } from '../models/Blog';
import { generateBlog } from '../services/gemini.service';

// Runs every day at 9:00 AM IST
export function startCronJobs() {
  cron.schedule('0 9 * * *', async () => {
    console.log('⏰ Daily blog generation cron triggered at', new Date().toISOString());

    try {
      // Enforce exactly 1 blog per day
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const existingToday = await Blog.findOne({ publishedAt: { $gte: startOfDay } });
      if (existingToday) {
        console.log('⚠️ Blog already generated today. Skipping.');
        return;
      }

      const blogData = await generateBlog();

      // Avoid duplicate slugs
      const existing = await Blog.findOne({ slug: blogData.slug });
      if (existing) {
        blogData.slug = `${blogData.slug}-${Date.now()}`;
      }

      const blog = new Blog(blogData);
      await blog.save();

      console.log(`✅ Auto-generated blog: "${blog.title}"`);
    } catch (error) {
      console.error('❌ Cron blog generation failed:', error);
    }
  }, {
    timezone: 'Asia/Kolkata',
  });

  console.log('✅ Cron jobs scheduled — blog will auto-generate daily at 9:00 AM IST');
}
