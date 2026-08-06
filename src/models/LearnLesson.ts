import mongoose, { Schema, Document } from 'mongoose';

export interface ILearnLesson extends Document {
  courseId: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  order: number;
  excerpt: string;
  contentBlocks: any[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedReadMinutes: number;
  previousLessonId?: mongoose.Types.ObjectId;
  nextLessonId?: mongoose.Types.ObjectId;
  tags: string[];
  relatedToolSlugs: string[];
  relatedPromptIds: string[];
  relatedCommunityTags: string[];
  sourceReferences: string[];
  currentVersion: number;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: Date;
  lastUpdatedAt?: Date;
  lastMajorUpdateAt?: Date;
  updateSummary?: string;
  updateType?: 'new_lesson' | 'content_update' | 'major_feature';
  updatedBlockIds?: string[];
  primaryUpdateAnchor?: string;
  latestUpdateSourceIds?: mongoose.Types.ObjectId[];
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LearnLessonSchema = new Schema<ILearnLesson>({
  courseId: { type: Schema.Types.ObjectId, ref: 'LearnCourse', required: true, index: true },
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  order: { type: Number, default: 0 },
  excerpt: { type: String, required: true },
  contentBlocks: { type: [Schema.Types.Mixed] as any, default: [] },
  difficulty: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
  estimatedReadMinutes: { type: Number, default: 5 },
  previousLessonId: { type: Schema.Types.ObjectId, ref: 'LearnLesson' },
  nextLessonId: { type: Schema.Types.ObjectId, ref: 'LearnLesson' },
  tags: { type: [String], default: [] },
  relatedToolSlugs: { type: [String], default: [] },
  relatedPromptIds: { type: [String], default: [] },
  relatedCommunityTags: { type: [String], default: [] },
  sourceReferences: { type: [String], default: [] },
  currentVersion: { type: Number, default: 1 },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  publishedAt: { type: Date },
  lastUpdatedAt: { type: Date },
  lastMajorUpdateAt: { type: Date },
  updateSummary: { type: String },
  updateType: { type: String, enum: ['new_lesson', 'content_update', 'major_feature'] },
  updatedBlockIds: { type: [String], default: [] },
  primaryUpdateAnchor: { type: String },
  latestUpdateSourceIds: [{ type: Schema.Types.ObjectId, ref: 'LearnSource' }],
  seoTitle: { type: String },
  seoDescription: { type: String },
  canonicalUrl: { type: String }
}, { timestamps: true });

LearnLessonSchema.index({ courseId: 1, order: 1 });

export const LearnLesson = mongoose.models.LearnLesson || mongoose.model<ILearnLesson>('LearnLesson', LearnLessonSchema);
