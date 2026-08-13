import { ImageStyleHistory } from '../models/ImageStyleHistory';
import { deleteFromR2, uploadToR2, verifyR2Object } from './r2.service';
import { runWithFailover } from './geminiClient';
import type { ContentKind } from './contentQualityPipeline';
import sharp from 'sharp';
import crypto from 'crypto';
import { getKolkataStartOfDay } from '../utils/contentSchedule';
import fetch from 'node-fetch';
import { RealisticImageAsset } from '../models/RealisticImageAsset';

export const IMAGE_FAMILIES = ['Cinematic Workspace', 'Realistic Product Scene', 'Bright Lifestyle', 'Macro Technology', 'Tech Newsroom', 'Editorial 3D', 'Global Editorial', 'Dark Studio'] as const;
type ImageFamily = typeof IMAGE_FAMILIES[number];

const familiesByType: Record<ContentKind, ImageFamily[]> = {
  blog: ['Cinematic Workspace', 'Realistic Product Scene', 'Bright Lifestyle', 'Macro Technology'],
  article: ['Global Editorial', 'Editorial 3D', 'Realistic Product Scene', 'Bright Lifestyle'],
  news: ['Tech Newsroom', 'Editorial 3D', 'Dark Studio', 'Global Editorial'],
};

function imageDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length >= 24 && buffer.subarray(1, 4).toString('ascii') === 'PNG') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset++; continue; }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    if (length < 2) break;
    offset += 2 + length;
  }
  return null;
}

async function withTimeout<T>(promise: Promise<T>, milliseconds: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([promise, new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out`)), milliseconds); })]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function selectImageFamily(kind: ContentKind, category: string, recent: string[], forbiddenToday: string[] = []): ImageFamily {
  let candidates = [...familiesByType[kind]];
  const value = category.toLowerCase();
  if (/code|develop|tech/.test(value)) candidates = ['Cinematic Workspace', 'Macro Technology', 'Dark Studio'];
  if (/business|marketing/.test(value)) candidates = ['Realistic Product Scene', 'Bright Lifestyle', 'Global Editorial'];
  const allowedToday = candidates.filter(family => !forbiddenToday.includes(family));
  if (allowedToday.length) candidates = allowedToday;
  const last = recent[0];
  const counts = new Map(candidates.map(family => [family, recent.filter(item => item === family).length]));
  return candidates.filter(family => family !== last).sort((a, b) => (counts.get(a) || 0) - (counts.get(b) || 0))[0] || candidates[0];
}

function makePrompt(topic: string, kind: ContentKind, category: string, family: ImageFamily): string {
  const value = `${topic} ${category}`.toLowerCase();
  // Prefer physical, text-free visual metaphors. Screens, documents and dashboards
  // make lightweight image models invent gibberish text and fail the quality gate.
  let subject = 'a believable tabletop technology scene made from connected geometric modules, subtle signal paths, and precise physical components';
  if (/(perplexity.*chatgpt|chatgpt.*perplexity|\bvs\b|versus|comparison)/.test(value)) subject = 'a balanced side-by-side comparison made from two distinct sets of physical research tokens connected to one central decision scale';
  else if (/gemini|multimodal|vision|audio/.test(value)) subject = 'a realistic multimodal arrangement where a camera lens, blank photo tile, waveform sculpture, and data blocks connect into one coherent system';
  else if (/locali[sz]|translat|language|global content/.test(value)) subject = 'a bright global communication scene with a physical globe, blank speech symbols, and connected regional markers';
  else if (/aws|cloud|server|security|secure/.test(value)) subject = 'a realistic miniature cloud infrastructure scene with server-shaped blocks, connected services, and a prominent unbranded security lock';
  else if (/sql|database|data extract|analytics/.test(value)) subject = 'a realistic data pipeline made from stacked blank tiles flowing into organized grids, physical chart shapes, and verified records without labels';
  else if (/risk|compliance|audit/.test(value)) subject = 'a professional risk assessment scene with a balance scale, shield, branching decision paths, and color-coded blank blocks';
  else if (/contract|legal|document|review/.test(value)) subject = 'a professional legal review still life with blank paper shapes, a magnifying glass, approval tokens, shield, and organized clause markers with no writing';
  else if (/newsletter|email|engagement/.test(value)) subject = 'an editorial communication-growth still life with a blank envelope, connected audience tokens, and rising physical chart blocks';
  else if (/brand|identity/.test(value)) subject = 'a premium brand strategy still life with blank color swatches, geometric identity pieces, alignment grid, and connected positioning markers';
  else if (/business model|pitch|startup|invest/.test(value)) subject = 'a premium business strategy tabletop with blank model blocks, a clear value pathway, directional arrows, and an ascending physical chart';
  else if (/code|developer|software|app|program/.test(value)) subject = 'a realistic software architecture model made from connected code-shaped brackets, modular blocks, testing tokens, and circuit paths without screens';
  else if (/claude|prompt|agent|workflow/.test(value)) subject = 'a clean workflow made from blank modular cards, connected nodes, branching paths, and precise physical process markers';
  else if (/business|marketing|sales|growth|seo/.test(value)) subject = 'a professional business strategy tabletop with blank geometric charts, campaign tokens, directional arrows, and growth blocks';
  else if (/image|design|photo|video|visual/.test(value)) subject = 'a bright creative studio still life with a camera, lens, blank color swatches, lighting tools, and polished visual-production equipment without displays';

  const format = kind === 'news'
    ? 'credible editorial news photography, immediate and factual'
    : kind === 'article'
      ? 'premium editorial magazine photography, analytical and polished'
      : 'approachable realistic tech editorial photography, practical and human-friendly';
  return `BRIGHT REALISTIC EDITORIAL PHOTOGRAPHY on a white or softly lit neutral background. Show ${subject}. Create a 16:9 ${kind} cover for the ${category} category. Presentation: ${format}. Style family: ${family}. Communicate the subject only through objects and composition; never reproduce the article title or any words. Make the main objects large, recognizable, naturally arranged, and easy to understand at first glance. Use daylight, realistic materials, clean negative space, crisp detail, and only small restrained QuickTools purple/blue accents. Use a fresh composition unlike recent covers. Every surface, card, paper, display and label must be completely blank. Absolutely no typography, text, letters, numbers, symbols resembling writing, dark background, black scene, neon cyberpunk lighting, robots, cyborgs, humanoid AI figures, glowing AI brains, sci-fi control rooms, official company logos, fake product screenshots, watermarks, or human faces.`;
}

export async function generateGeminiRealisticImage(prompt: string, attempt: number): Promise<{ buffer: Buffer; mimeType: string }> {
  const keys = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '').split(',').map(key => key.trim()).filter(Boolean);
  if (!keys.length) throw new Error('No Gemini API keys configured for realistic image generation');
  const models = ['gemini-3.1-flash-image', 'gemini-2.5-flash-image'];
  let lastError = 'Image generation failed';
  for (const model of models) {
    for (const key of keys) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST', signal: AbortSignal.timeout(120_000),
          headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${prompt}\nVariation seed: ${attempt}. Return one image only.` }] }],
            generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '16:9' } },
          }),
        });
        if (!response.ok) {
          lastError = `${model} returned HTTP ${response.status}`;
          if ([400, 401, 403, 404, 429, 503].includes(response.status)) continue;
          throw new Error(lastError);
        }
        const payload: any = await response.json();
        const parts = payload?.candidates?.flatMap((candidate: any) => candidate?.content?.parts || []) || [];
        const image = parts.find((part: any) => part.inlineData?.data || part.inline_data?.data);
        const data = image?.inlineData?.data || image?.inline_data?.data;
        const mimeType = image?.inlineData?.mimeType || image?.inline_data?.mime_type || 'image/png';
        if (!data) throw new Error(`${model} returned no image data`);
        return { buffer: Buffer.from(data, 'base64'), mimeType };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }
  }
  throw new Error(`All free Gemini image attempts failed: ${lastError}`);
}

async function generateCloudflareRealisticImage(prompt: string, attempt: number): Promise<{ buffer: Buffer; mimeType: string }> {
  const accountId = String(process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
  const apiToken = String(process.env.CLOUDFLARE_AI_API_TOKEN || '').trim();
  if (process.env.CLOUDFLARE_AI_ENABLED !== 'true') throw new Error('Cloudflare Workers AI is disabled');
  if (!accountId || !apiToken) throw new Error('Cloudflare Workers AI credentials are missing');

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
    {
      method: 'POST',
      signal: AbortSignal.timeout(120_000),
      headers: { authorization: `Bearer ${apiToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        prompt: `${prompt}\nCreate one clean editorial cover only. Variation seed: ${attempt}.`,
        seed: Math.max(1, Math.floor(Math.random() * 2_147_483_646)),
        steps: 8,
      }),
    },
  );
  if (!response.ok) throw new Error(`Cloudflare Workers AI returned HTTP ${response.status}`);
  const payload: any = await response.json();
  const image = payload?.result?.image || payload?.image;
  if (!image || typeof image !== 'string') {
    const detail = payload?.errors?.[0]?.message || 'response contained no image';
    throw new Error(`Cloudflare Workers AI ${detail}`);
  }
  return { buffer: Buffer.from(image, 'base64'), mimeType: 'image/jpeg' };
}

async function selectRealisticLibraryAsset(topic: string, forbiddenFamilies: string[], recentKeys: string[]) {
  const assets = await RealisticImageAsset.find({ active: true }).lean();
  if (!assets.length) throw new Error('Realistic image library is empty');
  const normalizedTopic = topic.toLowerCase();
  const ranked = assets.map(asset => ({
    asset,
    score: (asset.tags as string[]).reduce((score: number, tag: string) => score + (normalizedTopic.includes(tag.toLowerCase()) ? 3 : 0), 0)
      - (forbiddenFamilies.includes(asset.family) ? 4 : 0)
      - (recentKeys.includes(asset.key) ? 2 : 0),
  })).sort((a, b) => b.score - a.score || a.asset.usageCount - b.asset.usageCount || Number(a.asset.lastUsedAt || 0) - Number(b.asset.lastUsedAt || 0));
  return ranked[0].asset;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function wrapHeadline(value: string, maxCharacters = 24, maxLines = 3): string[] {
  const words = value.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= maxCharacters || !line) line = next;
    else { lines.push(line); line = word; }
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && line) lines.push(line);
  const consumed = lines.join(' ').split(' ').length;
  if (consumed < words.length) lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[,:;-]?$/, '')}…`;
  return lines.map(escapeXml);
}

function semanticVisual(topic: string, category: string, accent: string, secondary: string, dark: string): string {
  const value = `${topic} ${category}`.toLowerCase();
  if (/locali[sz]|translat|global content|language/.test(value)) {
    return `<g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="600" cy="315" r="150" fill="${accent}" opacity="0.12" stroke="${accent}" stroke-width="12"/>
      <ellipse cx="600" cy="315" rx="68" ry="150" stroke="${secondary}" stroke-width="9"/><path d="M450 315h300M475 245h250M475 385h250" stroke="${secondary}" stroke-width="9"/>
      <path d="M356 205h150a28 28 0 0 1 28 28v60a28 28 0 0 1-28 28h-70l-43 38 10-38h-47a28 28 0 0 1-28-28v-60a28 28 0 0 1 28-28Z" fill="white" stroke="${accent}" stroke-width="9"/>
      <path d="M694 365h150a28 28 0 0 1 28 28v60a28 28 0 0 1-28 28h-47l10 38-43-38h-70a28 28 0 0 1-28-28v-60a28 28 0 0 1 28-28Z" fill="white" stroke="${secondary}" stroke-width="9"/>
      <path d="M375 260h110M720 420h100" stroke="${dark}" stroke-width="12" opacity=".28"/>
    </g>`;
  }
  if (/prompt|workflow|agent|claude|chatgpt|gemini/.test(value)) {
    return `<g stroke-linecap="round" stroke-linejoin="round"><rect x="300" y="135" width="600" height="360" rx="38" fill="white" stroke="${accent}" stroke-width="10" filter="url(#shadow)"/>
      <circle cx="350" cy="185" r="10" fill="${accent}"/><circle cx="382" cy="185" r="10" fill="${secondary}"/><path d="M300 220h600" stroke="${accent}" stroke-width="8" opacity=".2"/>
      <path d="m385 285 55 45-55 45M475 375h95" fill="none" stroke="${accent}" stroke-width="16"/>
      <path d="M635 285h155M635 335h120M635 385h165" stroke="${dark}" stroke-width="14" opacity=".18"/>
      <circle cx="710" cy="285" r="17" fill="${secondary}"/><circle cx="680" cy="335" r="17" fill="${accent}"/><circle cx="750" cy="385" r="17" fill="${secondary}"/>
    </g>`;
  }
  if (/aws|superblocks|cloud|secure|security|vibe cod/.test(value)) {
    return `<g stroke-linejoin="round"><path d="M360 355c-58 0-96-36-96-86 0-48 36-83 84-86 20-68 82-112 157-102 53 7 96 37 120 81 70-14 133 33 137 98 57 5 94 42 94 92 0 55-44 92-106 92H372" fill="white" stroke="${accent}" stroke-width="12" filter="url(#shadow)"/>
      <g fill="${secondary}" stroke="white" stroke-width="7"><rect x="390" y="270" width="92" height="92" rx="18"/><rect x="492" y="270" width="92" height="92" rx="18"/><rect x="594" y="270" width="92" height="92" rx="18"/></g>
      <path d="M535 430v-42c0-48 70-48 70 0v42" fill="none" stroke="${accent}" stroke-width="14"/><rect x="510" y="420" width="120" height="105" rx="24" fill="${accent}"/><circle cx="570" cy="464" r="14" fill="white"/><path d="M570 478v20" stroke="white" stroke-width="10"/>
    </g>`;
  }
  if (/code|developer|program|software|website|app/.test(value)) {
    return `<g><rect x="270" y="130" width="660" height="370" rx="40" fill="white" stroke="${accent}" stroke-width="10" filter="url(#shadow)"/><path d="M270 210h660" stroke="${accent}" stroke-width="8" opacity=".2"/><path d="m455 285-75 65 75 65M745 285l75 65-75 65M650 260l-95 180" fill="none" stroke="${secondary}" stroke-width="20" stroke-linecap="round"/></g>`;
  }
  if (/resume|career|job|interview|employee/.test(value)) {
    return `<g><rect x="390" y="105" width="420" height="430" rx="35" fill="white" stroke="${accent}" stroke-width="10" filter="url(#shadow)"/><circle cx="505" cy="245" r="55" fill="${secondary}"/><path d="M430 360c18-72 132-72 150 0" fill="${accent}" opacity=".75"/><path d="M630 210h125M630 260h95M630 330h125M630 380h110M450 440h300" stroke="${dark}" stroke-width="14" opacity=".18" stroke-linecap="round"/></g>`;
  }
  if (/image|design|photo|video|visual/.test(value)) {
    return `<g><rect x="275" y="125" width="650" height="380" rx="42" fill="white" stroke="${accent}" stroke-width="10" filter="url(#shadow)"/><circle cx="760" cy="225" r="48" fill="${secondary}"/><path d="M330 445 480 285l105 105 78-72 205 127Z" fill="url(#glow)" opacity=".88"/><path d="M330 445h538" stroke="${accent}" stroke-width="10"/></g>`;
  }
  if (/business|marketing|seo|sales|growth/.test(value)) {
    return `<g fill="${accent}" opacity=".85"><rect x="370" y="340" width="90" height="145" rx="20"/><rect x="500" y="270" width="90" height="215" rx="20"/><rect x="630" y="195" width="90" height="290" rx="20"/></g><path d="M335 370c130-18 200-105 285-90 75 13 120-55 210-135" fill="none" stroke="${secondary}" stroke-width="22" stroke-linecap="round"/><path d="m774 145h56v56" fill="none" stroke="${secondary}" stroke-width="18"/>`;
  }
  return `<g stroke="${accent}" stroke-width="10" stroke-linecap="round" opacity=".9"><path d="M390 315 500 215 610 315 720 205 825 315M500 215l20 190 90-90 105 110 110-110" fill="none"/></g><g fill="${secondary}" stroke="white" stroke-width="8"><circle cx="390" cy="315" r="28"/><circle cx="500" cy="215" r="34"/><circle cx="520" cy="405" r="28"/><circle cx="610" cy="315" r="42"/><circle cx="720" cy="205" r="31"/><circle cx="715" cy="425" r="29"/><circle cx="825" cy="315" r="35"/></g>`;
}

async function generateLocalBrandImage(topic: string, kind: ContentKind, category: string, family: ImageFamily, attempt: number): Promise<Buffer> {
  const hash = crypto.createHash('sha256').update(`${topic}:${category}:${family}:${attempt}`).digest();
  const accent = ['#4F46E5', '#6366F1', '#7C3AED', '#2563EB'][hash[0] % 4];
  const secondary = ['#22D3EE', '#818CF8', '#A78BFA', '#38BDF8'][hash[1] % 4];
  const dark = '#0F172A';
  const light = '#F8FAFC';
  const familyIndex = IMAGE_FAMILIES.indexOf(family);
  const circles = Array.from({ length: 9 }, (_, index) => {
    const x = 130 + ((hash[(index + 2) % hash.length] * 37 + index * 113) % 940);
    const y = 90 + ((hash[(index + 11) % hash.length] * 29 + index * 71) % 450);
    const radius = 10 + (hash[(index + 19) % hash.length] % 28);
    return `<circle cx="${x}" cy="${y}" r="${radius}" fill="${index % 2 ? secondary : accent}" opacity="${0.14 + (index % 4) * 0.08}"/>`;
  }).join('');
  const cards = Array.from({ length: 3 }, (_, index) => {
    const x = 175 + index * 285 + (hash[index] % 35);
    const y = 190 + (index % 2) * 70;
    return `<rect x="${x}" y="${y}" width="230" height="150" rx="28" fill="white" opacity="0.92" filter="url(#shadow)"/><circle cx="${x + 52}" cy="${y + 50}" r="22" fill="${index % 2 ? secondary : accent}" opacity="0.8"/><rect x="${x + 88}" y="${y + 34}" width="100" height="12" rx="6" fill="${dark}" opacity="0.14"/><rect x="${x + 36}" y="${y + 94}" width="150" height="10" rx="5" fill="${accent}" opacity="0.18"/>`;
  }).join('');
  const neural = `<g stroke="${accent}" stroke-width="8" stroke-linecap="round" opacity="0.8"><path d="M430 315 L520 235 L620 315 L720 225 L810 315" fill="none"/><path d="M520 235 L535 365 L620 315 L700 390 L810 315" fill="none"/></g><g fill="${secondary}" stroke="white" stroke-width="8"><circle cx="430" cy="315" r="25"/><circle cx="520" cy="235" r="30"/><circle cx="535" cy="365" r="24"/><circle cx="620" cy="315" r="38"/><circle cx="720" cy="225" r="27"/><circle cx="700" cy="390" r="25"/><circle cx="810" cy="315" r="31"/></g>`;
  const charts = `<g fill="${accent}" opacity="0.8"><rect x="420" y="330" width="65" height="130" rx="18"/><rect x="515" y="265" width="65" height="195" rx="18"/><rect x="610" y="205" width="65" height="255" rx="18"/><rect x="705" y="145" width="65" height="315" rx="18"/></g><path d="M390 365 C500 350 570 250 650 270 S780 160 840 135" fill="none" stroke="${secondary}" stroke-width="18" stroke-linecap="round"/>`;
  const motif = /business|marketing/i.test(category) ? charts : neural;
  const topicVisual = semanticVisual(topic, category, accent, secondary, dark);
  const darkFamily = ['Tech Newsroom', 'Editorial 3D', 'Dark Studio', 'Macro Technology'].includes(family);
  const familyPalettes = [
    ['#F8FAFC', '#4F46E5', '#22D3EE'], ['#FFFDF7', '#7C3AED', '#F59E0B'],
    ['#EEF6FF', '#2563EB', '#14B8A6'], ['#F7F7FF', '#6D28D9', '#EC4899'],
    ['#090D1A', '#F97316', '#8B5CF6'], ['#071426', '#06B6D4', '#6366F1'],
    ['#081225', '#3B82F6', '#A855F7'], ['#10132A', '#F97316', '#06B6D4'],
  ][familyIndex];
  const [surface, familyAccent, familySecondary] = familyPalettes;
  const headlineColor = darkFamily ? '#FFFFFF' : '#0F172A';
  const mutedColor = darkFamily ? '#CBD5E1' : '#475569';
  const headline = wrapHeadline(topic, darkFamily ? 22 : 24, 3);
  const chips = kind === 'news' ? ['LATEST', 'CONTEXT', 'IMPACT'] : kind === 'article' ? ['ANALYSIS', 'INSIGHTS', 'GUIDE'] : ['PRACTICAL', 'WORKFLOW', 'GUIDE'];
  const titleSvg = headline.map((line, index) => `<text x="92" y="${205 + index * 76}" fill="${headlineColor}" font-family="Arial, Segoe UI, sans-serif" font-size="58" font-weight="800" letter-spacing="-2">${line}</text>`).join('');
  const chipsSvg = chips.map((chip, index) => `<g transform="translate(${92 + index * 145} 480)"><rect width="128" height="42" rx="21" fill="${index === 0 ? familyAccent : familySecondary}" opacity="${index === 0 ? 1 : .2}"/><text x="64" y="27" text-anchor="middle" fill="${index === 0 || darkFamily ? '#FFFFFF' : mutedColor}" font-family="Arial, Segoe UI, sans-serif" font-size="14" font-weight="800" letter-spacing="1.2">${chip}</text></g>`).join('');
  const label = `<text x="92" y="108" fill="${familyAccent}" font-family="Arial, Segoe UI, sans-serif" font-size="18" font-weight="800" letter-spacing="3">QUICKTOOLS · ${kind.toUpperCase()}</text>`;
  const background = `<rect width="1200" height="630" fill="${surface}"/><circle cx="1090" cy="40" r="360" fill="${familyAccent}" opacity=".16"/><circle cx="950" cy="620" r="300" fill="${familySecondary}" opacity=".12"/>`;
  const layout = familyIndex % 3 === 1
    ? `${label}${titleSvg}${chipsSvg}<g transform="translate(565 115) scale(.58)">${topicVisual}</g>`
    : familyIndex % 3 === 2
      ? `${label}${titleSvg}${chipsSvg}<g transform="translate(555 100) scale(.62)">${topicVisual}</g><rect x="690" y="92" width="410" height="446" rx="44" fill="none" stroke="${familySecondary}" stroke-width="3" opacity=".32"/>`
      : `${label}${titleSvg}${chipsSvg}<g transform="translate(560 105) scale(.6)">${topicVisual}</g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs><filter id="shadow"><feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#0F172A" flood-opacity="0.18"/></filter><linearGradient id="glow" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${familyAccent}"/><stop offset="1" stop-color="${familySecondary}"/></linearGradient></defs>${background}<rect x="35" y="35" width="1130" height="560" rx="48" fill="none" stroke="url(#glow)" stroke-width="3" opacity=".28"/>${circles}${layout}</svg>`;
  return sharp(Buffer.from(svg)).webp({ quality: 90, effort: 6 }).toBuffer();
}

async function visualReview(buffer: Buffer, mimeType: string, topic: string, family: string): Promise<string[]> {
  return runWithFailover(async (genAI, modelName) => {
    const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { temperature: 0.1, maxOutputTokens: 800, responseMimeType: 'application/json' } });
    const result = await model.generateContent([{ text: `Validate this realistic editorial cover for topic "${topic}" and style "${family}". The central visual must make the topic recognizable at category level (for example a comparison needs a clear side-by-side concept, localization needs language/globe symbolism, prompting needs a prompt/workflow interface, and cloud security needs cloud/blocks/lock symbolism). Reject a generic or unrelated visual. Reject anime, cartoons, dolls, human faces, robots, cyborgs, humanoid AI characters, fantasy scenes, dark neon cyberpunk imagery, blur, unsafe content, visible generated text, watermark, deceptive real-company logo/screenshot, severe artifacts, or colors incompatible with the clean purple/blue QuickTools brand. Return concise JSON only: {"passed":true,"errors":[]}. Maximum 5 short errors.` }, { inlineData: { data: buffer.toString('base64'), mimeType } }]);
    const raw = result.response.text().trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    const parsed = JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : raw);
    return parsed.passed && Array.isArray(parsed.errors) && parsed.errors.length === 0 ? [] : (Array.isArray(parsed.errors) ? parsed.errors.map(String) : ['Visual validation failed']);
  });
}

function deterministicSemanticReview(topic: string, category: string): string[] {
  const value = `${topic} ${category}`.toLowerCase();
  const supported = /locali[sz]|translat|global content|language|prompt|workflow|agent|claude|chatgpt|gemini|aws|superblocks|cloud|secure|security|vibe cod|code|developer|program|software|website|app|resume|career|job|interview|employee|image|design|photo|video|visual|business|marketing|seo|sales|growth|ai|artificial intelligence/.test(value);
  return supported ? [] : ['No semantic visual family matches this topic'];
}

export async function generateImageWithQualityGate(input: { contentId: string; kind: ContentKind; category: string; topic: string; folder: string; maxRegenerations?: number }): Promise<{ url: string; family: string } | null> {
  const [recentDocs, todayDocs] = await Promise.all([
    ImageStyleHistory.find({ finalStatus: 'passed', contentType: input.kind }).sort({ createdAt: -1 }).limit(10).select('selectedFamily selectedAssetKey').lean(),
    ImageStyleHistory.find({ finalStatus: 'passed', createdAt: { $gte: getKolkataStartOfDay() } }).select('selectedFamily selectedAssetKey contentType').lean(),
  ]);
  const stylesAlreadyUsedToday = [...new Set(todayDocs
    .filter(item => item.contentType !== input.kind)
    .map(item => item.selectedFamily))];
  let family = selectImageFamily(input.kind, input.category, recentDocs.map(item => item.selectedFamily), stylesAlreadyUsedToday);
  let prompt = makePrompt(input.topic, input.kind, input.category, family);
  const recentAssetKeys = recentDocs.map(item => item.selectedAssetKey).filter((key): key is string => Boolean(key));
  const attempts = 1 + (input.maxRegenerations ?? 2);
  let previousValidationErrors: string[] = [];

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const errors: string[] = [];
    let uploadError: string | undefined;
    let r2Url: string | undefined;
    let selectedAssetKey: string | undefined;
    try {
      let generated: { buffer: Buffer; mimeType: string };
      let generatedLocally = false;
      const attemptPrompt = previousValidationErrors.length
        ? `${prompt}\nThe previous image was rejected for: ${previousValidationErrors.join('; ')}. Correct every issue and create a visibly different composition.`
        : prompt;
      try {
        try {
          if (attempt === attempts) throw new Error('Rotating away from Cloudflare on the final attempt');
          generated = await withTimeout(
            generateCloudflareRealisticImage(attemptPrompt, attempt),
            125_000,
            'Cloudflare Workers AI image generation',
          );
          prompt = `${attemptPrompt} (Cloudflare Workers AI FLUX)`;
        } catch (cloudflareError) {
          console.log(`[ImagePipeline] Cloudflare Workers AI unavailable (${cloudflareError instanceof Error ? cloudflareError.message : String(cloudflareError)}). Trying Gemini...`);
          generated = await withTimeout(
            generateGeminiRealisticImage(attemptPrompt, attempt),
            125_000,
            'Gemini image generation',
          );
          prompt = `${attemptPrompt} (Gemini image fallback)`;
        }
      } catch (providerError) {
        console.log(`[ImagePipeline] Cloudflare and Gemini failed on attempt ${attempt}. Falling back to Pollinations AI (Flux)...`);
        const seed = Math.floor(Math.random() * 1000000);
        // Keep the fallback semantically faithful. Repeating generic cyberpunk/robot
        // terms made unrelated topics look identical and reduced editorial trust.
        const enhancedPrompt = `${attemptPrompt} Photorealistic editorial composition, contextually accurate objects, clean natural depth, subtle cinematic finish, no generic AI mascot.`;
        const negativePrompt = 'dark background, black background, cyberpunk, neon, robot, cyborg, humanoid, android, AI brain, glowing orb, sci-fi control room, server tunnel, fantasy, logo, watermark, text, letters, face, low contrast, blurry';
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1200&height=630&nologo=true&seed=${seed}&model=flux&negative_prompt=${encodeURIComponent(negativePrompt)}`;
        try {
          const response = await fetch(pollinationsUrl, { signal: AbortSignal.timeout(60_000) });
          if (!response.ok) throw new Error(`Pollinations fallback failed (HTTP ${response.status})`);
          generated = { buffer: Buffer.from(await response.arrayBuffer()), mimeType: response.headers.get('content-type') || 'image/jpeg' };
          prompt = `${prompt} (Vetted Pollinations FLUX fallback)`;
        } catch (pollinationsError) {
          console.log(`[ImagePipeline] Pollinations API failed (${pollinationsError instanceof Error ? pollinationsError.message : String(pollinationsError)}). Falling back to local SVG brand image...`);
          const svgBuffer = await generateLocalBrandImage(input.topic, input.kind, input.category, family, attempt);
          generated = { buffer: svgBuffer, mimeType: 'image/webp' };
          generatedLocally = true;
          prompt = `Local brand SVG fallback used after API failures. Topic: ${input.topic}`;
        }
      }
      const normalizedBuffer = await sharp(generated.buffer)
        .resize(1200, 630, { fit: 'cover', position: 'centre' })
        .webp({ quality: 85, effort: 6 })
        .toBuffer();
      const normalizedMimeType = 'image/webp';
      if (normalizedBuffer.length < 15_000) errors.push('Image file is too small or low resolution');
      const dimensions = imageDimensions(normalizedBuffer);
      if (!dimensions || dimensions.width !== 1200 || dimensions.height !== 630) errors.push(`Image dimensions must be 1200x630; received ${dimensions ? `${dimensions.width}x${dimensions.height}` : 'unknown'}`);
      if (!errors.length) {
        errors.push(...deterministicSemanticReview(input.topic, input.category));
      }
      // Generated provider images must be inspected, not merely trusted because the
      // prompt contains negative instructions. This rejects anime, faces, robots,
      // text, and unrelated visuals before anything reaches R2 or gets published.
      // The local SVG fallback is assembled from audited motifs and remains
      // deterministic, so it does not require an external vision request.
      if (!errors.length && !generatedLocally) {
        try {
          errors.push(...await withTimeout(
            visualReview(normalizedBuffer, normalizedMimeType, input.topic, family),
            90_000,
            'Image visual review',
          ));
        } catch (reviewError) {
          errors.push(`Image visual review unavailable: ${reviewError instanceof Error ? reviewError.message : String(reviewError)}`);
        }
      }
      if (!errors.length) {
        r2Url = await uploadToR2(normalizedBuffer, normalizedMimeType, `${input.contentId}.webp`, input.folder);
        try {
          await withTimeout(verifyR2Object(r2Url), 30_000, 'R2 verification');
        } catch (error) {
          await deleteFromR2(r2Url).catch(() => undefined);
          r2Url = undefined;
          throw error;
        }
      }
    } catch (error) {
      uploadError = error instanceof Error ? error.message : String(error);
      errors.push(uploadError);
    }
    const passed = Boolean(r2Url) && errors.length === 0;
    await ImageStyleHistory.create({ contentId: input.contentId, contentType: input.kind, category: input.category, selectedFamily: family, selectedAssetKey, prompt, attemptNumber: attempt, validationErrors: errors, uploadError, r2Url, finalStatus: passed ? 'passed' : attempt === attempts ? 'skipped' : 'retrying' });
    if (passed) {
      if (selectedAssetKey) await RealisticImageAsset.updateOne({ key: selectedAssetKey }, { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } });
      return { url: r2Url!, family };
    }
    previousValidationErrors = errors;
  }

  // Free image providers are not consistently capable of following strict
  // editorial constraints. Preserve the daily publishing guarantee by using a
  // previously approved, topic-ranked realistic R2 asset only after every
  // generated-image attempt has failed. Never upload an unreviewed generation.
  try {
    const libraryAsset = await selectRealisticLibraryAsset(input.topic, stylesAlreadyUsedToday, recentAssetKeys);
    await withTimeout(verifyR2Object(libraryAsset.r2Url), 30_000, 'Realistic library R2 verification');
    await ImageStyleHistory.create({
      contentId: input.contentId,
      contentType: input.kind,
      category: input.category,
      selectedFamily: libraryAsset.family,
      selectedAssetKey: libraryAsset.key,
      prompt: `Approved realistic-library fallback selected for topic: ${input.topic}`,
      attemptNumber: attempts + 1,
      validationErrors: [],
      r2Url: libraryAsset.r2Url,
      finalStatus: 'passed',
    });
    await RealisticImageAsset.updateOne(
      { key: libraryAsset.key },
      { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } },
    );
    console.log(`[ImagePipeline] Generated images failed; using approved realistic library asset "${libraryAsset.key}".`);
    return { url: libraryAsset.r2Url, family: libraryAsset.family };
  } catch (libraryError) {
    console.warn(`[ImagePipeline] Approved realistic library fallback unavailable: ${libraryError instanceof Error ? libraryError.message : String(libraryError)}`);
  }
  return null;
}

export async function attachValidatedImage(kind: ContentKind, content: any): Promise<boolean> {
  const folder = kind === 'blog' ? 'blog_covers' : kind === 'article' ? 'article_covers' : 'news_covers';
  // The final editorial title is the most accurate semantic signal, especially
  // when a generator pivots away from its seed topic to avoid duplicates.
  const result = await generateImageWithQualityGate({ contentId: String(content.slug), kind, category: String(content.category || ''), topic: String(content.title || content.topic), folder });
  if (!result) return false;
  if (kind === 'news') content.heroImage = result.url;
  else content.coverImage = result.url;
  content.imageStyleFamily = result.family;
  return true;
}
