import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Article } from './src/models/Article';
import { Blog } from './src/models/Blog';

dotenv.config();

async function checkAllLinks() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to MongoDB');

  const toolsData: any[] = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tools_data.json'), 'utf-8'));
  const validSlugs = new Set(toolsData.map((t: any) => t.slug));

  console.log('\n=== ARTICLES ===');
  const articles = await Article.find({});
  for (const article of articles) {
    // Check internalLinks array
    const badInternal = (article.internalLinks || []).filter((link: any) => {
      const slug = link.path?.split('/').pop();
      return slug && !validSlugs.has(slug);
    });
    if (badInternal.length > 0) {
      console.log(`❌ [${article.slug}] bad internalLinks:`);
      badInternal.forEach((l: any) => console.log(`   - ${l.path} (${l.anchor})`));
    }

    // Check content
    const toolLinksInContent = [...article.content.matchAll(/\[([^\]]+)\]\(([^)]+\/tools\/[^)]+)\)/g)];
    for (const [match, anchor, href] of toolLinksInContent) {
      const slug = href.split('/').pop();
      if (slug && !validSlugs.has(slug)) {
        console.log(`❌ [${article.slug}] bad content link: [${anchor}](${href})`);
      }
    }
  }

  console.log('\n=== BLOGS ===');
  const blogs = await Blog.find({});
  for (const blog of blogs) {
    const toolLinksInContent = [...blog.content.matchAll(/\[([^\]]+)\]\(([^)]+\/tools\/[^)]+)\)/g)];
    for (const [match, anchor, href] of toolLinksInContent) {
      const slug = href.split('/').pop();
      if (slug && !validSlugs.has(slug)) {
        console.log(`❌ [${blog.slug}] bad content link: [${anchor}](${href})`);
      }
    }
  }

  console.log('\n✅ Scan complete!');
  process.exit(0);
}

checkAllLinks().catch(e => { console.error(e); process.exit(1); });
