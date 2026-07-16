import 'dotenv/config';
import mongoose from 'mongoose';
import { Blog } from '../models/Blog';
import { Article } from '../models/Article';
import { News } from '../models/News';

async function checkToday() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const blogs = await Blog.find({ publishedAt: { $gte: start } }, 'title publishedAt _id').lean();
  const articles = await Article.find({ publishedAt: { $gte: start } }, 'title publishedAt _id').lean();
  const news = await News.find({ publishedAt: { $gte: start } }, 'title publishedAt _id').lean();

  console.log('BLOGS today:', blogs.length);
  blogs.forEach((b: any) => console.log(' - BLOG:', b._id, '|', b.title));

  console.log('ARTICLES today:', articles.length);
  articles.forEach((a: any) => console.log(' - ARTICLE:', a._id, '|', a.title));

  console.log('NEWS today:', news.length);
  news.forEach((n: any) => console.log(' - NEWS:', n._id, '|', n.title));

  mongoose.connection.close();
}

checkToday();
