import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected to MongoDB.");
  
  const CronLock = mongoose.model('CronLock', new mongoose.Schema({
    key: { type: String },
    createdAt: { type: Date, default: Date.now }
  }));

  try {
    await CronLock.collection.dropIndex('createdAt_1');
    console.log("Dropped incorrect TTL index.");
  } catch (e: any) {
    console.log("Index might not exist or error:", e.message);
  }
  
  await CronLock.deleteMany({});
  console.log("Cleared all locks!");
  
  await mongoose.disconnect();
}
fix().catch(console.error);
