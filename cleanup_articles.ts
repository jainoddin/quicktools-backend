import mongoose from 'mongoose';
import { Article } from './src/models/Article';
import { News } from './src/models/News';
import { Blog } from './src/models/Blog';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB for Article/Views Cleanup');

  // 1. Reset all views in Article and News to '0 views'
  const articleViewsResult = await Article.updateMany(
    { views: { $ne: '0 views' } },
    { $set: { views: '0 views' } }
  );
  console.log('Articles views reset:', articleViewsResult.modifiedCount);

  const newsViewsResult = await News.updateMany(
    { views: { $ne: '0 views' } },
    { $set: { views: '0 views' } }
  );
  console.log('News views reset:', newsViewsResult.modifiedCount);

  // 2. Remove Duplicate Articles based on keywords
  const articles = await Article.find({});
  let deletedCount = 0;
  
  const keywordsToCheck = [
    'website builder',
    'voice generator',
    'image generator',
    'resume builder',
    'video generator'
  ];

  const keywordCounts: Record<string, any[]> = {};
  for (const k of keywordsToCheck) {
    keywordCounts[k] = [];
  }

  for (const item of articles) {
    const title = item.title.toLowerCase();
    for (const k of keywordsToCheck) {
      if (title.includes(k)) {
        keywordCounts[k].push(item);
        break; // only match one keyword
      }
    }
  }

  // Delete duplicates keeping only the most recent one (highest date or just the first one sorted by date)
  for (const key in keywordCounts) {
    const items = keywordCounts[key];
    if (items.length > 1) {
      // Sort by publishedAt descending (newest first)
      items.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
      
      // Keep items[0], delete the rest
      for (let i = 1; i < items.length; i++) {
        console.log(`Deleting duplicate Article [${key}]:`, items[i].title);
        await Article.findByIdAndDelete(items[i]._id);
        deletedCount++;
      }
    }
  }

  console.log('Total duplicate articles deleted:', deletedCount);

  // 3. (Optional but requested) Find and delete/update templated descriptions
  // Templated desc pattern: "A comprehensive guide and review about"
  const templatedArticles = await Article.find({ description: /A comprehensive guide and review about/i });
  console.log(`Found ${templatedArticles.length} articles with templated descriptions.`);
  for(const item of templatedArticles) {
    console.log(`Deleting templated article: ${item.title}`);
    await Article.findByIdAndDelete(item._id);
    // Alternatively we could regenerate them, but deleting is safer, it will regenerate tonight natively!
  }

  mongoose.disconnect();
}
run();
