import mongoose, { Schema, Document } from 'mongoose';

export interface IPrompt extends Document {
  title: string;
  slug: string;
  category: string;
  models: string[];
  prompt: string;
  description: string;
  tags: string[];
  variables: string[];
  // Expanded metadata
  ogImage?: string;
  imageUrl?: string;
  imageAlt?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  exampleInput?: string;
  exampleOutput?: string;
  usageTips?: string;
  sourceType: 'ai_generated' | 'user_submitted' | 'admin_created';
  generatedBy?: string; // e.g. "gemini-1.5-pro"
  qualityScore?: number;
  moderationStatus?: 'pending' | 'approved' | 'flagged';
  publishedAt?: Date;
  currentVersion: number;
  
  // Status and rejection
  status: 'draft' | 'published' | 'rejected';
  rejectionReason?: string; // e.g., duplicate, low_quality, unsafe, irrelevant, malformed
  
  // Anti-duplication metadata
  normalizedTitle: string;
  promptHash: string;
  semanticFingerprint?: string; // Embedding signature or simplified text for similarity checks
  
  // Trending/Stats (Views are session-based conceptually, but tracked as integer here)
  views: number;
  copies: number;
  uses: number;
  favorites: number;
}

const PromptSchema = new Schema<IPrompt>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: true, index: true },
    models: [{ type: String }],
    prompt: { type: String, required: true },
    description: { type: String, required: true },
    tags: [{ type: String }],
    variables: [{ type: String }],
    
    ogImage: { type: String },
    imageUrl: { type: String },
    imageAlt: { type: String },
    difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'Beginner', 'Intermediate', 'Advanced'], default: 'intermediate' },
    exampleInput: { type: String },
    exampleOutput: { type: String },
    usageTips: { type: String },
    sourceType: { type: String, enum: ['ai_generated', 'user_submitted', 'admin_created'], default: 'ai_generated' },
    generatedBy: { type: String },
    qualityScore: { type: Number, default: 0 },
    moderationStatus: { type: String, enum: ['pending', 'approved', 'flagged'], default: 'pending' },
    publishedAt: { type: Date },
    currentVersion: { type: Number, default: 1 },
    
    status: { type: String, enum: ['draft', 'published', 'rejected'], default: 'draft', index: true },
    rejectionReason: { type: String },
    
    normalizedTitle: { type: String, required: true, index: true },
    promptHash: { type: String, required: true, unique: true },
    semanticFingerprint: { type: String },
    
    views: { type: Number, default: 0 },
    copies: { type: Number, default: 0 },
    uses: { type: Number, default: 0 },
    favorites: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Optional: Text index for basic search
PromptSchema.index({ title: 'text', description: 'text', prompt: 'text' });

export const Prompt = mongoose.models.Prompt || mongoose.model<IPrompt>('Prompt', PromptSchema);
