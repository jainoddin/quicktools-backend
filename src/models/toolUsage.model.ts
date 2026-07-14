import mongoose, { Document, Schema } from 'mongoose';

export interface IToolUsage extends Document {
  userId: mongoose.Types.ObjectId;
  toolSlug: string;
  toolName: string;
  prompt: string;
  result: string;
  creditsUsed: number;
  isStarred?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ToolUsageSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toolSlug: { type: String, required: true },
    toolName: { type: String, required: true },
    prompt: { type: String, required: true },
    result: { type: String },
    creditsUsed: { type: Number, required: true, default: 1 },
    isStarred: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const ToolUsage = mongoose.model<IToolUsage>('ToolUsage', ToolUsageSchema);
