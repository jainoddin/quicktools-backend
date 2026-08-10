import 'dotenv/config';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { connectDB } from '../config/db';
import { Prompt } from '../models/Prompt';
import { RealisticImageAsset } from '../models/RealisticImageAsset';

async function main() {
  await connectDB();
  const assets = await RealisticImageAsset.find({ active: true }).lean();
  if (!assets.length) throw new Error('No QuickTools realistic R2 assets available');
  const prompts = await Prompt.find({ status: 'published' }).select('_id title category').lean();
  for (const prompt of prompts) {
    const words = `${prompt.title} ${prompt.category}`.toLowerCase();
    const ranked = assets.map(asset => ({ asset, score: (asset.tags as string[]).reduce((sum: number, tag: string) => sum + (words.includes(tag.toLowerCase()) ? 4 : 0), 0) }));
    const bestScore = Math.max(...ranked.map(item => item.score));
    const candidates = ranked.filter(item => item.score === bestScore).map(item => item.asset);
    const hash = parseInt(crypto.createHash('sha1').update(String(prompt._id)).digest('hex').slice(0, 8), 16);
    const selected = candidates[hash % candidates.length] || assets[hash % assets.length];
    await Prompt.updateOne({ _id: prompt._id }, { $set: { imageUrl: selected.r2Url, ogImage: selected.r2Url, imageAlt: `${prompt.title} prompt cover` } }, { runValidators: false });
  }
  console.log(`[PromptImages] Assigned verified QuickTools R2 covers to ${prompts.length} prompts`);
  await mongoose.disconnect(); process.exit(0);
}

main().catch(async error => { console.error(error); await mongoose.disconnect(); process.exit(1); });
