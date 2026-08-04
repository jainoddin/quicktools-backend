import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quicktools';

// Minimal schema for seeding
const QuestionSchema = new mongoose.Schema({
  slug: String,
  title: String,
  body: String,
  excerpt: String,
  category: String,
  tags: [String],
  author: {
    name: String,
    isGuest: Boolean
  },
  status: String,
  createdAt: Date
});

const CommunityQuestion = mongoose.models.CommunityQuestion || mongoose.model('CommunityQuestion', QuestionSchema);

const seedData = [
  {
    slug: 'how-to-optimize-react-apps-for-performance-' + Date.now(),
    title: 'How to optimize React applications for better performance in 2026?',
    body: 'I am looking for the best practices to optimize large-scale React applications. What are the modern techniques to reduce bundle size and improve rendering speed?',
    excerpt: 'Looking for modern techniques to optimize React applications for performance.',
    category: 'Development',
    tags: ['react', 'performance', 'frontend'],
    author: { name: 'ReactNinja', isGuest: true },
    status: 'visible',
    createdAt: new Date()
  },
  {
    slug: 'best-ai-tools-for-video-editing-' + Date.now(),
    title: 'What are the best AI tools for automated video editing?',
    body: 'I have a lot of raw footage and I want to automate the editing process. Are there any reliable AI tools that can cut silent parts and add subtitles automatically?',
    excerpt: 'Searching for AI video editing tools that automate cuts and subtitles.',
    category: 'AI Tools',
    tags: ['video', 'ai', 'editing'],
    author: { name: 'VideoCreator', isGuest: true },
    status: 'visible',
    createdAt: new Date(Date.now() - 86400000)
  },
  {
    slug: 'getting-started-with-nextjs-16-' + Date.now(),
    title: 'Getting started with Next.js 16: What are the key new features?',
    body: 'I am planning to migrate my app to Next.js 16. What are the biggest breaking changes and the most useful new features I should be aware of?',
    excerpt: 'Key new features and breaking changes in Next.js 16.',
    category: 'Development',
    tags: ['nextjs', 'javascript', 'web'],
    author: { name: 'NextFan', isGuest: true },
    status: 'visible',
    createdAt: new Date(Date.now() - 2 * 86400000)
  },
  {
    slug: 'midjourney-v7-prompts-guide-' + Date.now(),
    title: 'Midjourney v7 prompt guide for photorealistic portraits',
    body: 'Can someone share their best prompt structures for generating hyper-realistic portraits in Midjourney v7? I struggle with getting the lighting right.',
    excerpt: 'Looking for Midjourney v7 prompts to generate photorealistic portraits.',
    category: 'Prompt Engineering',
    tags: ['midjourney', 'prompts', 'art'],
    author: { name: 'AI_Artist', isGuest: true },
    status: 'visible',
    createdAt: new Date(Date.now() - 3 * 86400000)
  },
  {
    slug: 'seo-strategies-for-ai-generated-content-' + Date.now(),
    title: 'SEO strategies for blogs that use AI-generated content',
    body: 'Google has been updating its algorithms. Is it still safe to use AI for blog writing? What SEO strategies work best to ensure AI content ranks well?',
    excerpt: 'How to rank AI-generated content safely in modern SEO.',
    category: 'Marketing',
    tags: ['seo', 'marketing', 'content'],
    author: { name: 'SEO_Pro', isGuest: true },
    status: 'visible',
    createdAt: new Date(Date.now() - 4 * 86400000)
  },
  {
    slug: 'figma-vs-penpot-for-ui-design-' + Date.now(),
    title: 'Figma vs Penpot: Which is better for UI design teams?',
    body: 'Our team is considering moving away from Figma due to pricing. Is Penpot a viable alternative for a team of 10 designers?',
    excerpt: 'Comparing Figma and Penpot for UI design teams.',
    category: 'Design',
    tags: ['design', 'figma', 'ui'],
    author: { name: 'UX_Designer', isGuest: true },
    status: 'visible',
    createdAt: new Date(Date.now() - 5 * 86400000)
  },
  {
    slug: 'how-to-build-a-saas-with-no-code-' + Date.now(),
    title: 'How to build a SaaS MVP using only no-code tools?',
    body: 'I want to build a SaaS application but I don\'t know how to code. Which no-code stack (e.g., Bubble, Webflow, Xano) is best for a quick MVP?',
    excerpt: 'Best no-code stack for building a SaaS MVP quickly.',
    category: 'Business',
    tags: ['nocode', 'saas', 'startup'],
    author: { name: 'Founder101', isGuest: true },
    status: 'visible',
    createdAt: new Date(Date.now() - 6 * 86400000)
  },
  {
    slug: 'best-practices-for-api-rate-limiting-' + Date.now(),
    title: 'Best practices for implementing API rate limiting in Node.js',
    body: 'What are the industry standards for rate-limiting public APIs in a Node.js/Express environment? Should I use Redis?',
    excerpt: 'Industry standards for rate-limiting Node.js APIs.',
    category: 'Development',
    tags: ['nodejs', 'api', 'backend'],
    author: { name: 'BackendDev', isGuest: true },
    status: 'visible',
    createdAt: new Date(Date.now() - 7 * 86400000)
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    await CommunityQuestion.insertMany(seedData);
    console.log('Successfully inserted 8 questions!');
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seed();
