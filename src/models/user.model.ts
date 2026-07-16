import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  googleId?: string | null;
  githubId?: string | null;
  email: string;
  name: string;
  avatar: string;
  role: string;
  savedTools: string[];
  savedBlogs: string[];
  savedArticles: string[];
  savedNews: string[];
  favoriteImages: any[];
  credits: number;
  plan: string;
  bio?: string;
  customAvatar?: boolean;
  /** When set, account is deactivated. Login within 15 days reactivates; after 15 days it is permanently deleted. */
  deactivatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    // sparse: allow Google-only or GitHub-only accounts (null/missing ok)
    googleId: { type: String, unique: true, sparse: true },
    githubId: { type: String, unique: true, sparse: true },
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    avatar: { type: String, required: true },
    role: { type: String, default: 'user', enum: ['user', 'admin'] },
    savedTools: { type: [String], default: [] },
    savedBlogs: { type: [String], default: [] },
    savedArticles: { type: [String], default: [] },
    savedNews: { type: [String], default: [] },
    favoriteImages: { type: [Object], default: [] },
    credits: { type: Number, default: 15 },
    plan: { type: String, default: 'free', enum: ['free', 'starter', 'pro', 'business'] },
    bio: { type: String, default: '' },
    customAvatar: { type: Boolean, default: false },
    deactivatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
