import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Blog } from './src/models/Blog';
import { Article } from './src/models/Article';

dotenv.config();

async function fixAll() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to MongoDB');

  const toolsData: any[] = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tools_data.json'), 'utf-8'));
  const validSlugs = new Set(toolsData.map((t: any) => t.slug));
  const BRAND_AVATAR = 'https://pub-68a98c57e70a4a1fa317739dd20098b9.r2.dev/1b9be0e4-c385-49a5-b0b5-ef158e8ef402.png';
  console.log(`Valid tool slugs: ${validSlugs.size}`);

  function stripInvalidToolLinks(content: string): { result: string; count: number } {
    let count = 0;
    // Full URL absolute
    let result = content.replace(
      /\[([^\]]+)\]\(https?:\/\/quicktool\.space\/tools\/([a-zA-Z0-9-]+)\)/g,
      (match, anchor, slug) => { if (!validSlugs.has(slug)) { count++; return anchor; } return match; }
    );
    // Relative URL /tools/
    result = result.replace(
      /\[([^\]]+)\]\(\/tools\/([a-zA-Z0-9-]+)\)/g,
      (match, anchor, slug) => { if (!validSlugs.has(slug)) { count++; return anchor; } return match; }
    );
    // Any remaining quicktool.space tool paths in plain text
    result = result.replace(
      /https?:\/\/quicktool\.space\/tools\/([a-zA-Z0-9-]+)/g,
      (match, slug) => { if (!validSlugs.has(slug)) { count++; return 'https://quicktool.space/tools'; } return match; }
    );
    return { result, count };
  }

  // Fix Blogs
  const blogs = await Blog.find({});
  let blogsFixed = 0;
  for (const blog of blogs) {
    const { result, count } = stripInvalidToolLinks(blog.content);
    if (count > 0) {
      blog.content = result;
      await blog.save();
      blogsFixed++;
      console.log(`✅ Blog [${blog.slug}]: removed ${count} invalid links`);
    }
  }

  // Fix Articles
  const articles = await Article.find({});
  let articlesFixed = 0;
  for (const article of articles) {
    let changed = false;

    const { result, count } = stripInvalidToolLinks(article.content);
    if (count > 0) {
      article.content = result;
      changed = true;
      console.log(`✅ Article [${article.slug}]: removed ${count} invalid links`);
    }

    // Fix internalLinks array
    if (article.internalLinks && article.internalLinks.length > 0) {
      const before = article.internalLinks.length;
      article.internalLinks = article.internalLinks.filter((link: any) => {
        const slug = link.path?.split('/').pop();
        return slug && validSlugs.has(slug);
      });
      if (article.internalLinks.length !== before) {
        changed = true;
        console.log(`✅ Article [${article.slug}]: removed ${before - article.internalLinks.length} invalid internalLinks`);
      }
    }

    // Fix avatar
    if (article.author?.avatar?.includes('ui-avatars.com') || !article.author?.avatar) {
      article.author = { ...article.author, avatar: BRAND_AVATAR };
      changed = true;
      console.log(`✅ Article [${article.slug}]: fixed avatar`);
    }

    if (changed) {
      await article.save();
      articlesFixed++;
    }
  }

  console.log(`\n🎉 Done! Fixed ${blogsFixed} blogs, ${articlesFixed} articles.`);
  process.exit(0);
}

fixAll().catch(e => { console.error(e); process.exit(1); });
