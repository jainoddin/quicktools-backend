import mongoose, { Document, Schema } from 'mongoose';

export interface ICronLock extends Document {
  key: string;
  createdAt: Date;
}

const CronLockSchema = new Schema<ICronLock>({
  key: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: 900 } // Auto-delete after 15 minutes (900 seconds)
});

export const CronLock = mongoose.models.CronLock || mongoose.model<ICronLock>('CronLock', CronLockSchema);
