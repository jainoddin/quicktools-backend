import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { connectDB } from '../config/db';
import { Blog } from '../models/Blog';
import { Article } from '../models/Article';
import { News } from '../models/News';
import { uploadToR2, verifyR2Object } from '../services/r2.service';

const covers = [
  { model: Blog, slug: 'claude-ai-system-prompts-how-to-engineer-precision-workflows-in-2026', file: 'claude-workflows-realistic.png', folder: 'blog_covers', field: 'coverImage' },
  { model: News, slug: 'aws-partners-with-superblocks-for-secure-vibe-coding', file: 'aws-secure-cloud-realistic.png', folder: 'news_covers', field: 'heroImage' },
  { model: Article, slug: 'ai-localization-tools-scaling-global-content-in-2026', file: 'localization-realistic.png', folder: 'article_covers', field: 'coverImage' },
] as const;

async function main() {
  await connectDB();
  for (const cover of covers) {
    const source = fs.readFileSync(path.join(process.cwd(), 'generated-covers', cover.file));
    const jpeg = await sharp(source).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 91, chromaSubsampling: '4:4:4' }).toBuffer();
    const url = await uploadToR2(jpeg, 'image/jpeg', `${cover.slug}-realistic.jpg`, cover.folder);
    await verifyR2Object(url);
    const updated = await (cover.model as any).findOneAndUpdate({ slug: cover.slug }, { $set: { [cover.field]: url } }, { new: true });
    if (!updated) throw new Error(`Content not found: ${cover.slug}`);
    console.log(`Installed realistic cover: ${cover.slug}`);
  }
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async error => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
