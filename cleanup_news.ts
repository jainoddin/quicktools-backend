import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const db = mongoose.connection.db;
  if (!db) return;
  
  const news = await db.collection('news').find().sort({ createdAt: -1 }).toArray();
  
  const titleCounts: Record<string, any[]> = {};
  for (const n of news) {
    let t = n.title.toLowerCase();
    // fuzzy grouping
    if (t.includes('eu ai act')) t = 'eu ai act';
    if (t.includes('apple intelligence') || t.includes('ios 18')) t = 'apple intelligence';
    if (t.includes('microsoft copilot') || t.includes('office 365')) t = 'microsoft copilot';
    if (t.includes('gemini') && t.includes('context window')) t = 'gemini context';
    if (t.includes('gpt-6')) t = 'gpt-6';
    
    if (!titleCounts[t]) titleCounts[t] = [];
    titleCounts[t].push(n);
  }
  
  for (const [key, items] of Object.entries(titleCounts)) {
    if (items.length > 1) {
      console.log('Duplicate category:', key, 'Count:', items.length);
      // Keep the first one (most recent since we sorted by createdAt -1)
      for (let i = 1; i < items.length; i++) {
        console.log('Deleting duplicate:', items[i]._id, items[i].title);
        await db.collection('news').deleteOne({ _id: items[i]._id });
      }
    }
  }

  // Rename GPT-6
  const gpt6 = news.find(n => n.title.includes('GPT-6'));
  if (gpt6) {
    console.log('Updating GPT-6 to GPT-4o mini:', gpt6._id);
    await db.collection('news').updateOne(
      { _id: gpt6._id },
      { $set: { title: gpt6.title.replace('GPT-6', 'GPT-4o Mini'), slug: gpt6.slug.replace('gpt-6', 'gpt-4o-mini') } }
    );
  }

  // Count categories
  const categories = await db.collection('news').aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]).toArray();
  console.log('Categories:', categories);

  mongoose.disconnect();
}
run();
