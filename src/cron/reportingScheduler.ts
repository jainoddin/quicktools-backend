import cron from 'node-cron';
import { Blog } from '../models/Blog';
import { News } from '../models/News';
import { Article } from '../models/Article';
import { getDailyGA4Metrics } from '../services/analyticsService';
import { appendDailyReportRow } from '../services/sheetsService';
import dotenv from 'dotenv';
dotenv.config();

export function startReportingCron() {
  // Run every day at 11:55 PM IST
  cron.schedule('55 23 * * *', async () => {
    console.log('📊 Starting daily reporting cron at', new Date().toISOString());

    const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID;
    const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

    if (!GA4_PROPERTY_ID || !GOOGLE_SHEET_ID) {
      console.warn('⚠️ Missing GA4_PROPERTY_ID or GOOGLE_SHEET_ID in .env. Skipping reporting.');
      return;
    }

    try {
      // Get IST Date bounds for today
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
      const dateStr = formatter.format(now);
      
      const startOfDay = new Date(`${dateStr}T00:00:00+05:30`);
      const endOfDay = new Date(`${dateStr}T23:59:59.999+05:30`);

      // Aggregate MongoDB metrics
      const blogsGenerated = await Blog.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } });
      const newsGenerated = await News.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } });
      const articlesGenerated = await Article.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } });

      // Aggregate GA4 metrics
      const { totalUsers, totalViews, topPage } = await getDailyGA4Metrics(GA4_PROPERTY_ID);

      // Append to Sheets
      await appendDailyReportRow(GOOGLE_SHEET_ID, {
        date: dateStr,
        blogsGenerated,
        newsGenerated,
        articlesGenerated,
        activeUsers: totalUsers,
        pageViews: totalViews,
        topPage
      });

    } catch (error) {
      console.error('❌ Error in daily reporting cron:', error);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });
}
