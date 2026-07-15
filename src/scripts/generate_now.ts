import 'dotenv/config';
import { connectDB } from '../config/db';
import { generateBlog } from '../services/gemini.service';
import { Blog } from '../models/Blog';
import mongoose from 'mongoose';

async function run() {
  await connectDB();
  console.log('Generating blog now...');
  try {
    const blogData = await generateBlog();
    const existing = await Blog.findOne({ slug: blogData.slug });
    if (existing) {
      blogData.slug = `${blogData.slug}-${Date.now()}`;
    }
    const blog = new Blog(blogData);
    await blog.save();
    console.log(`✅ Successfully generated and saved blog: "${blog.title}"`);
  } catch (err) {
    console.error('Failed:', err);
  } finally {
    mongoose.connection.close();
  }
}

run();
