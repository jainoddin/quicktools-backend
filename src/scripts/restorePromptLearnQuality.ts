import 'dotenv/config';
import mongoose from 'mongoose';
import { Prompt } from '../models/Prompt';
import { LearnLesson } from '../models/LearnLesson';
import { ContentQualityBackup } from '../models/ContentQualityBackup';

const APPLY = process.argv.includes('--apply');
const MIGRATION_ID = 'prompt-learn-quality-v1-2026-08-17';

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('<db_password>')) throw new Error('MONGODB_URI is not configured');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000, socketTimeoutMS: 60000, maxPoolSize: 3, family: 4 });
  try {
    const backups = await ContentQualityBackup.find({ migrationId: MIGRATION_ID }).lean();
    const promptBackups = backups.filter((item: any) => item.contentType === 'prompt');
    const lessonBackups = backups.filter((item: any) => item.contentType === 'lesson');
    console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', migrationId: MIGRATION_ID, promptBackups: promptBackups.length, lessonBackups: lessonBackups.length }, null, 2));
    if (!APPLY) return;

    for (const item of promptBackups as any[]) {
      const snapshot = { ...item.snapshot };
      delete snapshot._id;
      await Prompt.updateOne({ _id: item.contentId }, { $set: snapshot });
    }
    for (const item of lessonBackups as any[]) {
      const snapshot = { ...item.snapshot };
      delete snapshot._id;
      await LearnLesson.updateOne({ _id: item.contentId }, { $set: snapshot });
    }
    console.log(JSON.stringify({ restored: true, prompts: promptBackups.length, lessons: lessonBackups.length }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
