import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Blog } from './src/models/Blog';
import { News } from './src/models/News';
import { Article } from './src/models/Article';
import { uploadToR2 } from './src/services/r2.service';
import fetch from 'node-fetch';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || '';

async function fetchAndUploadImage(title: string, folder: string): Promise<string | null> {
  try {
    // Generate a seed to ensure a unique image every time, even if script runs again
    const seed = Math.floor(Math.random() * 1000000);
    
    let prompt = '';
    if (folder === 'article_covers') {
      prompt = `A professional, minimalist 3D illustration representing "${title}", featuring abstract AI and technology icons, balanced composition, modern SaaS illustration style similar to Notion, Linear, and Stripe, rounded geometric shapes, soft shadows, subtle gradients using #6D5BD0 and #3B82C4, clean editorial design, wide landscape composition for a blog header, soft studio lighting, ultra-high quality, 8k resolution, no text, no words, no letters, no logos, no watermark, no human faces`;
    } else if (folder === 'news_covers') {
      prompt = `A premium editorial illustration representing the latest AI news about "${title}", modern technology newsroom, futuristic AI concepts, clean magazine cover style, cinematic lighting, digital world map, holographic interfaces, subtle blue and purple gradients, ultra-detailed 3D illustration, wide landscape composition, 8k resolution, no text, no words, no logos, no watermark, no human faces.`;
    } else {
      prompt = `A highly detailed, hyper-realistic cinematic 3D render representing "${title}", featuring futuristic glowing neon holograms, advanced technology interfaces, dark cinematic tech background, Unreal Engine 5 render style, photorealistic, dramatic lighting, ultra-high quality, 8k resolution, no text, no watermark, no logos`;
    }
    
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1200&height=800&nologo=true&seed=${seed}`;
    console.log(`Downloading image for: ${title}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Create a safe original name based on the title
    const safeName = title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30);
    const originalName = `${safeName}.jpg`;
    
    // Upload to R2
    const r2Url = await uploadToR2(buffer, 'image/jpeg', originalName, folder);
    console.log(`Successfully uploaded to R2: ${r2Url}`);
    return r2Url;
  } catch (error) {
    console.error(`Error processing image for "${title}":`, error);
    return null;
  }
}

async function patchImages() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // 1. Process Blogs
    const blogs = await Blog.find({});
    console.log(`Found ${blogs.length} blogs to process...`);
    for (const blog of blogs) {
      // Force update all to use the new awesome prompt
      const newUrl = await fetchAndUploadImage(blog.title, 'blog_covers');
      if (newUrl) {
        blog.coverImage = newUrl;
        await blog.save();
      }
    }

    // 2. Process News
    const newsItems = await News.find({});
    console.log(`Found ${newsItems.length} news items to process...`);
    for (const news of newsItems) {
      const newUrl = await fetchAndUploadImage(news.title, 'news_covers');
      if (newUrl) {
        news.heroImage = newUrl;
        await news.save();
      }
    }

    // 3. Process Articles
    const articles = await Article.find({});
    console.log(`Found ${articles.length} articles to process...`);
    for (const article of articles) {
      const newUrl = await fetchAndUploadImage(article.title, 'article_covers');
      if (newUrl) {
        article.coverImage = newUrl;
        await article.save();
      }
    }

    console.log('Finished patching all images successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

patchImages();
