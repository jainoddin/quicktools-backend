import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Blog } from './src/models/Blog';
import { Article } from './src/models/Article';

dotenv.config();

const BAD_BLOG_SLUGS = [
  'mastering-the-ai-logo-generator-the-ultimate-guide-to-instant-branding-in-2026',
  'perplexity-ai-in-2026-the-ultimate-guide-to-the-worlds-leading-answer-engine',
  'the-definitive-guide-to-ai-marketing-tools-in-2026-scale-your-brand-faster',
];

async function fixRemainingInterlinks() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB');

    for (const slug of BAD_BLOG_SLUGS) {
      const blog = await Blog.findOne({ slug });
      if (!blog) {
        console.log(`Blog not found: ${slug}`);
        continue;
      }

      let content = blog.content;
      const before = content;

      // Fix patterns like:
      // [Tool Name](https://quicktools.ai/tool-slug)
      // [Tool Name](https://quicktools.ai/tools/tool-slug)  -- already has /tools/ but wrong domain
      // [Tool Name](quicktools.ai/tool-slug)
      // Markdown links
      content = content.replace(
        /\[([^\]]+)\]\(https?:\/\/quicktools\.ai\/tools\/([a-zA-Z0-9-]+)\)/g,
        '[$1](https://quicktool.space/tools/$2)'
      );
      content = content.replace(
        /\[([^\]]+)\]\(https?:\/\/quicktools\.ai\/([a-zA-Z0-9-]+)\)/g,
        '[$1](https://quicktool.space/tools/$2)'
      );
      content = content.replace(
        /\[([^\]]+)\]\(quicktools\.ai\/tools\/([a-zA-Z0-9-]+)\)/g,
        '[$1](https://quicktool.space/tools/$2)'
      );
      content = content.replace(
        /\[([^\]]+)\]\(quicktools\.ai\/([a-zA-Z0-9-]+)\)/g,
        '[$1](https://quicktool.space/tools/$2)'
      );

      // Also fix plain href or plain text mentions
      content = content.replace(/https?:\/\/quicktools\.ai\/tools\/([a-zA-Z0-9-]+)/g, 'https://quicktool.space/tools/$1');
      content = content.replace(/https?:\/\/quicktools\.ai\/([a-zA-Z0-9-]+)/g, (match, path) => {
        // Don't modify blog/article/news paths
        if (['blog', 'articles', 'news', 'pricing', 'login', 'signup', 'dashboard'].includes(path)) {
          return match;
        }
        return `https://quicktool.space/tools/${path}`;
      });

      if (content !== before) {
        blog.content = content;
        await blog.save();
        console.log(`✅ Fixed blog: ${slug}`);
      } else {
        // Print sample of what quicktools.ai references look like so we can debug
        const matches = content.match(/.{0,40}quicktools\.ai.{0,40}/g);
        if (matches) {
          console.log(`⚠️ Could not fix ${slug}. Remaining patterns:`);
          matches.slice(0, 5).forEach(m => console.log(' ->', m));
        }
      }
    }

    console.log('\nDone!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixRemainingInterlinks();
