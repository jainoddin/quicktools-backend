import mongoose, { Schema } from 'mongoose';

export interface IPromptGenerationRun {
  runId: string;
  category: string;
  requestedCount: number;
  generatedCount: number;
  savedCount: number;
  duplicateCount: number;
  failedCount: number;
  model: string;
  status: 'running' | 'success' | 'partial_success' | 'failed' | 'skipped_lock';
  error?: string;
  startedAt: Date;
  finishedAt?: Date;
}

const PromptGenerationRunSchema = new Schema<IPromptGenerationRun>(
  {
    runId: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    requestedCount: { type: Number, required: true, default: 5 },
    generatedCount: { type: Number, default: 0 },
    savedCount: { type: Number, default: 0 },
    duplicateCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    model: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['running', 'success', 'partial_success', 'failed', 'skipped_lock'], 
      default: 'running' 
    },
    error: { type: String },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date },
  },
  { timestamps: true }
);

PromptGenerationRunSchema.index({ startedAt: -1 });

export const PromptGenerationRun = mongoose.models.PromptGenerationRun || mongoose.model<IPromptGenerationRun>('PromptGenerationRun', PromptGenerationRunSchema);
