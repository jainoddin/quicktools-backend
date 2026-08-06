import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const updateIcons = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quicktools');
    
    const LearnCourse = mongoose.models.LearnCourse || mongoose.model('LearnCourse', new mongoose.Schema({
      slug: String,
      icon: String
    }, { strict: false }));

    const updates = [
      { slug: 'chatgpt', icon: 'https://pub-0a928134dcdc420da2af02e6238ef06b.r2.dev/ChatGPT%20Image%20Aug%206%2C%202026%2C%2001_14_25%20PM.png' },
      { slug: 'claude', icon: 'https://pub-0a928134dcdc420da2af02e6238ef06b.r2.dev/ChatGPT%20Image%20Aug%206%2C%202026%2C%2001_24_40%20PM.png' },
      { slug: 'gemini', icon: 'https://pub-0a928134dcdc420da2af02e6238ef06b.r2.dev/ChatGPT%20Image%20Aug%206%2C%202026%2C%2001_34_48%20PM.png' },
      { slug: 'cursor', icon: 'https://pub-0a928134dcdc420da2af02e6238ef06b.r2.dev/ChatGPT%20Image%20Aug%206%2C%202026%2C%2001_30_12%20PM.png' },
      { slug: 'perplexity', icon: 'https://pub-0a928134dcdc420da2af02e6238ef06b.r2.dev/ChatGPT%20Image%20Aug%206%2C%202026%2C%2002_19_18%20PM.png' },
      { slug: 'prompthub', icon: 'https://pub-0a928134dcdc420da2af02e6238ef06b.r2.dev/ChatGPT%20Image%20Aug%206%2C%202026%2C%2002_27_20%20PM.png' }
    ];

    for (const update of updates) {
      await LearnCourse.updateOne({ slug: update.slug }, { $set: { icon: update.icon } });
      console.log(`Updated icon for ${update.slug}`);
    }

    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

updateIcons();
