import mongoose, { Schema, Document } from 'mongoose';

export interface ILearnUpdateFailure extends Document {
  jobId?: mongoose.Types.ObjectId;
  provider: string;
  sourceUrl?: string;
  reason: string;
  errorDetails?: any;
  createdAt: Date;
  updatedAt: Date;
}

const LearnUpdateFailureSchema = new Schema<ILearnUpdateFailure>({
  jobId: { type: Schema.Types.ObjectId, ref: 'LearnUpdateJob' },
  provider: { type: String, required: true },
  sourceUrl: { type: String },
  reason: { type: String, required: true },
  errorDetails: { type: Schema.Types.Mixed }
}, { timestamps: true });

export const LearnUpdateFailure = mongoose.models.LearnUpdateFailure || mongoose.model<ILearnUpdateFailure>('LearnUpdateFailure', LearnUpdateFailureSchema);
