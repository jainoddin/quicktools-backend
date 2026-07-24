import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

// Initialize S3 Client for Cloudflare R2
// Values should be provided in .env
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT_URL || '',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export const uploadToR2 = async (fileBuffer: Buffer, mimetype: string, originalName: string, folder: string = 'uploads'): Promise<string> => {
  if (!process.env.R2_BUCKET_NAME || !process.env.R2_PUBLIC_URL) {
    throw new Error('R2 configuration is missing in environment variables');
  }

  // Generate a unique file name to prevent overwriting
  const fileExtension = originalName.split('.').pop();
  const randomName = crypto.randomBytes(16).toString('hex');
  const fileName = `${folder}/${randomName}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: fileName,
    Body: fileBuffer,
    ContentType: mimetype,
  });

  await r2Client.send(command);

  // Return the public URL of the uploaded image
  // R2_PUBLIC_URL should be like https://pub-xxxxxx.r2.dev
  return `${process.env.R2_PUBLIC_URL}/${fileName}`;
};

export const generateAndUploadImage = async (title: string, folder: string): Promise<string> => {
  const seed = Math.floor(Math.random() * 1000000);
  
  let prompt = '';
  if (folder === 'article_covers') {
    prompt = `A professional, minimalist 3D illustration representing "${title}", featuring abstract AI and technology icons, balanced composition, modern SaaS illustration style similar to Notion, Linear, and Stripe, rounded geometric shapes, soft shadows, subtle gradients using #6D5BD0 and #3B82C4, clean editorial design, wide landscape composition for a blog header, soft studio lighting, ultra-high quality, 8k resolution, no text, no words, no letters, no logos, no watermark, no human faces`;
  } else if (folder === 'news_covers') {
    prompt = `A premium editorial illustration representing the latest AI news about "${title}", modern technology newsroom, futuristic AI concepts, clean magazine cover style, cinematic lighting, digital world map, holographic interfaces, subtle blue and purple gradients, ultra-detailed 3D illustration, wide landscape composition, 8k resolution, no text, no words, no logos, no watermark, no human faces.`;
  } else {
    prompt = `A highly detailed, hyper-realistic cinematic 3D render representing "${title}", featuring futuristic glowing neon holograms, advanced technology interfaces, dark cinematic tech background, Unreal Engine 5 render style, photorealistic, dramatic lighting, ultra-high quality, 8k resolution, no text, no watermark, no logos`;
  }
  
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1200&height=800&nologo=true&seed=${seed}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to generate image from pollinations');
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  const safeName = title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30);
  return await uploadToR2(buffer, 'image/jpeg', `${safeName}.jpg`, folder);
};
