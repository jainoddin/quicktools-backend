import mongoose, { Schema, Document } from 'mongoose';

export interface ILearnBookmark extends Document {
  userId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LearnBookmarkSchema = new Schema<ILearnBookmark>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  lessonId: { type: Schema.Types.ObjectId, ref: 'LearnLesson', required: true, index: true },
}, { timestamps: true });

LearnBookmarkSchema.index({ userId: 1, lessonId: 1 }, { unique: true });

export const LearnBookmark = mongoose.models.LearnBookmark || mongoose.model<ILearnBookmark>('LearnBookmark', LearnBookmarkSchema);
