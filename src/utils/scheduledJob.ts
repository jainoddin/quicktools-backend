import { CronRun } from '../models/CronRun';
import { getKolkataDateString } from './contentSchedule';

export async function runScheduledJob<T extends Record<string, unknown> | void>(
  jobName: string,
  task: () => Promise<T>,
  options: { maxAttempts?: number; leaseMs?: number; slot?: string } = {},
): Promise<{ executed: boolean; result?: T }> {
  const scheduledFor = options.slot || getKolkataDateString();
  const jobKey = `${jobName}:${scheduledFor}`;
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const leaseMs = Math.max(60_000, options.leaseMs ?? 30 * 60_000);
  const now = new Date();

  try {
    await CronRun.create({ jobKey, jobName, scheduledFor, status: 'running', attempts: 1, startedAt: now });
  } catch (error: any) {
    if (error?.code === 11000) {
      const leaseExpiredBefore = new Date(now.getTime() - leaseMs);
      const claimed = await CronRun.findOneAndUpdate(
        {
          jobKey,
          attempts: { $lt: maxAttempts },
          $or: [
            { status: 'failed' },
            { status: 'running', startedAt: { $lt: leaseExpiredBefore } },
          ],
        },
        {
          $set: { status: 'running', startedAt: now },
          $inc: { attempts: 1 },
          $unset: { finishedAt: 1, error: 1, result: 1 },
        },
        { new: true },
      );

      if (!claimed) {
        console.log(`[Cron] ${jobKey} is complete, actively leased, or exhausted retries. Skipping.`);
        return { executed: false };
      }
      console.log(`[Cron] Retrying ${jobKey} (attempt ${claimed.attempts}/${maxAttempts}).`);
    } else {
      throw error;
    }
  }

  try {
    const result = await task();
    await CronRun.updateOne({ jobKey }, { status: 'success', finishedAt: new Date(), result: result || {} });
    return { executed: true, result };
  } catch (error: any) {
    await CronRun.updateOne(
      { jobKey },
      { status: 'failed', finishedAt: new Date(), error: error?.stack || error?.message || String(error) },
    );
    throw error;
  }
}
