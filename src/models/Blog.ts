import mongoose, { Schema, Document } from 'mongoose';

export interface IBlog extends Document {
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  coverImage: string;
  author: {
    name: string;
    avatar: string;
  };
  readTime: string;
  publishedAt: Date;
  featured: boolean;
  tableOfContents: string[];
  whatYoullLearn: string[];
  content: string;
  relatedSlugs: string[];
  metaTitle: string;
  metaDescription: string;
}

const BlogSchema = new Schema<IBlog>(
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
      name: { type: String, default: 'QuickTools AI' },
      avatar: { type: String, default: 'https://pub-68a98c57e70a4a1fa317739dd20098b9.r2.dev/quicktools-bot.png' },
    },
    readTime: { type: String, required: true },
    publishedAt: { type: Date, default: Date.now },
    featured: { type: Boolean, default: false },

    // Slug page specific
    tableOfContents: [{ type: String }],
    whatYoullLearn: [{ type: String }],
    content: { type: String, required: true },
    relatedSlugs: [{ type: String }],

    // SEO
    metaTitle: { type: String, required: true },
    metaDescription: { type: String, required: true },
  },
  { timestamps: true }
);

export const Blog = mongoose.model<IBlog>('Blog', BlogSchema);
