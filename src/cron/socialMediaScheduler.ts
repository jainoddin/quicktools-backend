import cron from 'node-cron';
import { generateAndPostToSocialMedia } from '../services/socialMediaGenerator';
import { runScheduledJob } from '../utils/scheduledJob';

export function startSocialMediaCron() {
  // Run every day at 10:00 AM
  cron.schedule('0 10 * * *', async () => {
    console.log('⏰ [Cron] Triggering Daily Social Media Auto-Poster...');
    
    try {
      await runScheduledJob('daily_social_media_post', async () => {
        await generateAndPostToSocialMedia();
        return { posted: true };
      });
    } catch (error: any) {
      console.error('[Cron] Social media job failed:', error);
    }
  });

  console.log('✅ Social Media Auto-Poster Cron Job Scheduled (Daily at 10:00 AM)');
}
