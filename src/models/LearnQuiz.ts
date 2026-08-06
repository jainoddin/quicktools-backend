import mongoose, { Schema, Document } from 'mongoose';

export interface ILearnQuiz extends Document {
  lessonId: mongoose.Types.ObjectId;
  questions: {
    question: string;
    options: string[];
    correctOptionIndex: number;
    explanation: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const LearnQuizSchema = new Schema<ILearnQuiz>({
  lessonId: { type: Schema.Types.ObjectId, ref: 'LearnLesson', required: true, unique: true, index: true },
  questions: [{
    question: { type: String, required: true },
    options: { type: [String], required: true },
    correctOptionIndex: { type: Number, required: true },
    explanation: { type: String, required: true }
  }]
}, { timestamps: true });

export const LearnQuiz = mongoose.models.LearnQuiz || mongoose.model<ILearnQuiz>('LearnQuiz', LearnQuizSchema);
