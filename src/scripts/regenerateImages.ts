import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { Blog } from '../models/Blog';
import { News } from '../models/News';
import { Article } from '../models/Article';
import { attachValidatedImage } from '../services/imageQualityPipeline';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function regenerateImages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB');

    // Set to yesterday's start of day to regenerate images for today and yesterday
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 1);
    cutoffDate.setHours(0, 0, 0, 0);

    const { deleteFromR2 } = await import('../services/r2.service');

    // Find Blogs
    const blogs = await Blog.find({ createdAt: { $gte: cutoffDate } });
    console.log(`Found ${blogs.length} blogs to update...`);
    for (const blog of blogs) {
      console.log(`Regenerating image for Blog: ${blog.title}`);
      const oldImage = blog.coverImage;
      const success = await attachValidatedImage('blog', blog);
      if (success) {
        await blog.save();
        if (oldImage && oldImage !== blog.coverImage) await deleteFromR2(oldImage).catch(console.error);
        console.log(`✅ Updated Blog: ${blog.title}`);
      } else {
        console.log(`❌ Failed to update Blog: ${blog.title}`);
      }
      await sleep(8000); // 8 second delay to avoid 429 Rate Limit
    }

    // Find News
    const newsItems = await News.find({ createdAt: { $gte: cutoffDate } });
    console.log(`Found ${newsItems.length} news items to update...`);
    for (const news of newsItems) {
      console.log(`Regenerating image for News: ${news.title}`);
      const oldImage = news.heroImage;
      const success = await attachValidatedImage('news', news);
      if (success) {
        await news.save();
        if (oldImage && oldImage !== news.heroImage) await deleteFromR2(oldImage).catch(console.error);
        console.log(`✅ Updated News: ${news.title}`);
      } else {
        console.log(`❌ Failed to update News: ${news.title}`);
      }
      await sleep(8000); // 8 second delay to avoid 429 Rate Limit
    }

    // Find Articles
    const articles = await Article.find({ createdAt: { $gte: cutoffDate } });
    console.log(`Found ${articles.length} articles to update...`);
    for (const article of articles) {
      console.log(`Regenerating image for Article: ${article.title}`);
      const oldImage = article.coverImage;
      const success = await attachValidatedImage('article', article);
      if (success) {
        await article.save();
        if (oldImage && oldImage !== article.coverImage) await deleteFromR2(oldImage).catch(console.error);
        console.log(`✅ Updated Article: ${article.title}`);
      } else {
        console.log(`❌ Failed to update Article: ${article.title}`);
      }
      await sleep(8000); // 8 second delay to avoid 429 Rate Limit
    }

    console.log('All done!');
    process.exit(0);
  } catch (error) {
    console.error('Error regenerating images:', error);
    process.exit(1);
  }
}

regenerateImages();
