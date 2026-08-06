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

const uploads = [
  { path: 'C:\\Users\\jain\\.gemini\\antigravity-ide\\brain\\e9153271-3849-40ac-b76d-2f2d241ae9b7\\chatgpt_systemprompts_mockup_1786015566653.png', name: 'chatgpt-systemprompts-mockup.png' },
  { path: 'C:\\Users\\jain\\.gemini\\antigravity-ide\\brain\\e9153271-3849-40ac-b76d-2f2d241ae9b7\\chatgpt_imagegeneration_mockup_1786015578109.png', name: 'chatgpt-imagegeneration-mockup.png' },
  { path: 'C:\\Users\\jain\\.gemini\\antigravity-ide\\brain\\e9153271-3849-40ac-b76d-2f2d241ae9b7\\chatgpt_voicemode_mockup_1786015589510.png', name: 'chatgpt-voicemode-mockup.png' }
];

async function uploadImages() {
  for (const file of uploads) {
    if (!fs.existsSync(file.path)) {
       console.log(`Skipping ${file.name} - file not found at ${file.path}`);
       continue;
    }
    const fileStream = fs.createReadStream(file.path);
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: file.name,
      Body: fileStream,
      ContentType: 'image/png',
    });

    try {
      await s3Client.send(command);
      console.log(`Success: ${process.env.R2_PUBLIC_URL}/${file.name}`);
    } catch (err) {
      console.error(`Error uploading ${file.name}:`, err);
    }
  }
}

uploadImages();
