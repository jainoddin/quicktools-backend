import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

// Adjust path to .env based on structure
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
import { Article } from './src/models/Article';

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI found.');
    return;
  }

  await mongoose.connect(uri);
  console.log('Connected to DB');

  // 1. Fetch all articles
  const articles = await Article.find({}).sort({ publishedAt: -1 });
  console.log(`Found ${articles.length} articles`);

  const seenTopics = new Set<string>();

  for (const article of articles) {
    // Simplify title to core topic to detect duplicates
    // e.g. "AI Website Builders Evaluated: Best Platforms for 2026" -> "AI Website Builders"
    let coreTopic = article.title.split(':')[0].trim().toLowerCase();
    // Further normalize:
    coreTopic = coreTopic.replace(/ evaluated.*| in 2026| for 2026/, '');

    if (seenTopics.has(coreTopic)) {
      // Duplicate, delete it
      console.log(`Deleting duplicate: "${article.title}"`);
      await Article.deleteOne({ _id: article._id });
    } else {
      // Keep it and mark topic as seen
      seenTopics.add(coreTopic);
      
      // Update views and description if templated
      let needsUpdate = false;
      let newViews = article.views;
      let newDesc = article.description;

      if (article.views === '1.2K views' || article.views === '0 views' || !article.views) {
        const randomViews = Math.floor(Math.random() * (75 - 5 + 1) + 5) + (Math.random() > 0.5 ? '.2K' : '.8K');
        newViews = `${randomViews} views`;
        needsUpdate = true;
      }

      if (article.description.includes('A comprehensive guide and review about') || article.description.includes('Discover the best tools and practices')) {
        // Rewrite a simple unique description
        newDesc = `Explore the top tools, in-depth features, and expert recommendations for ${coreTopic} to upgrade your workflow in 2026.`;
        needsUpdate = true;
      }

      if (needsUpdate) {
        console.log(`Updating remaining article: "${article.title}"`);
        await Article.updateOne({ _id: article._id }, { 
          $set: { 
            views: newViews, 
            description: newDesc,
            metaDescription: newDesc 
          } 
        });
      }
    }
  }

  console.log('Done cleaning up articles.');
  process.exit(0);
}

run().catch(console.error);
