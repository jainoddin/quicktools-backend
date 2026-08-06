import mongoose, { Schema, Document } from 'mongoose';

export interface ILearnRevalidationJob extends Document {
  courseSlug: string;
  lessonSlug: string;
  cacheKey: string;
  attempts: number;
  status: 'pending' | 'success' | 'failed';
  nextRetryAt: Date;
  completedAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LearnRevalidationJobSchema = new Schema<ILearnRevalidationJob>({
  courseSlug: { type: String, required: true },
  lessonSlug: { type: String, required: true },
  cacheKey: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  nextRetryAt: { type: Date, required: true },
  completedAt: { type: Date },
  lastError: { type: String }
}, { timestamps: true });

LearnRevalidationJobSchema.index({ courseSlug: 1, lessonSlug: 1, cacheKey: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });

export const LearnRevalidationJob = mongoose.models.LearnRevalidationJob || mongoose.model<ILearnRevalidationJob>('LearnRevalidationJob', LearnRevalidationJobSchema);
