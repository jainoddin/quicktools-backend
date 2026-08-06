import mongoose, { Schema, Document } from 'mongoose';

export interface ISEOAuditCursor extends Document {
  auditType: 'weekly_full_site';
  lastProcessedId: string;
  status: 'idle' | 'running' | 'completed';

  // Concurrency lock — prevents two cron instances from processing same batch
  isRunning: boolean;
  lockedAt?: Date;          // When the lock was acquired
  lockedUntil?: Date;       // Lock expires after this time (safety net for crashed workers)
  lockedBy?: string;        // Worker ID or hostname for debugging
  lastCompletedAt?: Date;   // When the last successful batch finished

  updatedAt: Date;
}

const SEOAuditCursorSchema: Schema = new Schema({
  auditType: { type: String, required: true, unique: true },
  lastProcessedId: { type: String, required: true, default: '0' },
  status: { type: String, enum: ['idle', 'running', 'completed'], default: 'idle' },

  isRunning: { type: Boolean, default: false },
  lockedAt: { type: Date },
  lockedUntil: { type: Date },  // Lock auto-expires after 30 mins (crash protection)
  lockedBy: { type: String },
  lastCompletedAt: { type: Date },
}, { timestamps: true });

export const SEOAuditCursor = mongoose.models.SEOAuditCursor || mongoose.model<ISEOAuditCursor>('SEOAuditCursor', SEOAuditCursorSchema);

const LOCK_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Try to acquire a distributed lock for the audit cron.
 * Returns true if lock acquired, false if another instance holds it.
 */
export async function acquireAuditLock(auditType: string, workerId: string): Promise<boolean> {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + LOCK_TTL_MS);

  // Atomically acquire lock only if: not running OR lock has expired
  const result = await SEOAuditCursor.findOneAndUpdate(
    {
      auditType,
      $or: [
        { isRunning: false },
        { lockedUntil: { $lt: now } } // Expired lock (crashed worker)
      ]
    },
    {
      $set: {
        isRunning: true,
        lockedAt: now,
        lockedUntil,
        lockedBy: workerId,
        status: 'running',
      }
    },
    { new: true }
  );

  return result !== null;
}

/**
 * Release the lock after batch completes or fails.
 */
export async function releaseAuditLock(auditType: string, lastProcessedId: string, completed: boolean) {
  await SEOAuditCursor.findOneAndUpdate(
    { auditType },
    {
      $set: {
        isRunning: false,
        lockedAt: undefined,
        lockedUntil: undefined,
        lockedBy: undefined,
        lastProcessedId,
        lastCompletedAt: new Date(),
        status: completed ? 'completed' : 'running',
      }
    }
  );
}
