import mongoose, { Schema, Document } from 'mongoose';

export interface ILearnLessonSourceMap extends Document {
  lessonId: mongoose.Types.ObjectId;
  provider: string;
  keywords: string[];
  sourceIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const LearnLessonSourceMapSchema = new Schema<ILearnLessonSourceMap>({
  lessonId: { type: Schema.Types.ObjectId, ref: 'LearnLesson', required: true, index: true },
  provider: { type: String, required: true },
  keywords: { type: [String], default: [] },
  sourceIds: { type: [{ type: Schema.Types.ObjectId, ref: 'LearnSource' }], default: [] }
}, { timestamps: true });

export const LearnLessonSourceMap = mongoose.models.LearnLessonSourceMap || mongoose.model<ILearnLessonSourceMap>('LearnLessonSourceMap', LearnLessonSourceMapSchema);
