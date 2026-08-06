import mongoose, { Schema, Document } from 'mongoose';

export interface ILearnCourse extends Document {
  title: string;
  slug: string;
  provider: string;
  description: string;
  icon: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  lessonCount: number;
  firstLessonSlug?: string;
  isPublished: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const LearnCourseSchema = new Schema<ILearnCourse>({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  provider: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  difficulty: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
  lessonCount: { type: Number, default: 0 },
  firstLessonSlug: { type: String },
  isPublished: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
}, { timestamps: true });

export const LearnCourse = mongoose.models.LearnCourse || mongoose.model<ILearnCourse>('LearnCourse', LearnCourseSchema);
