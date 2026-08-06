import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';
import IndexNowQueue from '../models/IndexNowQueue';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const INDEXNOW_HOST = process.env.INDEXNOW_HOST || 'https://quicktool.space';
const INDEXNOW_KEY = process.env.INDEXNOW_KEY;

export async function processIndexNowQueue() {
  if (!INDEXNOW_KEY) {
    console.warn('INDEXNOW_KEY is not set. Skipping IndexNow processing.');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB.');

    // Fetch up to 10,000 URLs that are pending or failed (with retryCount < 3)
    const queueItems = await IndexNowQueue.find({
      $or: [
        { status: 'pending' },
        { status: 'failed', retryCount: { $lt: 3 } }
      ]
    }).limit(10000).exec();

    if (queueItems.length === 0) {
      console.log('No URLs in IndexNow queue.');
      process.exit(0);
    }

    // Extract URLs
    const urlList = queueItems.map(item => item.url);
    const itemIds = queueItems.map(item => item._id);

    // Mark as processing
    await IndexNowQueue.updateMany(
      { _id: { $in: itemIds } },
      { $set: { status: 'processing', lastAttemptedAt: new Date() } }
    );

    // Call IndexNow API
    console.log(`Submitting ${urlList.length} URLs to IndexNow...`);
    const payload = {
      host: INDEXNOW_HOST.replace(/^https?:\/\//, ''),
      key: INDEXNOW_KEY,
      keyLocation: `${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`,
      urlList: urlList
    };

    try {
      const response = await axios.post('https://api.indexnow.org/indexnow', payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000 // 10s timeout
      });

      if (response.status === 200 || response.status === 202) {
        // Success
        await IndexNowQueue.updateMany(
          { _id: { $in: itemIds } },
          { $set: { status: 'success' } }
        );
        console.log('Successfully submitted URLs to IndexNow.');
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Error submitting to IndexNow:', error.message);
      // Mark as failed and increment retry count
      await IndexNowQueue.updateMany(
        { _id: { $in: itemIds } },
        { 
          $set: { status: 'failed', errorMessage: error.message },
          $inc: { retryCount: 1 }
        }
      );
    }

  } catch (error) {
    console.error('Fatal error in processIndexNow:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

if (require.main === module) {
  processIndexNowQueue();
}
