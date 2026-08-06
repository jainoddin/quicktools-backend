import mongoose, { Schema, Document } from 'mongoose';

export interface ILearnSourceSnapshot extends Document {
  sourceId: mongoose.Types.ObjectId;
  contentHash: string;
  rawContent: string;
  normalizedContent: string;
  capturedAt: Date;
}

const LearnSourceSnapshotSchema = new Schema<ILearnSourceSnapshot>({
  sourceId: { type: Schema.Types.ObjectId, ref: 'LearnSource', required: true, index: true },
  contentHash: { type: String, required: true, index: true },
  rawContent: { type: String, required: true },
  normalizedContent: { type: String, required: true },
  capturedAt: { type: Date, default: Date.now }
});

export const LearnSourceSnapshot = mongoose.models.LearnSourceSnapshot || mongoose.model<ILearnSourceSnapshot>('LearnSourceSnapshot', LearnSourceSnapshotSchema);
