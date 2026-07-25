import mongoose from 'mongoose';
import { Blog } from './src/models/Blog';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');

  const blogs = await Blog.find({ title: /2025/ });
  let count = 0;
  for (const b of blogs) {
    b.title = b.title.replace('2025', '2026');
    b.slug = b.slug.replace('2025', '2026');
    await b.save();
    count++;
    console.log(`Updated blog: ${b.title}`);
  }
  
  // also reset views in Blog collection
  const viewsRes = await Blog.updateMany(
    { views: { $ne: '0 views' } },
    { $set: { views: '0 views' } }
  );
  console.log('Blog views reset:', viewsRes.modifiedCount);

  mongoose.disconnect();
}
run();
