import mongoose, { Schema, Document } from 'mongoose';

export interface IIndexNowQueue extends Document {
  url: string;
  contentVersion: string; // e.g. ISO timestamp or hash of content at time of enqueue
  publishedAt?: Date;
  status: 'pending' | 'processing' | 'success' | 'failed';
  retryCount: number;
  lastAttemptedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
}

const IndexNowQueueSchema: Schema = new Schema({
  url: { type: String, required: true },
  contentVersion: { type: String, required: true }, // ISO date or content hash
  publishedAt: { type: Date },
  status: { type: String, enum: ['pending', 'processing', 'success', 'failed'], default: 'pending' },
  retryCount: { type: Number, default: 0 },
  lastAttemptedAt: { type: Date },
  errorMessage: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// url + contentVersion compound unique: same URL can be re-queued when content changes
IndexNowQueueSchema.index({ url: 1, contentVersion: 1 }, { unique: true });

export default mongoose.models.IndexNowQueue || mongoose.model<IIndexNowQueue>('IndexNowQueue', IndexNowQueueSchema);

/**
 * Helper: Enqueue or reset a URL for IndexNow submission.
 * If URL + contentVersion already exists → no-op (already queued).
 * If content changed (new contentVersion) → insert new pending record.
 * Old successful records for the same URL (different version) remain as history.
 */
export async function enqueueIndexNow(url: string, contentVersion: string, publishedAt?: Date) {
  const IndexNowQueue = mongoose.model<IIndexNowQueue>('IndexNowQueue');
  await IndexNowQueue.findOneAndUpdate(
    { url, contentVersion },
    {
      $setOnInsert: {
        url,
        contentVersion,
        publishedAt: publishedAt || new Date(),
        status: 'pending',
        retryCount: 0,
        createdAt: new Date(),
      }
    },
    { upsert: true, new: true }
  );
}
