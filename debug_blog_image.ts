import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Blog } from './src/models/Blog';

dotenv.config();

async function checkBlogImage() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to MongoDB');

  const blog = await Blog.findOne({ slug: 'the-ultimate-guide-to-ai-image-generators-in-2026-transform-text-into-high-impact-visuals' });
  if (!blog) {
    console.log('Blog not found');
    process.exit(0);
  }

  // Find all image tags in the markdown content
  const images = [...blog.content.matchAll(/!\[([^\]]*)\]\(([^)]*)\)/g)];
  console.log(`\nFound ${images.length} images in content:`);
  
  images.forEach((m, i) => {
    console.log(`\nImage ${i+1}:`);
    console.log(`Alt: ${m[1]}`);
    console.log(`URL: ${m[2]}`);
  });

  // Print raw lines containing the prompt text that failed
  const lines = blog.content.split('\n');
  const badLines = lines.filter(l => l.includes('Prompt engineering workflow'));
  console.log('\nLines with "Prompt engineering workflow":');
  badLines.forEach(l => console.log(l));

  process.exit(0);
}

checkBlogImage().catch(e => { console.error(e); process.exit(1); });
