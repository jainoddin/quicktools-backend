import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Blog } from './src/models/Blog';

dotenv.config();

const BAD_BLOG_SLUGS = [
  'mastering-the-ai-logo-generator-the-ultimate-guide-to-instant-branding-in-2026',
  'perplexity-ai-in-2026-the-ultimate-guide-to-the-worlds-leading-answer-engine',
  'the-definitive-guide-to-ai-marketing-tools-in-2026-scale-your-brand-faster',
];

// Known tool slugs with anchor-to-slug mapping
const TOOL_SLUG_GUESSES: Record<string, string> = {
  'ai competitor analysis': 'ai-competitor-analysis',
  'ai seo topical map builder': 'ai-seo-meta-generator',
  'ai employee performance review': 'ai-review-responder',
  'ai cover letter generator': 'ai-cover-letter',
  'ai cover letter': 'ai-cover-letter',
  'json formatter': 'ai-code-generator',
  'json formatter & validator': 'ai-code-generator',
};

async function fixHomepageLinks() {
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

      // Fix pattern: [ANCHOR_TEXT](https://quicktools.ai) where anchor text hints at a tool
      content = content.replace(
        /\[([^\]]+)\]\(https?:\/\/quicktools\.ai\)/g,
        (match, anchor) => {
          const key = anchor.toLowerCase().trim();
          // Check if it's a brand mention (QuickTools.ai, QuickTools AI, etc.)
          if (key === 'quicktools.ai' || key === 'quicktools ai' || key === 'quicktool.space') {
            // Replace brand link with quicktool.space homepage
            return `[${anchor}](https://quicktool.space)`;
          }
          // Try to match to a known tool slug
          const toolSlug = TOOL_SLUG_GUESSES[key];
          if (toolSlug) {
            return `[${anchor}](https://quicktool.space/tools/${toolSlug})`;
          }
          // Generate a slug from anchor text as best guess
          const guessSlug = anchor.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
          return `[${anchor}](https://quicktool.space/tools/${guessSlug})`;
        }
      );

      // Fix remaining bare https://quicktools.ai references (not in markdown link)
      content = content.replace(/https?:\/\/quicktools\.ai(?!\/[a-zA-Z])/g, 'https://quicktool.space');

      await blog.save();
      // Force update
      await Blog.findOneAndUpdate({ slug }, { content }, { new: true });
      console.log(`✅ Fixed blog: ${slug}`);
    }

    console.log('\nDone!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixHomepageLinks();
