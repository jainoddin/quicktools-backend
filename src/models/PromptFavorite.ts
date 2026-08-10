import mongoose, { Schema, Document } from 'mongoose';

export interface IPromptFavorite extends Document {
  userId: mongoose.Types.ObjectId;
  promptId: mongoose.Types.ObjectId;
}

const PromptFavoriteSchema = new Schema<IPromptFavorite>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    promptId: { type: Schema.Types.ObjectId, ref: 'Prompt', required: true },
  },
  { timestamps: true }
);

// Prevent the same user from favoring the same prompt multiple times
PromptFavoriteSchema.index({ userId: 1, promptId: 1 }, { unique: true });

export const PromptFavorite = mongoose.models.PromptFavorite || mongoose.model<IPromptFavorite>('PromptFavorite', PromptFavoriteSchema);
