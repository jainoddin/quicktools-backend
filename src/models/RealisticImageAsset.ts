import mongoose, { Document, Schema } from 'mongoose';

export interface IRealisticImageAsset extends Document {
  key: string; family: string; tags: string[]; r2Url: string;
  active: boolean; usageCount: number; lastUsedAt?: Date;
}

const schema = new Schema<IRealisticImageAsset>({
  key: { type: String, required: true, unique: true },
  family: { type: String, required: true, index: true },
  tags: { type: [String], required: true },
  r2Url: { type: String, required: true },
  active: { type: Boolean, default: true, index: true },
  usageCount: { type: Number, default: 0 },
  lastUsedAt: Date,
}, { timestamps: true });

export const RealisticImageAsset = mongoose.models.RealisticImageAsset || mongoose.model<IRealisticImageAsset>('RealisticImageAsset', schema);
