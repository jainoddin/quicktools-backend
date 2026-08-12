import mongoose, { Schema } from 'mongoose';

export interface ICronRun {
  jobKey: string;
  jobName: string;
  scheduledFor: string;
  status: 'running' | 'success' | 'failed' | 'skipped_lock';
  attempts: number;
  startedAt: Date;
  finishedAt?: Date;
  result?: Record<string, unknown>;
  error?: string;
}

const CronRunSchema = new Schema<ICronRun>({
  jobKey: { type: String, required: true, unique: true, index: true },
  jobName: { type: String, required: true, index: true },
  scheduledFor: { type: String, required: true },
  status: { type: String, enum: ['running', 'success', 'failed', 'skipped_lock'], default: 'running', index: true },
  attempts: { type: Number, default: 1 },
  startedAt: { type: Date, default: Date.now },
  finishedAt: Date,
  result: Schema.Types.Mixed,
  error: String,
}, { timestamps: true });

CronRunSchema.index({ jobName: 1, startedAt: -1 });
// Operational history is useful for debugging, but it should not grow forever.
CronRunSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const CronRun = mongoose.models.CronRun || mongoose.model<ICronRun>('CronRun', CronRunSchema);
