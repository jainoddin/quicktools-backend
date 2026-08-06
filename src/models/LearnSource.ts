import mongoose, { Schema, Document } from 'mongoose';

export interface ILearnSource extends Document {
  provider: 'openai' | 'anthropic' | 'google' | 'cursor' | 'perplexity';
  sourceUrl: string;
  sourceType: 'docs' | 'release_notes' | 'changelog';
  isActive: boolean;
  lastCheckedAt?: Date;
  lastContentHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LearnSourceSchema = new Schema<ILearnSource>({
  provider: { type: String, enum: ['openai', 'anthropic', 'google', 'cursor', 'perplexity'], required: true, index: true },
  sourceUrl: { type: String, required: true },
  sourceType: { type: String, enum: ['docs', 'release_notes', 'changelog'], required: true },
  isActive: { type: Boolean, default: true },
  lastCheckedAt: { type: Date },
  lastContentHash: { type: String }
}, { timestamps: true });

export const LearnSource = mongoose.models.LearnSource || mongoose.model<ILearnSource>('LearnSource', LearnSourceSchema);
