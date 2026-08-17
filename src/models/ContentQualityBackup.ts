import mongoose, { Schema } from 'mongoose';

const ContentQualityBackupSchema = new Schema({
  migrationId: { type: String, required: true, index: true },
  contentType: { type: String, enum: ['prompt', 'lesson'], required: true },
  contentId: { type: Schema.Types.ObjectId, required: true },
  slug: { type: String, required: true },
  snapshot: { type: Schema.Types.Mixed, required: true },
}, { timestamps: true });

ContentQualityBackupSchema.index({ migrationId: 1, contentType: 1, contentId: 1 }, { unique: true });

export const ContentQualityBackup = mongoose.models.ContentQualityBackup
  || mongoose.model('ContentQualityBackup', ContentQualityBackupSchema);
