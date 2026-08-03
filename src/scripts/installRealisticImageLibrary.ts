import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { connectDB } from '../config/db';
import { RealisticImageAsset } from '../models/RealisticImageAsset';
import { uploadToR2, verifyR2Object } from '../services/r2.service';

const assets = [
  ['workflow-ai', 'Cinematic Workspace', 'claude-workflows-realistic.png', ['ai','prompt','workflow','agent','writing','claude','chatgpt','gemini','automation']],
  ['secure-cloud', 'Dark Studio', 'aws-secure-cloud-realistic.png', ['cloud','security','secure','aws','code','developer','database','infrastructure','software']],
  ['global-localization', 'Global Editorial', 'localization-realistic.png', ['global','localization','translation','language','international','content']],
  ['business-strategy', 'Realistic Product Scene', 'business-strategy-realistic.png', ['business','marketing','sales','strategy','growth','pricing','startup','seo','analytics']],
  ['creative-studio', 'Bright Lifestyle', 'creative-studio-realistic.png', ['image','video','creative','design','photo','media','youtube','brand','social']],
  ['career-hr', 'Bright Lifestyle', 'career-hr-realistic.png', ['career','resume','job','interview','employee','hr','cover letter','training']],
  ['ai-newsroom', 'Tech Newsroom', 'ai-newsroom-realistic.png', ['news','research','data','ai','model','industry','update','technology']],
  ['developer-workspace', 'Macro Technology', 'developer-workspace-realistic.png', ['code','developer','programming','software','app','website','sql','git','api']],
] as const;

async function main() {
  await connectDB();
  for (const [key, family, file, tags] of assets) {
    const existing = await RealisticImageAsset.findOne({ key });
    if (existing) continue;
    const source = fs.readFileSync(path.join(process.cwd(), 'generated-covers', file));
    const buffer = await sharp(source).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 91, chromaSubsampling: '4:4:4' }).toBuffer();
    const url = await uploadToR2(buffer, 'image/jpeg', `${key}.jpg`, 'realistic_library');
    await verifyR2Object(url);
    await RealisticImageAsset.create({ key, family, tags, r2Url: url, active: true });
    console.log(`Installed library asset: ${key}`);
  }
  await mongoose.disconnect(); process.exit(0);
}
main().catch(async error => { console.error(error); await mongoose.disconnect(); process.exit(1); });
