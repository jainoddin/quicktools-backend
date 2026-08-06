import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Blog } from '../models/Blog';
import { News } from '../models/News';
import { Article } from '../models/Article';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT_URL!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function uploadUrlToR2(url: string, prefix: string): Promise<string> {
  console.log(`Downloading ${url}`);
  const res = await axios.get(url, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(res.data, 'binary');
  const filename = `${prefix}/${uuidv4()}.jpg`;
  
  console.log(`Uploading to R2: ${filename}`);
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: filename,
    Body: buffer,
    ContentType: 'image/jpeg',
  }));

  const newUrl = `${process.env.R2_PUBLIC_URL}/${filename}`;
  console.log(`Uploaded successfully! URL: ${newUrl}`);
  return newUrl;
}

async function fixContent() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quicktools');
    console.log('Connected to MongoDB');

    // URLs to use
    const blogImageUrl = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200'; // Global tech/network for Perplexity
    const newsImageUrl = 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=1200'; // Code/software for Muse Code
    const articleImageUrl = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200'; // Strategy/dashboard

    const blogUrl = await uploadUrlToR2(blogImageUrl, 'blog_covers');
    const blog = await Blog.findOne().sort({ createdAt: -1 });
    if (blog) {
      blog.coverImage = blogUrl;
      await blog.save();
      console.log(`Updated Blog: ${blog.title}`);
    }

    const newsUrl = await uploadUrlToR2(newsImageUrl, 'news_covers');
    const news = await News.findOne({ isBreaking: true }).sort({ createdAt: -1 });
    if (news) {
      news.heroImage = newsUrl;
      await news.save();
      console.log(`Updated News: ${news.title}`);
    }

    const articleUrl = await uploadUrlToR2(articleImageUrl, 'article_covers');
    const article = await Article.findOne().sort({ createdAt: -1 });
    if (article) {
      article.coverImage = articleUrl;
      await article.save();
      console.log(`Updated Article: ${article.title}`);
    }

    console.log('Done!');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

fixContent();
