import mongoose, { Schema, Document } from 'mongoose';

export interface ILearnProgress extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  completedLessonIds: mongoose.Types.ObjectId[];
  currentLessonId?: mongoose.Types.ObjectId;
  progressPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

const LearnProgressSchema = new Schema<ILearnProgress>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'LearnCourse', required: true, index: true },
  completedLessonIds: { type: [{ type: Schema.Types.ObjectId, ref: 'LearnLesson' }], default: [] },
  currentLessonId: { type: Schema.Types.ObjectId, ref: 'LearnLesson' },
  progressPercentage: { type: Number, default: 0 },
}, { timestamps: true });

LearnProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export const LearnProgress = mongoose.models.LearnProgress || mongoose.model<ILearnProgress>('LearnProgress', LearnProgressSchema);
