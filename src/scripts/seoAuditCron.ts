import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import { Article } from '../models/Article';
import { acquireAuditLock, releaseAuditLock, SEOAuditCursor } from '../models/SEOAuditCursor';
import { auditSingleUrl } from '../services/seoAudit.service';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BATCH_SIZE = parseInt(process.env.SEO_AUDIT_BATCH_SIZE || '40');
const BASE_URL = process.env.INDEXNOW_HOST || 'https://quicktool.space';

// Unique worker identifier per process instance (for lock debugging)
const WORKER_ID = `${os.hostname()}-${process.pid}`;

/**
 * CRON SCHEDULE — Production:
 *
 * Daily Critical Audit:
 *   0 2 * * *    → Runs at 02:00 UTC daily (07:30 IST)
 *   For IST 02:00 AM: use  30 20 * * *  (20:30 UTC = 02:00 IST)
 *   Set TZ=Asia/Kolkata in cron environment if running on IST server.
 *
 * Weekly Batch (cursor-based, runs hourly on weekends):
 *   0 * * * 6,0  → Every hour on Saturday (6) and Sunday (0) UTC
 *                   Cursor resumes from last position; no-op if completed.
 */

async function getCriticalUrls(): Promise<{ url: string; type: string }[]> {
  const urls = [
    { url: `${BASE_URL}/`, type: 'Home' },
    { url: `${BASE_URL}/tools`, type: 'ToolsList' },
    { url: `${BASE_URL}/pricing`, type: 'Pricing' },
    { url: `${BASE_URL}/learn`, type: 'LearnList' },
    { url: `${BASE_URL}/community`, type: 'Community' },
    { url: `${BASE_URL}/blog`, type: 'BlogList' },
    { url: `${BASE_URL}/articles`, type: 'ArticleList' },
    { url: `${BASE_URL}/news`, type: 'NewsList' },
    { url: `${BASE_URL}/sitemap.xml`, type: 'Sitemap' },
    { url: `${BASE_URL}/robots.txt`, type: 'Robots' },
  ];

  // Latest 5 published articles
  const latestArticles = await Article.find().sort({ publishedAt: -1 }).limit(5).exec();
  latestArticles.forEach((a: any) => urls.push({ url: `${BASE_URL}/articles/${a.slug}`, type: 'Article' }));

  return urls;
}

export async function runDailyAudit() {
  console.log(`[SEO Audit] Daily critical audit started. Worker: ${WORKER_ID}`);
  const urls = await getCriticalUrls();
  for (const item of urls) {
    try {
      await auditSingleUrl(item.url, item.type);
    } catch (err: any) {
      console.error(`[SEO Audit] Failed auditing ${item.url}:`, err.message);
    }
  }
  console.log(`[SEO Audit] Daily critical audit completed. ${urls.length} URLs checked.`);
}

export async function runWeeklyAuditBatch() {
  console.log(`[SEO Audit] Weekly batch started. Worker: ${WORKER_ID}`);

  // Ensure cursor record exists
  let cursor = await SEOAuditCursor.findOne({ auditType: 'weekly_full_site' });
  if (!cursor) {
    cursor = await SEOAuditCursor.create({
      auditType: 'weekly_full_site',
      lastProcessedId: '0',
      status: 'idle',
      isRunning: false,
    });
  }

  // If previous cycle completed, reset for new weekly cycle
  if (cursor.status === 'completed') {
    await SEOAuditCursor.findOneAndUpdate(
      { auditType: 'weekly_full_site' },
      { $set: { lastProcessedId: '0', status: 'idle', isRunning: false } }
    );
  }

  // Try to acquire distributed lock
  const acquired = await acquireAuditLock('weekly_full_site', WORKER_ID);
  if (!acquired) {
    console.log(`[SEO Audit] Lock held by another worker. Skipping this run.`);
    return;
  }

  const freshCursor = await SEOAuditCursor.findOne({ auditType: 'weekly_full_site' });
  if (!freshCursor) return;

  // Fetch next batch from DB
  const articles = await Article.find({ _id: { $gt: freshCursor.lastProcessedId } })
    .sort({ _id: 1 })
    .limit(BATCH_SIZE)
    .exec();

  if (articles.length === 0) {
    // All batches done
    await releaseAuditLock('weekly_full_site', freshCursor.lastProcessedId, true);
    console.log(`[SEO Audit] Weekly audit cycle complete — all URLs processed.`);
    return;
  }

  let lastId = freshCursor.lastProcessedId;
  for (const article of articles) {
    try {
      await auditSingleUrl(`${BASE_URL}/articles/${article.slug}`, 'Article');
      lastId = (article._id as any).toString();
    } catch (err: any) {
      console.error(`[SEO Audit] Error auditing ${article.slug}:`, err.message);
    }
  }

  await releaseAuditLock('weekly_full_site', lastId, false);
  console.log(`[SEO Audit] Weekly batch complete. ${articles.length} URLs processed.`);
}

async function main() {
  if (process.env.SEO_AUDIT_ENABLED !== 'true') {
    console.log('[SEO Audit] Disabled via SEO_AUDIT_ENABLED env. Exiting.');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI as string);

    const mode = process.argv[2];
    if (mode === 'daily') {
      await runDailyAudit();
    } else if (mode === 'weekly') {
      await runWeeklyAuditBatch();
    } else {
      console.log('Usage: ts-node seoAuditCron.ts [daily|weekly]');
    }
  } catch (error) {
    console.error('[SEO Audit] Fatal error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}
