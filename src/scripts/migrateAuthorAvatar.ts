import 'dotenv/config';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { connectDB } from '../config/db';
import { Article } from '../models/Article';
import { Blog } from '../models/Blog';
import { News } from '../models/News';
import { uploadToR2, verifyR2Object } from '../services/r2.service';

const LEGACY_AVATAR = 'https://pub-68a98c57e70a4a1fa317739dd20098b9.r2.dev/1b9be0e4-c385-49a5-b0b5-ef158e8ef402.png';

async function main() {
  await connectDB();
  const response = await fetch(LEGACY_AVATAR, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Legacy avatar download failed with HTTP ${response.status}`);

  const optimized = await sharp(Buffer.from(await response.arrayBuffer()))
    .resize(128, 128, { fit: 'cover', position: 'centre' })
    .webp({ quality: 82, effort: 6 })
    .toBuffer();
  const url = await uploadToR2(optimized, 'image/webp', 'quicktools-ai-team-avatar.webp', 'brand');
  await verifyR2Object(url);

  const results = await Promise.all([
    Article.updateMany({ 'author.avatar': LEGACY_AVATAR }, { $set: { 'author.avatar': url } }),
    Blog.updateMany({ 'author.avatar': LEGACY_AVATAR }, { $set: { 'author.avatar': url } }),
    News.updateMany({ 'author.avatar': LEGACY_AVATAR }, { $set: { 'author.avatar': url } }),
  ]);
  console.log(JSON.stringify({ url, bytes: optimized.length, modified: results.map(result => result.modifiedCount) }));
}

main()
  .then(async () => { await mongoose.disconnect(); process.exit(0); })
  .catch(async error => {
    console.error(error);
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
  });
