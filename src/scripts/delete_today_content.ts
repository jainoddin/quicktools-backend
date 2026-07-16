import 'dotenv/config';
import mongoose from 'mongoose';
import { Article } from '../models/Article';
import { News } from '../models/News';

async function deleteToday() {
  await mongoose.connect(process.env.MONGODB_URI!);
  
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const deletedArticles = await Article.deleteMany({ publishedAt: { $gte: start } });
  console.log(`🗑️ Deleted Articles today: ${deletedArticles.deletedCount}`);

  const deletedNews = await News.deleteMany({ publishedAt: { $gte: start } });
  console.log(`🗑️ Deleted News today: ${deletedNews.deletedCount}`);

  console.log('✅ Done! Cron will auto-generate at correct times.');
  mongoose.connection.close();
}

deleteToday();
