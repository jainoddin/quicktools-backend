import mongoose, { Schema, Document } from 'mongoose';

export interface ILearnLessonUpdate extends Document {
  lessonId: mongoose.Types.ObjectId;
  versionFrom: number;
  versionTo: number;
  expectedVersion: number;
  summary: string;
  updateType: 'new_lesson' | 'content_update' | 'major_feature';
  changedBlockIds: string[];
  sourceReferences: string[];
  createdBy: string;
  triggerType: 'manual' | 'automation' | 'admin';
  publishedAt: Date;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const LearnLessonUpdateSchema = new Schema<ILearnLessonUpdate>({
  lessonId: { type: Schema.Types.ObjectId, ref: 'LearnLesson', required: true, index: true },
  versionFrom: { type: Number, required: true },
  versionTo: { type: Number, required: true },
  expectedVersion: { type: Number, required: true },
  summary: { type: String, required: true },
  updateType: { type: String, enum: ['new_lesson', 'content_update', 'major_feature'], required: true },
  changedBlockIds: { type: [String], default: [] },
  sourceReferences: { type: [String], default: [] },
  createdBy: { type: String, required: true },
  triggerType: { type: String, enum: ['manual', 'automation', 'admin'], required: true },
  publishedAt: { type: Date, required: true, default: Date.now },
  idempotencyKey: { type: String, required: true, unique: true }
}, { timestamps: true });

LearnLessonUpdateSchema.index({ lessonId: 1, publishedAt: -1 });

export const LearnLessonUpdate = mongoose.models.LearnLessonUpdate || mongoose.model<ILearnLessonUpdate>('LearnLessonUpdate', LearnLessonUpdateSchema);
