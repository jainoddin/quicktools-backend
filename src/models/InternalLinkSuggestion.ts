import mongoose, { Schema, Document } from 'mongoose';

export interface IInternalLinkSuggestion extends Document {
  sourceContentId: string; // The URL path or ID of the page where the link is suggested
  sourceType: string; // 'Tool', 'Blog', 'Article', 'Learn', 'Community'
  destinationUrl: string; // The URL being linked to
  destinationType: string; // 'Tool', 'Blog', 'Article', etc.
  anchorText: string;
  relevanceScore: number;
  blockId: string; // Element ID or block reference in markdown where the link belongs
  status: 'suggested' | 'approved' | 'inserted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const InternalLinkSuggestionSchema: Schema = new Schema({
  sourceContentId: { type: String, required: true },
  sourceType: { type: String, required: true },
  destinationUrl: { type: String, required: true },
  destinationType: { type: String, required: true },
  anchorText: { type: String, required: true },
  relevanceScore: { type: Number, required: true },
  blockId: { type: String, required: true },
  status: { type: String, enum: ['suggested', 'approved', 'inserted', 'rejected'], default: 'suggested' },
}, { timestamps: true });

// Ensure we don't spam the exact same target URL from the same source
InternalLinkSuggestionSchema.index({ sourceContentId: 1, destinationUrl: 1 }, { unique: true });

export default mongoose.models.InternalLinkSuggestion || mongoose.model<IInternalLinkSuggestion>('InternalLinkSuggestion', InternalLinkSuggestionSchema);
