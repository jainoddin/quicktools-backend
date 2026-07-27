import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Article } from './src/models/Article';

dotenv.config();

async function debugLinks() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to MongoDB');

  const toolsData: any[] = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tools_data.json'), 'utf-8'));
  const validSlugs = new Set(toolsData.map((t: any) => t.slug));

  const article = await Article.findOne({ slug: 'essential-ai-tools-for-small-businesses-2026-guide' });
  if (!article) {
    console.log('Article not found');
    process.exit(0);
  }

  // Find ALL markdown links in content
  const allLinks = [...article.content.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)];
  console.log(`\nTotal markdown links in content: ${allLinks.length}`);
  
  const toolLinks = allLinks.filter(m => m[2].includes('/tools/'));
  console.log(`Tool links: ${toolLinks.length}`);
  
  for (const [match, anchor, href] of toolLinks) {
    const slug = href.split('/').pop();
    const valid = slug && validSlugs.has(slug);
    console.log(`  ${valid ? '✅' : '❌'} [${anchor}](${href}) → slug: ${slug}`);
  }

  // Also check all /tools/ occurrences (non-markdown)
  const rawToolRefs = [...article.content.matchAll(/\/tools\/([a-zA-Z0-9-]+)/g)];
  const nonMarkdown = rawToolRefs.filter(m => {
    // Check if this is already inside a markdown link we found
    const pos = article.content.indexOf(m[0]);
    return pos !== -1;
  });
  console.log(`\nAll /tools/ references: ${rawToolRefs.length}`);
  rawToolRefs.forEach(m => {
    const slug = m[1];
    const valid = validSlugs.has(slug);
    console.log(`  ${valid ? '✅' : '❌'} /tools/${slug}`);
  });

  process.exit(0);
}

debugLinks().catch(e => { console.error(e); process.exit(1); });
