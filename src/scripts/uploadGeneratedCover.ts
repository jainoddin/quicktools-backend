import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { connectDB } from '../config/db';
import { Blog } from '../models/Blog';
import { Article } from '../models/Article';
import { News } from '../models/News';
import { uploadToR2, verifyR2Object } from '../services/r2.service';

async function main() {
  const [kind, slug, sourcePath] = process.argv.slice(2);
  if (!kind || !slug || !sourcePath || !['blog', 'article', 'news'].includes(kind)) {
    throw new Error('Usage: uploadGeneratedCover <blog|article|news> <slug> <source-path>');
  }

  await connectDB();
  const Model: any = kind === 'blog' ? Blog : kind === 'article' ? Article : News;
  const document: any = await Model.findOne({ slug });
  if (!document) throw new Error(`${kind} not found: ${slug}`);

  const source = await fs.readFile(path.resolve(sourcePath));
  const cover = await sharp(source)
    .resize(1200, 630, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toBuffer();
  const folder = kind === 'blog' ? 'blog_covers' : kind === 'article' ? 'article_covers' : 'news_covers';
  const url = await uploadToR2(cover, 'image/jpeg', `${slug}-editorial.jpg`, folder);
  await verifyR2Object(url);

  if (kind === 'news') document.heroImage = url;
  else document.coverImage = url;
  document.imageStyleFamily = 'Bright Multimodal Editorial';
  await document.save();
  console.log(`Updated ${kind} cover: ${url}`);
}

main()
  .then(async () => { await mongoose.disconnect(); process.exit(0); })
  .catch(async error => {
    console.error(error);
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
  });
