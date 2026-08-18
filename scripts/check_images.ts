import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../src/models/user.model';
import { ToolUsage } from '../src/models/toolUsage.model';

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB');
    
    const user = await User.findOne({ avatar: { $regex: 'r2.dev' } }).select('avatar email').lean();
    console.log('Sample User Avatar:', user);

    const usages = await ToolUsage.find({ toolSlug: '/tools/ai-image-generator' }).sort({ createdAt: -1 }).limit(3).select('result createdAt').lean();
    console.log('Sample AI Images:', usages);

  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
