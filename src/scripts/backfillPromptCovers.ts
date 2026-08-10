import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { Prompt } from '../models/Prompt';
import { generatePromptCover } from '../services/promptImage.service';

async function main() {
  const limitArg = process.argv.find(value => value.startsWith('--limit='));
  const limit = Math.max(1, Number(limitArg?.split('=')[1] || 10));
  const concurrencyArg = process.argv.find(value => value.startsWith('--concurrency='));
  const concurrency = Math.max(1, Math.min(5, Number(concurrencyArg?.split('=')[1] || 2)));
  const replaceAll = process.argv.includes('--all');
  const replaceLibrary = process.argv.includes('--replace-library');
  const composedOnly = process.argv.includes('--composed-only');
  await connectDB();
  const query: any = replaceAll
    ? { status: 'published' }
    : replaceLibrary
      ? { status: 'published', imageUrl: { $not: /\/prompt_covers\// } }
      : { status: 'published', $or: [{ imageUrl: { $exists: false } }, { imageUrl: '' }, { ogImage: { $exists: false } }, { ogImage: '' }] };
  const prompts = await Prompt.find(query).sort({ publishedAt: -1, createdAt: -1 }).limit(limit);
  console.log(`[PromptImages] Backfilling ${prompts.length} prompt covers`);
  let cursor = 0;
  async function worker() {
    while (cursor < prompts.length) {
      const prompt = prompts[cursor++];
    try {
      const url = await generatePromptCover(prompt.title, prompt.category, !composedOnly);
      await Prompt.updateOne({ _id: prompt._id }, { $set: { imageUrl: url, ogImage: url, imageAlt: `${prompt.title} prompt cover` } }, { runValidators: false });
      console.log(`[PromptImages] Updated ${prompt.slug}: ${url}`);
    } catch (error: any) {
      console.error(`[PromptImages] Failed ${prompt.slug}: ${error?.message || error}`);
    }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, prompts.length) }, () => worker()));
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async error => { console.error(error); await mongoose.disconnect(); process.exit(1); });
