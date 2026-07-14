import 'dotenv/config';
import mongoose from 'mongoose';
import { generateBlog } from '../services/gemini.service';
import { Blog } from '../models/Blog';

async function run() {
  try {
    console.log("Connecting to DB...");
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("Generating blog...");
    const blogData = await generateBlog();
    
    // Check if slug already exists
    const existing = await Blog.findOne({ slug: blogData.slug });
    if (existing) {
      blogData.slug = `${blogData.slug}-${Date.now()}`;
    }

    const blog = new Blog(blogData);
    await blog.save();
    console.log("✅ Blog saved locally:", blog.title);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

run();
