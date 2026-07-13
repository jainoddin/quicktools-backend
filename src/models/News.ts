import mongoose, { Schema, Document } from 'mongoose';

export interface INews extends Document {
  slug: string;
  title: string;
  isBreaking: boolean;
  summary: string;
  heroImage: string;
  author: {
    name: string;
    avatar: string;
  };
  publishedAt: Date;
  readTime: string;
  
  whatHappened: string;
  whyItMatters: string;
  keyHighlights: string[];
  industryReaction: string;
  quickToolsInsight: string;
  conclusion: string;
  
  relatedSlugs: string[];
  tags: string[];
  category: string;
  
  metaTitle: string;
  metaDescription: string;
}

const NewsSchema = new Schema<INews>(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    isBreaking: { type: Boolean, default: false },
    summary: { type: String, required: true },
    heroImage: { type: String, required: true },
    author: {
      name: { type: String, default: 'QuickTools AI' },
      avatar: { type: String, default: '/icon.svg' },
    },
    publishedAt: { type: Date, default: Date.now },
    readTime: { type: String, required: true },
    
    whatHappened: { type: String, required: true },
    whyItMatters: { type: String, required: true },
    keyHighlights: [{ type: String }],
    industryReaction: { type: String },
    quickToolsInsight: { type: String },
    conclusion: { type: String, required: true },
    
    relatedSlugs: [{ type: String }],
    tags: [{ type: String }],
    category: {
      type: String,
      required: true,
      enum: ['AI News', 'Product Launches', 'Research', 'Funding', 'Partnerships', 'Industry', 'Regulation', 'Other'],
      default: 'AI News'
    },
    
    metaTitle: { type: String, required: true },
    metaDescription: { type: String, required: true },
  },
  { timestamps: true }
);

export const News = mongoose.model<INews>('News', NewsSchema);
