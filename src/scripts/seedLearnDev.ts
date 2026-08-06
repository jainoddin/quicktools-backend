import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { LearnCourse } from '../models/LearnCourse';
import { LearnLesson } from '../models/LearnLesson';
import { LearnQuiz } from '../models/LearnQuiz';
import { LearnQuizAttempt } from '../models/LearnQuizAttempt';
import * as fs from 'fs';
import * as path from 'path';
import { getBlocksForLesson } from './lesson-content';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const COURSES = [
  {
    title: 'ChatGPT A-Z',
    slug: 'chatgpt',
    provider: 'OpenAI',
    description: 'Learn what ChatGPT is, how it works, and how it can help you save time and boost productivity.',
    icon: 'https://pub-0a928134dcdc420da2af02e6238ef06b.r2.dev/ChatGPT%20Image%20Aug%206%2C%202026%2C%2001_14_25%20PM.png',
    order: 1
  },
  {
    title: 'Claude A-Z',
    slug: 'claude',
    provider: 'Anthropic',
    description: 'Learn Claude AI step-by-step with practical examples and master Artifacts.',
    icon: 'https://pub-0a928134dcdc420da2af02e6238ef06b.r2.dev/ChatGPT%20Image%20Aug%206%2C%202026%2C%2001_24_40%20PM.png',
    order: 2
  },
  {
    title: 'Gemini A-Z',
    slug: 'gemini',
    provider: 'Google',
    description: 'Master Google Gemini AI for productivity and creativity.',
    icon: 'https://pub-0a928134dcdc420da2af02e6238ef06b.r2.dev/ChatGPT%20Image%20Aug%206%2C%202026%2C%2001_34_48%20PM.png',
    order: 3
  },
  {
    title: 'Cursor A-Z',
    slug: 'cursor',
    provider: 'Anysphere',
    description: 'AI-powered coding with Cursor from basics to advanced.',
    icon: 'https://pub-0a928134dcdc420da2af02e6238ef06b.r2.dev/ChatGPT%20Image%20Aug%206%2C%202026%2C%2001_30_12%20PM.png',
    order: 4
  },
  {
    title: 'Perplexity A-Z',
    slug: 'perplexity',
    provider: 'Perplexity',
    description: 'Master AI search & research with Perplexity.',
    icon: 'https://pub-0a928134dcdc420da2af02e6238ef06b.r2.dev/ChatGPT%20Image%20Aug%206%2C%202026%2C%2002_19_18%20PM.png',
    order: 5
  },
  {
    title: 'Prompt Hub',
    slug: 'prompthub',
    provider: 'QuickTools',
    description: 'Discover and share the best AI prompts for your daily tasks.',
    icon: 'https://pub-0a928134dcdc420da2af02e6238ef06b.r2.dev/ChatGPT%20Image%20Aug%206%2C%202026%2C%2002_27_20%20PM.png',
    order: 6
  }
];

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quicktools');
    console.log('Connected to MongoDB');

    await LearnCourse.deleteMany({});
    await LearnLesson.deleteMany({});
    console.log('Cleared existing Learn data');

    for (const courseDef of COURSES) {
      const courseId = new mongoose.Types.ObjectId();
      const course = new LearnCourse({
        _id: courseId,
        title: courseDef.title,
        slug: courseDef.slug,
        provider: courseDef.provider,
        description: courseDef.description,
        icon: courseDef.icon,
        difficulty: 'Beginner',
        lessonCount: 0, 
        isPublished: true,
        order: courseDef.order
      });
      await course.save();
      console.log(`Created ${courseDef.title} course.`);

      const curriculumPath = path.join(__dirname, `${courseDef.slug}-curriculum.json`);
      if (!fs.existsSync(curriculumPath)) {
        console.warn(`No curriculum found for ${courseDef.slug} at ${curriculumPath}`);
        continue;
      }
      
      const curriculumData = JSON.parse(fs.readFileSync(curriculumPath, 'utf8'));

      let globalOrder = 1;
      let totalLessons = 0;
      const createdLessons = [];

      for (const module of curriculumData) {
        const moduleName = module.module;
        for (const lessonData of module.lessons) {
          const blocks = getBlocksForLesson(lessonData.slug, lessonData.title);

          const lesson = new LearnLesson({
            courseId: course._id,
            title: lessonData.title,
            slug: lessonData.slug,
            order: globalOrder,
            module: moduleName,
            difficulty: 'Beginner',
            estimatedReadMinutes: 5,
            excerpt: `Learn about ${lessonData.title} in this comprehensive lesson.`,
            contentBlocks: blocks,
            status: 'published',
            publishedAt: new Date()
          });
          await lesson.save();
          createdLessons.push(lesson);
          globalOrder++;
          totalLessons++;
        }
      }

      for (let i = 0; i < createdLessons.length; i++) {
        if (i > 0) createdLessons[i].prevLessonId = createdLessons[i - 1]._id;
        if (i < createdLessons.length - 1) createdLessons[i].nextLessonId = createdLessons[i + 1]._id;
        await createdLessons[i].save();
      }
      
      course.lessonCount = totalLessons;
      course.firstLessonSlug = createdLessons[0]?.slug;
      await course.save();
      console.log(`Created ${totalLessons} lessons for ${courseDef.title} and linked them.`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error seeding Learn DB:', err);
    process.exit(1);
  }
}

seed();
