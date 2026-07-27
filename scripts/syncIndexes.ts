import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function sync() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected to MongoDB.");
  
  const CronLock = mongoose.model('CronLock', new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now, expires: 300 }
  }));

  try {
    await CronLock.syncIndexes();
    console.log("Indexes synced perfectly.");
    const indexes = await CronLock.collection.indexes();
    console.log("Current Indexes:", indexes);
  } catch (e: any) {
    console.log("Sync error:", e.message);
  }
  
  await mongoose.disconnect();
}
sync().catch(console.error);
