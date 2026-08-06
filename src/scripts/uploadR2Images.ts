import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT_URL!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const imageUrls = [
  'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=1000',
  'https://images.unsplash.com/photo-1633265486064-086b219458ce?auto=format&fit=crop&q=80&w=1000',
  'https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&q=80&w=1000',
  'https://images.unsplash.com/photo-1682687982501-1e58f813fb3e?auto=format&fit=crop&q=80&w=1000',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1000',
  'https://images.unsplash.com/photo-1589254065878-42c9da997008?auto=format&fit=crop&q=80&w=1000',
  'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&q=80&w=1000'
];

async function uploadToR2() {
  const urlMap: Record<string, string> = {};
  for (const url of imageUrls) {
    try {
      console.log('Downloading', url);
      const res = await axios.get(url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(res.data, 'binary');
      const filename = `learn-course/${uuidv4()}.jpg`;
      
      console.log('Uploading to R2:', filename);
      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: filename,
        Body: buffer,
        ContentType: 'image/jpeg',
      }));

      const newUrl = `${process.env.R2_PUBLIC_URL}/${filename}`;
      urlMap[url] = newUrl;
      console.log('Uploaded successfully! URL:', newUrl);
    } catch (err: any) {
      console.error('Failed to process', url, err.message);
    }
  }

  // Update the lesson-content.ts file
  const filePath = path.join(__dirname, 'lesson-content.ts');
  let content = fs.readFileSync(filePath, 'utf-8');
  for (const [oldUrl, newUrl] of Object.entries(urlMap)) {
    content = content.split(oldUrl).join(newUrl);
  }
  fs.writeFileSync(filePath, content);
  console.log('Updated lesson-content.ts with new R2 URLs.');
}

uploadToR2().catch(console.error);
