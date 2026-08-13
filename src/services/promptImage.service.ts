import sharp from 'sharp';
import { generateImageBuffer, uploadToR2, verifyR2Object } from './r2.service';
import { generateGeminiRealisticImage } from './imageQualityPipeline';
import { RealisticImageAsset } from '../models/RealisticImageAsset';
import crypto from 'crypto';

async function composeUniqueLibraryCover(title: string, category: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const assets = await RealisticImageAsset.find({ active: true }).lean();
  if (assets.length < 2) throw new Error('Not enough realistic R2 assets for composed fallback');
  const words = `${title} ${category}`.toLowerCase();
  const ranked = assets.map(asset => ({ asset, score: (asset.tags as string[]).reduce((sum: number, tag: string) => sum + (words.includes(tag.toLowerCase()) ? 4 : 0), 0) })).sort((a, b) => b.score - a.score);
  const hashHex = crypto.createHash('sha256').update(title).digest('hex');
  const hash = parseInt(hashHex.slice(0, 8), 16);
  const primary = ranked[0].asset;
  const secondary = ranked[1 + (hash % Math.max(1, ranked.length - 1))].asset;
  const [primaryResponse, secondaryResponse] = await Promise.all([fetch(primary.r2Url), fetch(secondary.r2Url)]);
  if (!primaryResponse.ok || !secondaryResponse.ok) throw new Error('Realistic R2 source image unavailable');
  const [primaryArrayBuffer, secondaryArrayBuffer] = await Promise.all([primaryResponse.arrayBuffer(), secondaryResponse.arrayBuffer()]);
  const primaryBuffer = Buffer.from(primaryArrayBuffer);
  const secondaryBuffer = Buffer.from(secondaryArrayBuffer);
  const split = 650 + (hash % 180);
  const mirror = hash % 2 === 0;
  const accent = ['#4F46E5', '#2563EB', '#7C3AED', '#0891B2'][hash % 4];
  const left = await sharp(mirror ? secondaryBuffer : primaryBuffer).resize(split, 630, { fit: 'cover', position: hash % 3 === 0 ? 'left' : 'centre' }).modulate({ brightness: 1.04, saturation: 0.92 + (hash % 12) / 100 }).webp({ quality: 90, effort: 6 }).toBuffer();
  const right = await sharp(mirror ? primaryBuffer : secondaryBuffer).resize(1200 - split, 630, { fit: 'cover', position: hash % 3 === 1 ? 'right' : 'centre' }).modulate({ brightness: 1.02, saturation: 0.9 + (hash % 10) / 100 }).webp({ quality: 90, effort: 6 }).toBuffer();
  const overlay = Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="${accent}" stop-opacity=".03"/><stop offset=".55" stop-color="${accent}" stop-opacity=".18"/><stop offset="1" stop-color="#ffffff" stop-opacity=".04"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/><path d="M${split - 45} 0 L${split + 45} 630" stroke="white" stroke-opacity=".8" stroke-width="16"/><circle cx="${90 + (hash % 180)}" cy="${80 + (hash % 120)}" r="${24 + (hash % 30)}" fill="${accent}" fill-opacity=".18"/></svg>`);
  const buffer = await sharp({ create: { width: 1200, height: 630, channels: 4, background: { r: 238, g: 242, b: 255, alpha: 1 } } }).composite([{ input: left, left: 0, top: 0 }, { input: right, left: split, top: 0 }, { input: overlay, left: 0, top: 0 }]).webp({ quality: 85, effort: 6 }).toBuffer();
  return { buffer, mimeType: 'image/webp' };
}

function visualSubject(title: string, category: string): string {
  const value = `${title} ${category}`.toLowerCase();
  if (/career|resume|interview|job/.test(value)) return 'a realistic professional desk with a resume, portfolio, interview notes, and laptop';
  if (/code|developer|software|app/.test(value)) return 'a realistic developer workspace with code editor, architecture notes, and testing dashboard';
  if (/marketing|seo|social|content/.test(value)) return 'a bright marketing workspace with campaign planning, analytics charts, and content calendar';
  if (/business|sales|finance/.test(value)) return 'a premium business planning desk with strategy documents, clean charts, and presentation materials';
  if (/writing|email|story/.test(value)) return 'a bright editorial writing desk with document drafts, notebook, and laptop';
  if (/education|study|learn/.test(value)) return 'a welcoming learning workspace with study notes, books, and a modern laptop';
  return 'a clean practical productivity workspace with an organized notebook, task cards, and laptop';
}

export async function generatePromptCover(title: string, category: string, preferGenerated = true): Promise<string> {
  const prompt = `Use case: photorealistic-natural. Asset type: QuickTools AI prompt card cover. Scene: ${visualSubject(title, category)}. Topic: ${title}. Category: ${category}. Style: bright realistic editorial photography, natural daylight, clean white or softly lit neutral background, believable objects, friendly and practical, premium SaaS editorial quality. Composition: wide 1200x630 landscape, clear focal subject, safe crop area. Color palette: natural colors with restrained QuickTools purple and blue accents. Constraints: no readable text, no letters, no logos, no watermark, no robots, no cyborgs, no glowing AI brain, no dark neon cyberpunk scene, no fake UI screenshot, no distorted hands or faces.`;
  let generated: { buffer: Buffer; mimeType: string };
  if (!preferGenerated) generated = await composeUniqueLibraryCover(title, category);
  else try {
    generated = await generateGeminiRealisticImage(prompt, Math.floor(Math.random() * 1_000_000));
  } catch {
    try { generated = await generateImageBuffer(prompt); }
    catch { generated = await composeUniqueLibraryCover(title, category); }
  }
  const normalized = await sharp(generated.buffer).resize(1200, 630, { fit: 'cover', position: 'centre' }).webp({ quality: 85, effort: 6 }).toBuffer();
  const url = await uploadToR2(normalized, 'image/webp', `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}.webp`, 'prompt_covers');
  await verifyR2Object(url);
  return url;
}
