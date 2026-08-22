import cron from 'node-cron';
import { Blog } from '../models/Blog';
import { Article } from '../models/Article';
import { News } from '../models/News';
import { User } from '../models/user.model';
import { CronFailure } from '../models/CronFailure';
import { CronLock } from '../models/CronLock';
import { generateBlog } from '../services/gemini.service';
import { generateArticle } from '../services/articleGenerator';
import { generateNews } from '../services/newsGenerator';
import { sendAdminNotificationEmail } from '../services/emailService';
import { generateAndSendMarketingEmail } from '../services/marketingGenerator';
import { generateAndPostToSocialMedia } from '../services/socialMediaGenerator';
import { generateWithQualityGate, persistQualityAttempt, QualityResult } from '../services/contentQualityPipeline';
import { attachValidatedImage } from '../services/imageQualityPipeline';
import { getKolkataDateString, getKolkataStartOfDay } from '../utils/contentSchedule';

// Helper to get current date string in Asia/Kolkata timezone (YYYY-MM-DD)
async function logQualitySkip(type: string, reviews: QualityResult[]) {
  const last = reviews[reviews.length - 1];
  await CronFailure.create({
    type: `quality_${type}`,
    error: JSON.stringify({ score: last?.score, issues: last?.issues, criticalIssues: last?.criticalIssues }),
    emailed: false,
    resolved: false,
  });
  console.warn(`[QualityPipeline] ${type} skipped after ${reviews.length} failed attempts.`);
}

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

    try {
      const emailSent = await sendAdminNotificationEmail(subject, contentHTML);
      if (emailSent) {
        doc.emailed = true;
      }
    } catch (emailErr) {
      console.error('[handleCronFailure] Failed to send email alert:', emailErr);
    }
    
    await doc.save();
    console.log(`[handleCronFailure] Logged failure for ${type} on ${dateStr}. Emailed status: ${doc.emailed}`);
  } catch (err) {
    console.error('Error handling cron failure email:', err);
  }
}

export function startCronJobs() {
  const contentAutomationEnabled = process.env.CONTENT_AUTOMATION_ENABLED === 'true';
  if (!contentAutomationEnabled) {
    console.warn('[ContentAutomation] Scheduled blog, article, and news publishing is disabled. Manual protected smoke-test routes remain available.');
  }
  // Helper to acquire distributed lock
  const acquireLock = async (key: string): Promise<boolean> => {
    try {
      // Self-heal stale locks (older than 15 mins) from previous crashed runs
      const staleCutoff = new Date(Date.now() - 15 * 60 * 1000);
      await CronLock.deleteMany({ key, createdAt: { $lt: staleCutoff } });

      const result = await CronLock.findOneAndUpdate(
        { key },
        { $setOnInsert: { key, createdAt: new Date() } },
        { upsert: true, returnDocument: 'before' } // returns null if it was newly inserted
      );
      return result === null;
    } catch (err) {
      console.error('Error acquiring lock:', err);
      await handleCronFailure(`database_lock_${key}`, err);
      return false;
    }
  };

  // 1. Blog: Runs at 9:02 AM IST (with 1 retry at 9:15 AM if failed)
  cron.schedule('2,15 9 * * *', async () => {
    if (!contentAutomationEnabled) return;
    console.log('⏰ Daily blog generation cron triggered at', new Date().toISOString());

    const todayStr = getKolkataDateString();
    const lockKey = `blog-${todayStr}`;
    try {
      
      const hasLock = await acquireLock(lockKey);
      if (!hasLock) {
        console.log('⚠️ Blog lock already acquired by another process today. Skipping.');
        return;
      }

      // Enforce exactly 1 blog per day
      const startOfDay = getKolkataStartOfDay();
      const existingToday = await Blog.findOne({ createdAt: { $gte: startOfDay } });
      if (existingToday) {
        console.log('⚠️ Blog already generated today. Skipping.');
        return;
      }

      const existingTitles = (await Blog.find({}, 'title').lean()).map(item => item.title);
      const gated = await generateWithQualityGate({ kind: 'blog', existingTitles, generate: () => generateBlog(), onAttempt: entry => persistQualityAttempt('blog', entry) });
      if (!gated.content) {
        await logQualitySkip('blog', gated.reviews);
        await CronLock.deleteOne({ key: lockKey });
        return;
      }
      const blogData = gated.content;
      if (!await attachValidatedImage('blog', blogData)) {
        console.warn('[ImagePipeline] Blog skipped after image quality gate failed.');
        await CronLock.deleteOne({ key: lockKey });
        return;
      }

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
      await CronLock.deleteOne({ key: lockKey });
    }
  }, {
    timezone: 'Asia/Kolkata',
  });

  // 2. Article: Runs at 9:02 PM IST (with 1 retry at 9:15 PM if failed)
  cron.schedule('2,15 21 * * *', async () => {
    if (!contentAutomationEnabled) return;
    console.log('⏰ Night ARTICLE generation cron triggered at', new Date().toISOString());

    const todayStr = getKolkataDateString();
    const lockKey = `article-${todayStr}`;
    try {
      
      const hasLock = await acquireLock(lockKey);
      if (!hasLock) {
        console.log('⚠️ Article lock already acquired by another process today. Skipping.');
        return;
      }

      // Enforce exactly 1 article per day
      const startOfDay = getKolkataStartOfDay();
      const existingToday = await Article.findOne({ createdAt: { $gte: startOfDay } });
      if (existingToday) {
        console.log('⚠️ Article already generated today. Skipping.');
        return;
      }

      const existingTitles = (await Article.find({}, 'title').lean()).map(item => item.title);
      const gated = await generateWithQualityGate({ kind: 'article', existingTitles, generate: () => generateArticle(), onAttempt: entry => persistQualityAttempt('article', entry) });
      if (!gated.content) {
        await logQualitySkip('article', gated.reviews);
        await CronLock.deleteOne({ key: lockKey });
        return;
      }
      const articleData = gated.content;
      if (!await attachValidatedImage('article', articleData)) {
        console.warn('[ImagePipeline] Article skipped after image quality gate failed.');
        await CronLock.deleteOne({ key: lockKey });
        return;
      }

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
      await CronLock.deleteOne({ key: lockKey });
    }
  }, {
    timezone: 'Asia/Kolkata',
  });

  // ─── NEWS AUTOMATION ───
  // Afternoon News: Runs at 1:02 PM IST (with 1 retry at 1:15 PM if failed)
  cron.schedule('2,15 13 * * *', async () => {
    if (!contentAutomationEnabled) return;
    console.log('⏰ Afternoon NEWS generation cron triggered at', new Date().toISOString());
    await generateSingleNewsJob('Daily', 'news_daily', acquireLock);
  }, { timezone: 'Asia/Kolkata' });

  // Purge accounts deactivated for more than 15 days (daily at 3:00 AM IST)
  cron.schedule('0 3 * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
      const result = await User.deleteMany({
        deactivatedAt: { $ne: null, $lte: cutoff },
      });
      if (result.deletedCount > 0) {
        console.log(`🗑️ Permanently deleted ${result.deletedCount} deactivated account(s) past 15-day grace period`);
      }
    } catch (error) {
      console.error('❌ Failed to purge deactivated accounts:', error);
    }
  }, { timezone: 'Asia/Kolkata' });

  // Marketing Email: Runs daily at 10:00 AM IST
  cron.schedule('0 10 * * *', async () => {
    console.log('⏰ Marketing Email cron triggered at', new Date().toISOString());
    try {
      const todayStr = getKolkataDateString();
      const lockKey = `marketing-email-${todayStr}`;
      
      const hasLock = await acquireLock(lockKey);
      if (!hasLock) {
        console.log('⚠️ Marketing Email lock already acquired by another process today. Skipping.');
        return;
      }

      await generateAndSendMarketingEmail();
    } catch (error) {
      console.error('❌ Cron marketing email failed:', error);
      await handleCronFailure('marketing_email', error);
    }
  }, { timezone: 'Asia/Kolkata' });

  // Social Media Blast: 3 times a day (1 try + 1 retry per slot)
  // Morning: 9:36 AM and 9:50 AM
  cron.schedule('36,50 9 * * *', async () => {
    console.log('⏰ Morning Social Media cron triggered at', new Date().toISOString());
    await executeSocialMediaJob('Morning', acquireLock);
  }, { timezone: 'Asia/Kolkata' });

  // Afternoon: 2:30 PM and 2:45 PM
  cron.schedule('30,45 14 * * *', async () => {
    console.log('⏰ Afternoon Social Media cron triggered at', new Date().toISOString());
    await executeSocialMediaJob('Afternoon', acquireLock);
  }, { timezone: 'Asia/Kolkata' });

  // Evening: 7:30 PM and 7:45 PM
  cron.schedule('30,45 19 * * *', async () => {
    console.log('⏰ Evening Social Media cron triggered at', new Date().toISOString());
    await executeSocialMediaJob('Evening', acquireLock);
  }, { timezone: 'Asia/Kolkata' });

  console.log('   - Blog:    Morning — 9:02 AM (1 retry at 9:15 AM)');
  console.log('   - News:    Afternoon — 1:02 PM (1 retry at 1:15 PM)');
  console.log('   - Article: Night — 9:02 PM (1 retry at 9:15 PM)');
  console.log('   - Marketing Email: 10:00 AM daily');
  console.log('   - Social Media Auto-Poster: 9:36 AM, 2:30 PM, 7:30 PM daily');
  console.log('   - Accounts: Purge deactivated (15+ days) — 3:00 AM daily');
}

// Helper function to generate exactly 1 news item per slot
async function generateSingleNewsJob(timeSlot: string, failureType: string, acquireLock: (key: string) => Promise<boolean>) {
  const todayStr = getKolkataDateString();
  const lockKey = `news-${timeSlot}-${todayStr}`;
  try {
    
    const hasLock = await acquireLock(lockKey);
    if (!hasLock) {
      console.log(`⚠️ ${timeSlot} News lock already acquired by another process today. Skipping.`);
      return;
    }
    // Prevent duplicate generations by checking if this specific slot already succeeded
    const dateStr = getKolkataDateString();
    
    if (timeSlot === 'Daily') {
      const startOfDay = new Date(`${dateStr}T00:00:00+05:30`);
      const hasDailyNews = await News.findOne({ createdAt: { $gte: startOfDay } });
      if (hasDailyNews) {
        console.log('⚠️ Morning News already generated today. Skipping.');
        return;
      }
    } else if (timeSlot === 'Afternoon') {
      const startOfAfternoon = new Date(`${dateStr}T12:30:00+05:30`);
      const hasAfternoon = await News.findOne({ createdAt: { $gte: startOfAfternoon } });
      if (hasAfternoon) {
        console.log('⚠️ Afternoon News already generated today. Skipping.');
        return;
      }
    } else if (timeSlot === 'Night') {
      const startOfNight = new Date(`${dateStr}T19:30:00+05:30`);
      const hasNight = await News.findOne({ createdAt: { $gte: startOfNight } });
      if (hasNight) {
        console.log('⚠️ Night News already generated today. Skipping.');
        return;
      }
    }

    const existingTitles = (await News.find({}, 'title').lean()).map(item => item.title);
    const gated = await generateWithQualityGate({ kind: 'news', existingTitles, generate: () => generateNews(), onAttempt: entry => persistQualityAttempt('news', entry) });
    if (!gated.content) {
      await logQualitySkip('news', gated.reviews);
      await CronLock.deleteOne({ key: lockKey });
      return;
    }
    const newsData = gated.content;
    if (!await attachValidatedImage('news', newsData)) {
      console.warn('[ImagePipeline] News skipped after image quality gate failed.');
      await CronLock.deleteOne({ key: lockKey });
      return;
    }
    const existing = await News.findOne({ slug: newsData.slug });

    if (existing) {
      newsData.slug = `${newsData.slug}-${Date.now()}`;
    }

    // Make the Daily/Morning news 'breaking' so it shows up as featured on the frontend
    if (timeSlot === 'Daily' || timeSlot === 'Morning') {
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
    await CronLock.deleteOne({ key: lockKey });
  }
}

// Helper function to execute and lock Social Media Jobs with retry
async function executeSocialMediaJob(timeSlot: string, acquireLock: (key: string) => Promise<boolean>) {
  const todayStr = getKolkataDateString();
  const lockKey = `social-media-${timeSlot.toLowerCase()}-${todayStr}`;
  try {
    const hasLock = await acquireLock(lockKey);
    if (!hasLock) {
      console.log(`⚠️ Social Media ${timeSlot} lock already acquired today. Skipping.`);
      return;
    }

    await generateAndPostToSocialMedia();
    console.log(`✅ Successfully triggered Social Media post for ${timeSlot}`);
  } catch (error) {
    console.error(`❌ Cron social media posting (${timeSlot}) failed:`, error);
    // This will send an email alert via handleCronFailure
    await handleCronFailure(`social_media_${timeSlot.toLowerCase()}`, error);
    // Delete lock so it can retry in the next 5 mins
    await CronLock.deleteOne({ key: lockKey });
  }
}
