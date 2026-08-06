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

async function uploadImage() {
  const filePath = 'C:\\Users\\jain\\.gemini\\antigravity-ide\\brain\\e9153271-3849-40ac-b76d-2f2d241ae9b7\\chatgpt_interface_mockup_1786009449316.png';
  const fileName = 'chatgpt-interface-mockup.png';
  
  const fileStream = fs.createReadStream(filePath);
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: fileName,
    Body: fileStream,
    ContentType: 'image/png',
  });

  try {
    await s3Client.send(command);
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;
    console.log(`Success! Image available at: ${publicUrl}`);
  } catch (err) {
    console.error('Error uploading:', err);
  }
}

uploadImage();
