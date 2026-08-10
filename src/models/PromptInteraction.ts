import mongoose, { Document, Schema } from 'mongoose';

export interface IPromptInteraction extends Document {
  userId: mongoose.Types.ObjectId;
  promptId: mongoose.Types.ObjectId;
  action: 'view' | 'copy';
}

const PromptInteractionSchema = new Schema<IPromptInteraction>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  promptId: { type: Schema.Types.ObjectId, ref: 'Prompt', required: true },
  action: { type: String, enum: ['view', 'copy'], required: true },
}, { timestamps: true });

PromptInteractionSchema.index({ userId: 1, promptId: 1, action: 1 }, { unique: true });

export const PromptInteraction = mongoose.models.PromptInteraction || mongoose.model<IPromptInteraction>('PromptInteraction', PromptInteractionSchema);
