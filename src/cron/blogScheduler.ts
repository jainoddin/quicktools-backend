import cron from 'node-cron';
import { Blog } from '../models/Blog';
import { Article } from '../models/Article';
import { News } from '../models/News';
import { CronFailure } from '../models/CronFailure';
import { generateBlog } from '../services/gemini.service';
import { generateArticle } from '../services/articleGenerator';
import { generateNews } from '../services/newsGenerator';
import { sendAdminNotificationEmail } from '../services/emailService';

// Helper to get current date string in Asia/Kolkata timezone (YYYY-MM-DD)
const getKolkataDateString = () => {
  const d = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(d);
};

// Helper function to handle cron failure logs and single email alerts per day
async function handleCronFailure(type: string, error: any) {
  try {
    const dateStr = getKolkataDateString();

    // Check if we already registered a failure and emailed for this type on this date
    const existing = await CronFailure.findOne({ type, date: dateStr });

    if (existing && existing.emailed) {
      console.log(`[handleCronFailure] Failure email already sent today for ${type}. Skipping email alert.`);
      return;
    }

    // If it doesn't exist, create it. If it exists but wasn't emailed yet, update and email.
    let doc = existing;
    if (!doc) {
      doc = new CronFailure({
        type,
        date: dateStr,
        error: error instanceof Error ? error.stack || error.message : String(error),
        emailed: false
      });
    } else {
      doc.error = error instanceof Error ? error.stack || error.message : String(error);
    }

    const subject = `🚨 QuickTools AI: ${type.toUpperCase().replace('_', ' ')} Generation Failed!`;
    const contentHTML = `
      <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; border: 1px solid #FECACA; border-radius: 10px; background-color: #FEF2F2;">
        <h2 style="color: #DC2626; text-align: center; margin-top: 0;">Cron Job Failure Alert</h2>
        <p style="color: #374151; font-size: 16px; line-height: 1.5;">
          The automated cron job for <strong>${type}</strong> failed to execute today (${dateStr} Asia/Kolkata).
        </p>
        <div style="background-color: #FFFFFF; border: 1px solid #FCA5A5; border-radius: 5px; padding: 15px; overflow-x: auto; font-family: monospace; font-size: 13px; color: #7F1D1D; margin: 20px 0;">
          <strong>Error Message:</strong><br/>
          <pre style="margin-top: 10px; white-space: pre-wrap; word-break: break-all;">${error instanceof Error ? error.stack || error.message : String(error)}</pre>
        </div>
        <p style="color: #374151; font-size: 14px;">
          The system will continue retrying every 5 minutes during the scheduled slot. It will stop retrying once it successfully posts the content.
        </p>
        <hr style="border: none; border-top: 1px solid #FECACA; margin: 20px 0;" />
        <p style="color: #9CA3AF; font-size: 11px; text-align: center;">
          © QuickTools.ai automated notification system.
        </p>
      </div>
    `;

    const emailSent = await sendAdminNotificationEmail(subject, contentHTML);
    if (emailSent) {
      doc.emailed = true;
    }
    await doc.save();
    console.log(`[handleCronFailure] Logged failure for ${type} on ${dateStr}. Emailed status: ${doc.emailed}`);
  } catch (err) {
    console.error('Error handling cron failure email:', err);
  }
}

export function startCronJobs() {
  // 1. Blog: Runs at minute 2 of every 5-minute interval (2, 7, 12, 17, etc.) between 9 AM and 11 PM IST
  cron.schedule('2-59/5 9-23 * * *', async () => {
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
      await handleCronFailure('blog', error);
    }
  }, {
    timezone: 'Asia/Kolkata',
  });

  // 2. Article: Runs at minute 2 of every 5-minute interval (2, 7, 12, 17, etc.) between 2 PM and 11 PM IST
  cron.schedule('2-59/5 14-23 * * *', async () => {
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
      await handleCronFailure('article', error);
    }
  }, {
    timezone: 'Asia/Kolkata',
  });

  // ─── NEWS AUTOMATION (3 TIMES A DAY) ───

  // Morning News (8:02 AM IST first try, retry every 5 mins in 8:00 AM - 12:59 PM slot)
  cron.schedule('2-59/5 8-12 * * *', async () => {
    console.log('⏰ Morning NEWS generation cron triggered at', new Date().toISOString());
    await generateSingleNewsJob('Morning', 'news_morning');
  }, { timezone: 'Asia/Kolkata' });

  // Afternoon News (1:02 PM IST first try, retry every 5 mins in 1:00 PM - 7:59 PM slot)
  cron.schedule('2-59/5 13-19 * * *', async () => {
    console.log('⏰ Afternoon NEWS generation cron triggered at', new Date().toISOString());
    await generateSingleNewsJob('Afternoon', 'news_afternoon');
  }, { timezone: 'Asia/Kolkata' });

  // Night News (8:02 PM IST first try, retry every 5 mins in 8:00 PM - 11:59 PM slot)
  cron.schedule('2-59/5 20-23 * * *', async () => {
    console.log('⏰ Night NEWS generation cron triggered at', new Date().toISOString());
    await generateSingleNewsJob('Night', 'news_night');
  }, { timezone: 'Asia/Kolkata' });

  console.log('✅ Cron jobs scheduled (Asia/Kolkata):');
  console.log('   - Blog: Every 5 mins starting from 9:02 AM to 11:59 PM');
  console.log('   - Article: Every 5 mins starting from 2:02 PM to 11:59 PM');
  console.log('   - News: Slots at 8AM, 1PM, 8PM with 5-min retry windows');
}

// Helper function to generate exactly 1 news item per slot
async function generateSingleNewsJob(timeSlot: string, failureType: string) {
  try {
    // Enforce exactly required news per day to prevent duplicate retries
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const newsCountToday = await News.countDocuments({ publishedAt: { $gte: startOfDay } });

    if (timeSlot === 'Morning' && newsCountToday >= 1) {
      console.log('⚠️ Morning News already generated today. Skipping.');
      return;
    }
    if (timeSlot === 'Afternoon' && newsCountToday >= 2) {
      console.log('⚠️ Afternoon News already generated today. Skipping.');
      return;
    }
    if (timeSlot === 'Night' && newsCountToday >= 3) {
      console.log('⚠️ Night News already generated today. Skipping.');
      return;
    }

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
    await handleCronFailure(failureType, error);
  }
}

