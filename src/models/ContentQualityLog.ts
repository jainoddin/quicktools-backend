import mongoose, { Document, Schema } from 'mongoose';
import type { ContentKind, SearchIntent } from '../services/contentQualityPipeline';

export interface IContentQualityLog extends Document {
  contentType: ContentKind;
  topic: string;
  searchIntent: SearchIntent;
  attemptNumber: number;
  deterministicValidationErrors: string[];
  scores: { deterministic: number; fact?: number | null; seo?: number | null; readability?: number | null };
  criticalRejectionReasons: string[];
  sourceUrl?: string;
  finalStatus: 'passed' | 'retrying' | 'skipped';
  createdAt: Date;
}

const ContentQualityLogSchema = new Schema<IContentQualityLog>({
  contentType: { type: String, enum: ['blog', 'article', 'news'], required: true, index: true },
  topic: { type: String, required: true },
  searchIntent: { type: String, enum: ['informational', 'commercial', 'comparison', 'tutorial', 'news'], required: true },
  attemptNumber: { type: Number, required: true },
  deterministicValidationErrors: { type: [String], default: [] },
  scores: {
    deterministic: { type: Number, required: true },
    fact: { type: Number, default: null },
    seo: { type: Number, default: null },
    readability: { type: Number, default: null },
  },
  criticalRejectionReasons: { type: [String], default: [] },
  sourceUrl: String,
  finalStatus: { type: String, enum: ['passed', 'retrying', 'skipped'], required: true },
}, { timestamps: true });

export const ContentQualityLog = mongoose.models.ContentQualityLog || mongoose.model<IContentQualityLog>('ContentQualityLog', ContentQualityLogSchema);
