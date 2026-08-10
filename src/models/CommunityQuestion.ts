import mongoose, { Schema, Document } from 'mongoose';

const ActorSchema = new Schema({ userId: { type: Schema.Types.ObjectId, ref: 'User' }, guestId: String }, { _id: false });
const AuthorSchema = new Schema({ userId: { type: Schema.Types.ObjectId, ref: 'User' }, name: { type: String, required: true }, avatar: String, isGuest: { type: Boolean, default: false }, isAiAssisted: { type: Boolean, default: false } }, { _id: false });
const ReplySchema = new Schema({
  body: { type: String, required: true, maxlength: 12000 }, author: { type: AuthorSchema, required: true }, guestSecretHash: String,
  likedBy: { type: [ActorSchema], default: [] }, status: { type: String, enum: ['visible','pending','hidden'], default: 'visible' },
}, { timestamps: true });

const AnswerSchema = new Schema({
  body: { type: String, required: true, maxlength: 12000 }, author: { type: AuthorSchema, required: true }, guestSecretHash: String,
  likedBy: { type: [ActorSchema], default: [] }, isAccepted: { type: Boolean, default: false }, reports: { type: Number, default: 0 }, status: { type: String, enum: ['visible','pending','hidden'], default: 'visible' },
  replies: { type: [ReplySchema], default: [] }
}, { timestamps: true });

export interface ICommunityQuestion extends Document { slug: string; title: string; body: string; excerpt: string; category: string; tags: string[]; author: any; guestSecretHash?: string; likedBy: any[]; savedBy: any[]; answers: any[]; views: number; viewedBy: string[]; reports: number; status: string; createdAt: Date; updatedAt: Date; }
const QuestionSchema = new Schema<any>({
  slug: { type: String, required: true, unique: true, index: true }, title: { type: String, required: true, minlength: 12, maxlength: 180, index: 'text' },
  body: { type: String, required: true, minlength: 30, maxlength: 20000 }, excerpt: { type: String, required: true, maxlength: 300 },
  category: { type: String, required: true, index: true }, tags: { type: [String], default: [] }, author: { type: AuthorSchema, required: true }, guestSecretHash: String,
  likedBy: { type: [ActorSchema], default: [] }, savedBy: { type: [ActorSchema], default: [] }, answers: { type: [AnswerSchema], default: [] },
  views: { type: Number, default: 0 }, viewedBy: { type: [String], default: [] }, reports: { type: Number, default: 0 }, status: { type: String, enum: ['visible','pending','hidden'], default: 'visible', index: true },
}, { timestamps: true });
QuestionSchema.index({ title: 'text', body: 'text', tags: 'text' });
QuestionSchema.index({ createdAt: -1, category: 1 });
export const CommunityQuestion = mongoose.models.CommunityQuestion || mongoose.model<ICommunityQuestion>('CommunityQuestion', QuestionSchema);
