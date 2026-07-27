import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;

async function check() {
  await mongoose.connect(uri!);
  console.log('Connected to DB');
  
  const CronLock = mongoose.connection.collection('cronlocks');
  const locks = await CronLock.find({}).toArray();
  console.log('Locks:', locks);
  
  const CronFailure = mongoose.connection.collection('cronfailures');
  const failures = await CronFailure.find({}).toArray();
  console.log('Failures:', failures);
  
  const News = mongoose.connection.collection('news');
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const news = await News.countDocuments({ publishedAt: { $gte: startOfDay } });
  console.log('News generated today:', news);

  mongoose.disconnect();
}
check();
