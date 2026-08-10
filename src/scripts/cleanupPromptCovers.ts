import 'dotenv/config';
import mongoose from 'mongoose';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { connectDB } from '../config/db';
import { Prompt } from '../models/Prompt';

const execute = process.argv.includes('--execute');
const prefix = 'prompt_covers/';

async function main() {
  await connectDB();
  const records = await Prompt.countDocuments({ $or: [{ imageUrl: /\/prompt_covers\// }, { ogImage: /\/prompt_covers\// }] });
  const client = new S3Client({ region: 'auto', endpoint: process.env.R2_ENDPOINT_URL, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID || '', secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '' } });
  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const page = await client.send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET_NAME, Prefix: prefix, ContinuationToken: continuationToken }));
    keys.push(...(page.Contents || []).map(item => item.Key).filter((key): key is string => Boolean(key)));
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  console.log(JSON.stringify({ mode: execute ? 'execute' : 'dry-run', promptRecords: records, r2Objects: keys.length, prefix }, null, 2));
  if (!execute) { await mongoose.disconnect(); process.exit(0); }

  for (let index = 0; index < keys.length; index += 1000) {
    const batch = keys.slice(index, index + 1000);
    const result = await client.send(new DeleteObjectsCommand({ Bucket: process.env.R2_BUCKET_NAME, Delete: { Objects: batch.map(Key => ({ Key })), Quiet: true } }));
    if (result.Errors?.length) throw new Error(`R2 deletion failed for ${result.Errors.length} objects`);
  }
  const dbResult = await Prompt.updateMany(
    { $or: [{ imageUrl: /\/prompt_covers\// }, { ogImage: /\/prompt_covers\// }] },
    { $unset: { imageUrl: '', ogImage: '', imageAlt: '' } },
    { runValidators: false }
  );
  console.log(JSON.stringify({ deletedR2Objects: keys.length, updatedPromptRecords: dbResult.modifiedCount }, null, 2));
  await mongoose.disconnect(); process.exit(0);
}

main().catch(async error => { console.error(error); await mongoose.disconnect(); process.exit(1); });
