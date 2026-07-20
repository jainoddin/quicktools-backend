import cron from 'node-cron';
import { generateAndPostToSocialMedia } from '../services/socialMediaGenerator';
import { CronLock } from '../models/CronLock';

export function startSocialMediaCron() {
  // Run every day at 10:00 AM
  cron.schedule('0 10 * * *', async () => {
    console.log('⏰ [Cron] Triggering Daily Social Media Auto-Poster...');
    
    // Use MongoDB to prevent duplicate cron executions across multiple server instances
    const lockName = 'daily_social_media_post';
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const lockKey = `${lockName}_${todayStr}`;
    
    try {
      const lock = await CronLock.findOneAndUpdate(
        { lockName: lockKey },
        { lockName: lockKey, executedAt: now },
        { upsert: true, new: true }
      );
      
      // If we successfully created the lock (meaning no other instance did it today)
      if (lock) {
        console.log(`[Cron] Lock acquired for ${lockKey}. Executing post...`);
        await generateAndPostToSocialMedia();
      } else {
        console.log(`[Cron] Task already executed today: ${lockKey}. Skipping.`);
      }
    } catch (error: any) {
      // If a duplicate key error occurs, it means another instance just grabbed the lock
      if (error.code === 11000) {
        console.log(`[Cron] Lock already exists for ${lockKey}. Skipping.`);
      } else {
        console.error(`[Cron] Failed to acquire lock for ${lockKey}:`, error);
      }
    }
  });

  console.log('✅ Social Media Auto-Poster Cron Job Scheduled (Daily at 10:00 AM)');
}
