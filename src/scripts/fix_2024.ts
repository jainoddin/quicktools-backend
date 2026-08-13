import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Setup models
const blogSchema = new mongoose.Schema({
  title: String,
  slug: String,
  description: String,
  metaTitle: String,
  metaDescription: String,
  content: String
}, { strict: false });

const Blog = mongoose.models.Blog || mongoose.model('Blog', blogSchema);

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Find blogs that contain '2024'
  const blogs = await Blog.find({
    $or: [
      { title: { $regex: '2024', $options: 'i' } },
      { metaTitle: { $regex: '2024', $options: 'i' } },
      { description: { $regex: '2024', $options: 'i' } },
      { metaDescription: { $regex: '2024', $options: 'i' } }
    ]
  });

  console.log(`Found ${blogs.length} blogs with 2024`);

  for (const blog of blogs) {
    console.log(`Updating: ${blog.slug}`);
    
    if (blog.title && blog.title.includes('2024')) {
      blog.title = blog.title.replace(/2024/g, '2026');
    }
    if (blog.metaTitle && blog.metaTitle.includes('2024')) {
      blog.metaTitle = blog.metaTitle.replace(/2024/g, '2026');
    }
    if (blog.description && blog.description.includes('2024')) {
      blog.description = blog.description.replace(/2024/g, '2026');
    }
    if (blog.metaDescription && blog.metaDescription.includes('2024')) {
      blog.metaDescription = blog.metaDescription.replace(/2024/g, '2026');
    }
    if (blog.content && blog.content.includes('2024')) {
      // Be careful with content, maybe it's mentioning past events. 
      // User specifically said "search title 25 Best AI Tools for 2024 ani index ayyindi, page actual heading matram 2026. Title/meta mismatch"
      blog.content = blog.content.replace(/25 Best AI Tools for 2024/g, '25 Best AI Tools for 2026');
      blog.content = blog.content.replace(/in 2024/g, 'in 2026');
      blog.content = blog.content.replace(/for 2024/g, 'for 2026');
    }

    await blog.save();
    console.log(`Saved ${blog.slug}`);
  }

  // Also do it for articles just in case
  const articleSchema = new mongoose.Schema({
    title: String,
    slug: String,
    description: String,
    metaTitle: String,
    metaDescription: String,
    content: String
  }, { strict: false });
  const Article = mongoose.models.Article || mongoose.model('Article', articleSchema);

  const articles = await Article.find({
    $or: [
      { title: { $regex: '2024', $options: 'i' } },
      { metaTitle: { $regex: '2024', $options: 'i' } },
      { description: { $regex: '2024', $options: 'i' } },
      { metaDescription: { $regex: '2024', $options: 'i' } }
    ]
  });

  console.log(`Found ${articles.length} articles with 2024`);

  for (const article of articles) {
    console.log(`Updating: ${article.slug}`);
    
    if (article.title && article.title.includes('2024')) {
      article.title = article.title.replace(/2024/g, '2026');
    }
    if (article.metaTitle && article.metaTitle.includes('2024')) {
      article.metaTitle = article.metaTitle.replace(/2024/g, '2026');
    }
    if (article.description && article.description.includes('2024')) {
      article.description = article.description.replace(/2024/g, '2026');
    }
    if (article.metaDescription && article.metaDescription.includes('2024')) {
      article.metaDescription = article.metaDescription.replace(/2024/g, '2026');
    }
    
    await article.save();
    console.log(`Saved ${article.slug}`);
  }

  console.log('Done');
  process.exit(0);
}

run().catch(console.error);
