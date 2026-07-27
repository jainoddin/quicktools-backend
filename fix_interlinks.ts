import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Blog } from './src/models/Blog';
import { Article } from './src/models/Article';

dotenv.config();

async function fixInterlinks() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB');

    const blogs = await Blog.find({});
    let blogsUpdated = 0;
    
    for (const blog of blogs) {
      let updated = false;
      let newContent = blog.content;

      // Replace incorrect tool links: e.g. https://quicktools.ai/slug or quicktools.ai/slug
      // where slug is not blog, articles, or news
      const regex = /(?:https?:\/\/)?quicktools\.ai\/(?!blog|articles|news)([a-zA-Z0-9-]+)/g;
      
      if (regex.test(newContent)) {
        newContent = newContent.replace(regex, 'https://quicktool.space/tools/$1');
        updated = true;
      }
      
      // Also, Gemini might have generated markdown like: [AI Writer](undefined)
      // If so, we can't easily guess the slug without tool names. But let's check if there are any.
      if (newContent.includes('(undefined)')) {
          console.log(`Blog ${blog.slug} has (undefined) links`);
      }

      if (updated) {
        blog.content = newContent;
        await blog.save();
        blogsUpdated++;
      }
    }
    
    console.log(`Updated ${blogsUpdated} blogs.`);

    const articles = await Article.find({});
    let articlesUpdated = 0;

    for (const article of articles) {
      let updated = false;
      let newContent = article.content;

      const regex = /(?:https?:\/\/)?quicktools\.ai\/(?!blog|articles|news)([a-zA-Z0-9-]+)/g;
      if (regex.test(newContent)) {
        newContent = newContent.replace(regex, 'https://quicktool.space/tools/$1');
        updated = true;
      }

      if (updated) {
        article.content = newContent;
      }

      if (article.internalLinks && article.internalLinks.length > 0) {
        article.internalLinks.forEach((link: any) => {
           if (link.path && !link.path.startsWith('/tools/')) {
               // if it's like /ai-writer or https://quicktools.ai/ai-writer
               const pathParts = link.path.split('/');
               const slug = pathParts[pathParts.length - 1];
               if (slug && slug !== 'blog' && slug !== 'articles' && slug !== 'news') {
                   link.path = `/tools/${slug}`;
                   updated = true;
               }
           }
        });
      }

      if (updated) {
        await article.save();
        articlesUpdated++;
      }
    }

    console.log(`Updated ${articlesUpdated} articles.`);

    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixInterlinks();
