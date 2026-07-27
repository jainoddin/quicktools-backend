import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected to MongoDB.");
  
  const CronLock = mongoose.model('CronLock', new mongoose.Schema({
    key: { type: String },
    createdAt: { type: Date, default: Date.now }
  }));

  const locks = await CronLock.find({});
  console.log("Locks:", locks);
  
  const indexes = await CronLock.collection.indexes().catch(e => console.error("Index error:", e.message));
  if (indexes) {
    console.log("Indexes:", indexes);
  }
  
  await CronLock.deleteMany({});
  console.log("Cleared all locks!");
  
  await mongoose.disconnect();
}
check().catch(console.error);
