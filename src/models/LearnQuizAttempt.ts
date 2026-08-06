import mongoose, { Schema, Document } from 'mongoose';

export interface ILearnQuizAttempt extends Document {
  userId: mongoose.Types.ObjectId;
  quizId: mongoose.Types.ObjectId;
  score: number;
  totalQuestions: number;
  passed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LearnQuizAttemptSchema = new Schema<ILearnQuizAttempt>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  quizId: { type: Schema.Types.ObjectId, ref: 'LearnQuiz', required: true, index: true },
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  passed: { type: Boolean, required: true }
}, { timestamps: true });

export const LearnQuizAttempt = mongoose.models.LearnQuizAttempt || mongoose.model<ILearnQuizAttempt>('LearnQuizAttempt', LearnQuizAttemptSchema);
