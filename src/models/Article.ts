import mongoose, { Schema, Document } from 'mongoose';

export interface IArticle extends Document {
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  coverImage: string;
  author: {
    name: string;
    avatar: string;
    isVerified: boolean;
    bio: string;
  };
  readTime: string;
  publishedAt: Date;
  views: string; // Storing as string e.g. "2.4K views" for easy display, or can be number
  
  // Content Sections
  content: string; // The main markdown content
  tableOfContents: { id: number; title: string; isActive: boolean }[];
  whatYoullLearn: string[];
  
  // Special SEO sections
  prosAndCons: {
    pros: string[];
    cons: string[];
  };
  comparisonTable?: {
    headers: string[];
    rows: string[][];
  };
  faq: { question: string; answer: string }[];
  
  relatedSlugs: string[]; // Links to other articles or tools
  internalLinks: { anchor: string; path: string }[];
  externalLinks: { anchor: string; url: string }[];
  
  // SEO Meta
  metaTitle: string;
  metaDescription: string;
}

const ArticleSchema = new Schema<IArticle>(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: ['AI & Tools', 'Productivity', 'Development', 'Design', 'Marketing', 'Business', 'Tutorials', 'News & Updates'],
    },
    tags: [{ type: String }],
    coverImage: { type: String, required: true },
    author: {
      name: { type: String, default: 'QuickTools AI Team' },
      avatar: { type: String, default: 'https://ui-avatars.com/api/?name=QuickTools+AI&background=6D5EF8&color=fff' },
      isVerified: { type: Boolean, default: true },
      bio: { type: String, default: 'AI enthusiasts and researchers passionate about the future of artificial intelligence and productivity.' },
    },
    readTime: { type: String, required: true },
    publishedAt: { type: Date, default: Date.now },
    views: { type: String, default: '0 views' },

    content: { type: String, required: true },
    tableOfContents: [{
      id: { type: Number },
      title: { type: String },
      isActive: { type: Boolean, default: false }
    }],
    whatYoullLearn: [{ type: String }],

    prosAndCons: {
      pros: [{ type: String }],
      cons: [{ type: String }],
    },

    comparisonTable: {
      headers: [{ type: String }],
      rows: [[{ type: String }]],
    },

    faq: [{ 
      question: { type: String }, 
      answer: { type: String } 
    }],
    
    relatedSlugs: [{ type: String }],

    internalLinks: [{
      anchor: { type: String },
      path: { type: String }
    }],
    externalLinks: [{
      anchor: { type: String },
      url: { type: String }
    }],

    metaTitle: { type: String, required: true },
    metaDescription: { type: String, required: true },
  },
  { timestamps: true }
);

export const Article = mongoose.models.Article || mongoose.model<IArticle>('Article', ArticleSchema);
