import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quicktools';

async function checkStatus() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    // Check articles created today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const Article = mongoose.models.Article || mongoose.model('Article', new mongoose.Schema({}, { strict: false }));
    const articlesToday = await Article.find({ createdAt: { $gte: startOfDay } });
    console.log(`Articles generated today: ${articlesToday.length}`);
    if (articlesToday.length > 0) {
      console.log('Last article title:', articlesToday[0].title);
    }
    
    // Check cron failures
    const CronFailure = mongoose.models.CronFailure || mongoose.model('CronFailure', new mongoose.Schema({}, { strict: false }));
    const failures = await CronFailure.find({}).sort({ date: -1 }).limit(5);
    console.log('Recent Cron Failures:');
    console.log(JSON.stringify(failures, null, 2));

    // Check cron locks
    const CronLock = mongoose.models.CronLock || mongoose.model('CronLock', new mongoose.Schema({}, { strict: false }));
    const locks = await CronLock.find({});
    console.log('Current Locks:');
    console.log(JSON.stringify(locks, null, 2));

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
checkStatus();
