import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Blog } from './src/models/Blog';
import { Article } from './src/models/Article';

dotenv.config();

async function verifyInterlinks() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB');

    const blogs = await Blog.find({});
    let badBlogsCount = 0;
    
    for (const blog of blogs) {
      if (blog.content.includes('quicktools.ai')) {
          console.log(`[Blog: ${blog.slug}] still has 'quicktools.ai' in content!`);
          badBlogsCount++;
      }
      if (blog.content.includes('(undefined)')) {
          console.log(`[Blog: ${blog.slug}] has '(undefined)' link!`);
      }
    }

    const articles = await Article.find({});
    let badArticlesCount = 0;
    
    for (const article of articles) {
      if (article.content.includes('quicktools.ai')) {
          console.log(`[Article: ${article.slug}] still has 'quicktools.ai' in content!`);
          badArticlesCount++;
      }
      if (article.internalLinks && article.internalLinks.length > 0) {
        article.internalLinks.forEach((link: any) => {
           if (link.path && link.path.includes('quicktools.ai')) {
               console.log(`[Article: ${article.slug}] internalLink has quicktools.ai: ${link.path}`);
               badArticlesCount++;
           }
        });
      }
    }

    console.log(`Remaining issues -> Blogs: ${badBlogsCount}, Articles: ${badArticlesCount}`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verifyInterlinks();
