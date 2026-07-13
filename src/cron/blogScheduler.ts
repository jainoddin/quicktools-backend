import cron from 'node-cron';
import { Blog } from '../models/Blog';
import { Article } from '../models/Article';
import { News } from '../models/News';
import { generateBlog } from '../services/gemini.service';
import { generateArticle } from '../services/articleGenerator';
import { generateNews } from '../services/newsGenerator';

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

  // Runs every day at 2:00 PM IST (14:00) for Articles
  cron.schedule('0 14 * * *', async () => {
    console.log('⏰ Daily ARTICLE generation cron triggered at', new Date().toISOString());

    try {
      // Enforce exactly 1 article per day
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const existingToday = await Article.findOne({ publishedAt: { $gte: startOfDay } });
      if (existingToday) {
        console.log('⚠️ Article already generated today. Skipping.');
        return;
      }

      const articleData = await generateArticle();

      const existing = await Article.findOne({ slug: articleData.slug });
      if (existing) {
        articleData.slug = `${articleData.slug}-${Date.now()}`;
      }

      const article = new Article(articleData);
      await article.save();

      console.log(`✅ Auto-generated article: "${article.title}"`);
    } catch (error) {
      console.error('❌ Cron article generation failed:', error);
    }
  }, {
    timezone: 'Asia/Kolkata',
  });

  // ─── NEWS AUTOMATION (3 TIMES A DAY) ───

  // 1. Morning News (8:00 AM IST)
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ Morning NEWS generation cron triggered at', new Date().toISOString());
    await generateSingleNewsJob('Morning');
  }, { timezone: 'Asia/Kolkata' });

  // 2. Afternoon News (1:00 PM IST)
  cron.schedule('0 13 * * *', async () => {
    console.log('⏰ Afternoon NEWS generation cron triggered at', new Date().toISOString());
    await generateSingleNewsJob('Afternoon');
  }, { timezone: 'Asia/Kolkata' });

  // 3. Night News (8:00 PM IST)
  cron.schedule('0 20 * * *', async () => {
    console.log('⏰ Night NEWS generation cron triggered at', new Date().toISOString());
    await generateSingleNewsJob('Night');
  }, { timezone: 'Asia/Kolkata' });

  console.log('✅ Cron jobs scheduled:');
  console.log('   - Blog: Daily at 9:00 AM');
  console.log('   - Article: Daily at 2:00 PM');
  console.log('   - News: Daily at 8:00 AM, 1:00 PM, 8:00 PM');
}

// Helper function to generate exactly 1 news item per slot
async function generateSingleNewsJob(timeSlot: string) {
  try {
    const newsData = await generateNews();
    const existing = await News.findOne({ slug: newsData.slug });
    
    if (existing) {
      newsData.slug = `${newsData.slug}-${Date.now()}`;
    }

    // If it's the morning news, make it 'breaking'
    if (timeSlot === 'Morning') {
      newsData.isBreaking = true;
    } else {
      newsData.isBreaking = false;
    }

    const news = new News(newsData);
    await news.save();
    console.log(`✅ Auto-generated ${timeSlot} news: "${news.title}"`);
  } catch (error) {
    console.error(`❌ Cron ${timeSlot} news generation failed:`, error);
  }
}
