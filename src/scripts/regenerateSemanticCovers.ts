import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { Blog } from '../models/Blog';
import { Article } from '../models/Article';
import { News } from '../models/News';
import { generateImageWithQualityGate } from '../services/imageQualityPipeline';

async function replaceCover(kind: 'blog' | 'article' | 'news', slug: string) {
  const Model: any = kind === 'blog' ? Blog : kind === 'article' ? Article : News;
  const document: any = await Model.findOne({ slug });
  if (!document) throw new Error(`${kind} not found: ${slug}`);
  const result = await generateImageWithQualityGate({
    contentId: `${slug}-semantic-v2`, kind,
    category: String(document.category || ''), topic: String(document.title),
    folder: kind === 'blog' ? 'blog_covers' : kind === 'article' ? 'article_covers' : 'news_covers',
  });
  if (!result) throw new Error(`Semantic image gate failed: ${slug}`);
  if (kind === 'news') document.heroImage = result.url;
  else document.coverImage = result.url;
  document.imageStyleFamily = result.family;
  await document.save();
  console.log(`Updated ${kind}: ${slug}`);
}

async function main() {
  await connectDB();
  const [kindArg, slugArg] = process.argv.slice(2);
  if (kindArg && slugArg) {
    if (!['blog', 'article', 'news'].includes(kindArg)) throw new Error(`Invalid content type: ${kindArg}`);
    await replaceCover(kindArg as 'blog' | 'article' | 'news', slugArg);
  } else {
    const latestBlog: any = await Blog.findOne({}).sort({ publishedAt: -1 }).select('slug');
    if (!latestBlog) throw new Error('No published blog found');
    await replaceCover('blog', latestBlog.slug);
  }
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async error => {
  console.error(error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
