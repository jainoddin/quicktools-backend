import mongoose from 'mongoose';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import { Blog } from './src/models/Blog';
import { News } from './src/models/News';
import { Article } from './src/models/Article';

dotenv.config();

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT_URL || '',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

function extractUrlsFromText(text: string | undefined): string[] {
  if (!text || !R2_PUBLIC_URL) return [];
  const regex = new RegExp(`${R2_PUBLIC_URL.replace(/\//g, '\\/')}[a-zA-Z0-9_\\-\\./%]+`, 'g');
  const matches = text.match(regex);
  return matches || [];
}

async function runCleanup() {
  const isDeleteMode = process.argv.includes('--delete');
  
  if (!R2_BUCKET_NAME || !R2_PUBLIC_URL) {
    console.error('Missing R2 environment variables');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || '');
  console.log('Connected to MongoDB');

  const usedUrls = new Set<string>();

  const blogs = await Blog.find({});
  blogs.forEach(b => {
    if (b.coverImage && b.coverImage.startsWith(R2_PUBLIC_URL)) usedUrls.add(b.coverImage);
    extractUrlsFromText(b.content).forEach(url => usedUrls.add(url));
  });

  const newsList = await News.find({});
  newsList.forEach(n => {
    if (n.heroImage && n.heroImage.startsWith(R2_PUBLIC_URL)) usedUrls.add(n.heroImage);
    const fullContent = [n.whatHappened, n.whyItMatters, n.industryReaction, n.quickToolsInsight, n.conclusion].join(' ');
    extractUrlsFromText(fullContent).forEach(url => usedUrls.add(url));
  });

  const articles = await Article.find({});
  articles.forEach(a => {
    if (a.coverImage && a.coverImage.startsWith(R2_PUBLIC_URL)) usedUrls.add(a.coverImage);
    extractUrlsFromText(a.content).forEach(url => usedUrls.add(url));
  });

  console.log(`Found ${usedUrls.size} unique R2 URLs in the database.`);

  let isTruncated = true;
  let continuationToken: string | undefined = undefined;
  const allObjects: string[] = [];

  while (isTruncated) {
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      ContinuationToken: continuationToken,
    });
    const response: any = await r2Client.send(command);
    if (response.Contents) {
      response.Contents.forEach((item: any) => {
        if (item.Key) allObjects.push(item.Key);
      });
    }
    isTruncated = response.IsTruncated || false;
    continuationToken = response.NextContinuationToken;
  }

  console.log(`Found ${allObjects.length} total objects in R2 bucket.`);

  const objectsToDelete: string[] = [];

  for (const key of allObjects) {
    const fullUrl = `${R2_PUBLIC_URL}/${key}`;
    if (!usedUrls.has(fullUrl)) {
      objectsToDelete.push(key);
    }
  }

  console.log(`Identified ${objectsToDelete.length} unused images in R2.`);

  if (objectsToDelete.length > 0) {
    if (isDeleteMode) {
      console.log('Deleting unused images...');
      for (let i = 0; i < objectsToDelete.length; i += 1000) {
        const batch = objectsToDelete.slice(i, i + 1000);
        const delCommand = new DeleteObjectsCommand({
          Bucket: R2_BUCKET_NAME,
          Delete: {
            Objects: batch.map(key => ({ Key: key })),
            Quiet: false,
          }
        });
        await r2Client.send(delCommand);
        console.log(`Deleted batch of ${batch.length} objects.`);
      }
      console.log('Deletion complete!');
    } else {
      console.log('--- DRY RUN MODE ---');
      console.log('Run with --delete flag to actually delete them.');
      console.log('Samples to delete:', objectsToDelete.slice(0, 10));
    }
  }

  await mongoose.disconnect();
  process.exit(0);
}

runCleanup().catch(console.error);
