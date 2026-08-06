import mongoose, { Schema, Document } from 'mongoose';

export interface ILearnLessonVersion extends Document {
  lessonId: mongoose.Types.ObjectId;
  version: number;
  contentBlocks: any[];
  changeSummary: string;
  sourceReferences: string[];
  createdBy: 'initial_generator' | 'update_pipeline' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

const LearnLessonVersionSchema = new Schema<ILearnLessonVersion>({
  lessonId: { type: Schema.Types.ObjectId, ref: 'LearnLesson', required: true, index: true },
  version: { type: Number, required: true },
  contentBlocks: { type: [Schema.Types.Mixed] as any, default: [] },
  changeSummary: { type: String, required: true },
  sourceReferences: { type: [String], default: [] },
  createdBy: { type: String, enum: ['initial_generator', 'update_pipeline', 'admin'], default: 'admin' },
}, { timestamps: true });

LearnLessonVersionSchema.index({ lessonId: 1, version: 1 }, { unique: true });

export const LearnLessonVersion = mongoose.models.LearnLessonVersion || mongoose.model<ILearnLessonVersion>('LearnLessonVersion', LearnLessonVersionSchema);
