import mongoose from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Import the Blog model (adjust path if needed)
import { Blog } from '../models/Blog';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quicktools';

async function generateFAQForContent(title: string, content: string): Promise<any[]> {
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: { temperature: 0.5 }
  });

  const prompt = `You are an expert SEO Content Strategist. 
Read the following blog title and content, and generate 4-6 Frequently Asked Questions (FAQs) that are highly relevant to this content.

Blog Title: ${title}

Content snippet (first 1500 chars): 
${content.substring(0, 1500)}

Return ONLY valid JSON in this exact format:
[
  { "question": "Question 1", "answer": "Answer 1" },
  { "question": "Question 2", "answer": "Answer 2" }
]
No markdown wrapping, no extra text.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Extract JSON array
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    console.error(`Failed to parse JSON for "${title}". Raw text:`, text);
    return [];
  } catch (err) {
    console.error(`Gemini generation failed for "${title}":`, err);
    return [];
  }
}

async function run() {
  console.log('⏳ Connecting to MongoDB...', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected.');

  // Find blogs where FAQ is missing or empty
  const oldBlogs = await Blog.find({ 
    $or: [
      { faq: { $exists: false } },
      { faq: { $size: 0 } }
    ] 
  });

  console.log(`🔍 Found ${oldBlogs.length} blogs that need FAQs.`);

  for (const blog of oldBlogs) {
    console.log(`\n🤖 Generating FAQ for: "${blog.title}"...`);
    const newFaq = await generateFAQForContent(blog.title, blog.content);
    
    if (newFaq && newFaq.length > 0) {
      blog.faq = newFaq;
      await blog.save();
      console.log(`✅ Saved ${newFaq.length} FAQs for "${blog.title}".`);
    } else {
      console.log(`⏭️ Skipped "${blog.title}" (No FAQs generated)`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n🎉 All old blogs updated with FAQs!');
  process.exit(0);
}

run().catch(console.error);
