import mongoose, { Document, Schema } from 'mongoose';

export interface IShortUrl extends Document {
  originalUrl: string;
  shortCode: string;
  clicks: number;
  createdAt: Date;
}

const ShortUrlSchema: Schema = new Schema(
  {
    originalUrl: { type: String, required: true },
    shortCode: { type: String, required: true, unique: true },
    clicks: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const ShortUrl = mongoose.model<IShortUrl>('ShortUrl', ShortUrlSchema);
