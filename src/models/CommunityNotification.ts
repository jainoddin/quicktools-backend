import mongoose, { Schema } from 'mongoose';
const schema = new Schema({ userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, type: { type: String, required: true }, message: { type: String, required: true }, questionSlug: String, read: { type: Boolean, default: false, index: true } }, { timestamps: true });
schema.index({ userId: 1, createdAt: -1 });
export const CommunityNotification = mongoose.models.CommunityNotification || mongoose.model('CommunityNotification', schema);
