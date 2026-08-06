import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT_URL!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// Official tool logos from their respective sources
const logoSources: { name: string; url: string; filename: string; contentType: string }[] = [
  {
    name: 'ChatGPT',
    // Official OpenAI ChatGPT logo (SVG from OpenAI CDN)
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/512px-ChatGPT_logo.svg.png',
    filename: 'learn-logos/chatgpt-logo.png',
    contentType: 'image/png',
  },
  {
    name: 'Claude',
    // Anthropic Claude official logo
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Claude_AI_logo.svg/512px-Claude_AI_logo.svg.png',
    filename: 'learn-logos/claude-logo.png',
    contentType: 'image/png',
  },
  {
    name: 'Gemini',
    // Google Gemini logo
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/512px-Google_Gemini_logo.svg.png',
    filename: 'learn-logos/gemini-logo.png',
    contentType: 'image/png',
  },
  {
    name: 'Cursor',
    // Cursor AI logo
    url: 'https://avatars.githubusercontent.com/u/89472827?s=200&v=4',
    filename: 'learn-logos/cursor-logo.png',
    contentType: 'image/png',
  },
  {
    name: 'Perplexity',
    // Perplexity logo
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Perplexity_AI_logo.svg/512px-Perplexity_AI_logo.svg.png',
    filename: 'learn-logos/perplexity-logo.png',
    contentType: 'image/png',
  },
];

async function uploadLogos() {
  console.log('🚀 Uploading AI tool logos to R2...\n');
  const results: Record<string, string> = {};

  for (const logo of logoSources) {
    try {
      console.log(`📥 Downloading ${logo.name} logo from: ${logo.url}`);
      const res = await axios.get(logo.url, { 
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; QuickTools/1.0)' },
        timeout: 10000,
      });
      const buffer = Buffer.from(res.data, 'binary');

      console.log(`☁️  Uploading ${logo.name} to R2 as ${logo.filename}...`);
      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: logo.filename,
        Body: buffer,
        ContentType: logo.contentType,
      }));

      const publicUrl = `${process.env.R2_PUBLIC_URL}/${logo.filename}`;
      results[logo.name] = publicUrl;
      console.log(`✅ ${logo.name}: ${publicUrl}\n`);
    } catch (err: any) {
      console.error(`❌ Failed to upload ${logo.name}: ${err.message}\n`);
    }
  }

  console.log('\n📋 Final URL Mapping (paste into learn/page.tsx):');
  console.log(JSON.stringify(results, null, 2));
}

uploadLogos().catch(console.error);
