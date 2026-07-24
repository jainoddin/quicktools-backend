import mongoose, { Document, Schema } from 'mongoose';

export interface ICronLock extends Document {
  key: string;
  createdAt: Date;
}

const CronLockSchema = new Schema<ICronLock>({
  key: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: 300 } // Auto-delete after 5 minutes (300 seconds)
});

export const CronLock = mongoose.models.CronLock || mongoose.model<ICronLock>('CronLock', CronLockSchema);
