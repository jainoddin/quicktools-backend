import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT_URL!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const logos = [
  {
    name: 'ChatGPT',
    localPath: 'C:\\Users\\jain\\.gemini\\antigravity-ide\\brain\\e9153271-3849-40ac-b76d-2f2d241ae9b7\\chatgpt_logo_1785961175162.png',
    filename: 'learn-logos/chatgpt-logo.png',
  },
  {
    name: 'Claude',
    localPath: 'C:\\Users\\jain\\.gemini\\antigravity-ide\\brain\\e9153271-3849-40ac-b76d-2f2d241ae9b7\\claude_logo_1785961191923.png',
    filename: 'learn-logos/claude-logo.png',
  },
  {
    name: 'Gemini',
    localPath: 'C:\\Users\\jain\\.gemini\\antigravity-ide\\brain\\e9153271-3849-40ac-b76d-2f2d241ae9b7\\gemini_logo_1785961209981.png',
    filename: 'learn-logos/gemini-logo.png',
  },
  {
    name: 'Cursor',
    localPath: null, // already uploaded
    filename: 'learn-logos/cursor-logo.png',
  },
  {
    name: 'Perplexity',
    localPath: 'C:\\Users\\jain\\.gemini\\antigravity-ide\\brain\\e9153271-3849-40ac-b76d-2f2d241ae9b7\\perplexity_logo_1785961229669.png',
    filename: 'learn-logos/perplexity-logo.png',
  },
];

async function uploadLogosFromDisk() {
  console.log('🚀 Uploading logos to R2...\n');

  for (const logo of logos) {
    if (!logo.localPath) {
      const url = `${process.env.R2_PUBLIC_URL}/${logo.filename}`;
      console.log(`⏭️  Skipping ${logo.name} (already uploaded): ${url}`);
      continue;
    }

    try {
      if (!fs.existsSync(logo.localPath)) {
        console.error(`❌ File not found: ${logo.localPath}`);
        continue;
      }

      const buffer = fs.readFileSync(logo.localPath);
      console.log(`☁️  Uploading ${logo.name} (${buffer.length} bytes)...`);

      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: logo.filename,
        Body: buffer,
        ContentType: 'image/png',
      }));

      const publicUrl = `${process.env.R2_PUBLIC_URL}/${logo.filename}`;
      console.log(`✅ ${logo.name}: ${publicUrl}\n`);
    } catch (err: any) {
      console.error(`❌ Failed ${logo.name}: ${err.message}\n`);
    }
  }

  console.log('\n📋 All R2 URLs:');
  for (const logo of logos) {
    console.log(`${logo.name}: ${process.env.R2_PUBLIC_URL}/${logo.filename}`);
  }
}

uploadLogosFromDisk().catch(console.error);
