import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { LearnCourse } from '../models/LearnCourse';
import { LearnLesson } from '../models/LearnLesson';
import * as path from 'path';
import { publishLessonUpdate } from '../services/lessonUpdate.service';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function seedUpdates() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Cannot run this seed script in production!');
    process.exit(1);
  }
  
  if (process.env.ALLOW_LEARN_DEV_SEED !== 'true') {
    console.error('Must set ALLOW_LEARN_DEV_SEED=true to run this script!');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quicktools');
    console.log('Connected to MongoDB');

    // Find ChatGPT course first
    const chatgptCourse = await LearnCourse.findOne({ slug: 'chatgpt' });
    if (!chatgptCourse) {
      console.log('ChatGPT course not found');
      process.exit(1);
    }

    // Find ChatGPT Projects lesson
    const projectsLesson = await LearnLesson.findOne({ slug: 'projects', courseId: chatgptCourse._id });
    
    if (!projectsLesson) {
      console.log('ChatGPT Projects lesson not found. Please run seedLearnDev first.');
      process.exit(1);
    }

    console.log('Found Projects lesson, adding dummy update via publishLessonUpdate...');

    const blocks = [...projectsLesson.contentBlocks];
    const pIndex = blocks.findIndex((b: any) => b.type === 'paragraph' || b.type === 'markdown');
    
    let targetBlockId = '';
    if (pIndex !== -1) {
      if (!blocks[pIndex].id) {
        // Just save an ID to DB first so we can patch it
        blocks[pIndex].id = 'dummy-update-block-1';
        projectsLesson.contentBlocks = blocks;
        await projectsLesson.save();
      }
      targetBlockId = blocks[pIndex].id;
    } else {
      console.log('No paragraph block found to update.');
      process.exit(1);
    }

    // Now construct the patch
    const patch = {
      blockId: targetBlockId,
      newBlock: {
        ...blocks[pIndex],
        content: blocks[pIndex].content + '\n\n**NEW UPDATE**: Workspaces are now natively supported in ChatGPT Projects!'
      }
    };

    const idempotencyKey = uuidv4();
    
    const result = await publishLessonUpdate({
      lessonId: projectsLesson._id as any,
      expectedVersion: projectsLesson.currentVersion,
      idempotencyKey,
      updateType: 'content_update',
      summary: 'Projects now supports new workspace features.',
      patches: [patch],
      primaryUpdateAnchor: targetBlockId,
      createdBy: 'dev-seed-script',
      triggerType: 'admin'
    });

    console.log('Successfully seeded dummy update for ChatGPT Projects lesson!', result);
    process.exit(0);
  } catch (err) {
    console.error('Error seeding update DB:', err);
    process.exit(1);
  }
}

seedUpdates();
