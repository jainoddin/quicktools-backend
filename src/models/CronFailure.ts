import mongoose, { Document, Schema } from 'mongoose';

export interface ICronFailure extends Document {
  date: Date;
  blogSlug?: string;
  error: string;
  type: string;
  resolved: boolean;
}

const CronFailureSchema = new Schema<ICronFailure>({
  date: { type: Date, default: Date.now },
  blogSlug: { type: String, required: false },
  error: { type: String, required: true },
  type: { type: String, required: true },
  resolved: { type: Boolean, default: false }
});

export const CronFailure = mongoose.models.CronFailure || mongoose.model<ICronFailure>('CronFailure', CronFailureSchema);
