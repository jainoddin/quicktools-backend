import mongoose, { Schema, Document } from 'mongoose';

export interface ILearnUpdateJob extends Document {
  provider: string;
  sourceId: mongoose.Types.ObjectId;
  detectedChanges: any;
  affectedLessonIds: mongoose.Types.ObjectId[];
  attempts: number;
  validationScore?: number;
  status: 'detected' | 'mapping' | 'generating' | 'validating' | 'published' | 'skipped' | 'failed';
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LearnUpdateJobSchema = new Schema<ILearnUpdateJob>({
  provider: { type: String, required: true },
  sourceId: { type: Schema.Types.ObjectId, ref: 'LearnSource', required: true },
  detectedChanges: { type: Schema.Types.Mixed },
  affectedLessonIds: { type: [{ type: Schema.Types.ObjectId, ref: 'LearnLesson' }], default: [] },
  attempts: { type: Number, default: 0 },
  validationScore: { type: Number },
  status: { type: String, enum: ['detected', 'mapping', 'generating', 'validating', 'published', 'skipped', 'failed'], default: 'detected', index: true },
  failureReason: { type: String }
}, { timestamps: true });

export const LearnUpdateJob = mongoose.models.LearnUpdateJob || mongoose.model<ILearnUpdateJob>('LearnUpdateJob', LearnUpdateJobSchema);
