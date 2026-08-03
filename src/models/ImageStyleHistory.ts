import mongoose, { Document, Schema } from 'mongoose';

export interface IImageStyleHistory extends Document {
  contentId: string;
  contentType: 'blog' | 'article' | 'news';
  category: string;
  selectedFamily: string;
  selectedAssetKey?: string;
  prompt: string;
  attemptNumber: number;
  validationErrors: string[];
  uploadError?: string;
  r2Url?: string;
  finalStatus: 'passed' | 'retrying' | 'skipped';
  createdAt: Date;
}

const ImageStyleHistorySchema = new Schema<IImageStyleHistory>({
  contentId: { type: String, required: true, index: true },
  contentType: { type: String, enum: ['blog', 'article', 'news'], required: true, index: true },
  category: { type: String, required: true },
  selectedFamily: { type: String, required: true, index: true },
  selectedAssetKey: { type: String, index: true },
  prompt: { type: String, required: true },
  attemptNumber: { type: Number, required: true },
  validationErrors: { type: [String], default: [] },
  uploadError: String,
  r2Url: String,
  finalStatus: { type: String, enum: ['passed', 'retrying', 'skipped'], required: true },
}, { timestamps: true });

export const ImageStyleHistory = mongoose.models.ImageStyleHistory || mongoose.model<IImageStyleHistory>('ImageStyleHistory', ImageStyleHistorySchema);
