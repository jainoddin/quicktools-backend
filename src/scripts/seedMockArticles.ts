import 'dotenv/config';
import { connectDB } from '../config/db';
import { Article } from '../models/Article';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const MOCK_DATA = [
  { title: "Best AI Resume Builders in 2026", category: "AI & Tools", views: "15.2K views", offsetDays: 1, image: "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=1200&q=80" },
  { title: "Top AI Video Generators for Marketers", category: "Marketing", views: "8.4K views", offsetDays: 2, image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80" },
  { title: "Best AI Image Generators for Designers", category: "Design", views: "24.1K views", offsetDays: 3, image: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=1200&q=80" },
  { title: "Essential AI Tools for Small Businesses", category: "Business", views: "3.2K views", offsetDays: 4, image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&q=80" },
  { title: "AI Website Builders Evaluated in 2026", category: "Development", views: "1.1K views", offsetDays: 5, image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&q=80" },
  { title: "AI Writing Assistants Comparison Guide", category: "Productivity", views: "45.8K views", offsetDays: 6, image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80" },
  { title: "How to Build an AI Chatbot Tutorial", category: "Tutorials", views: "9.5K views", offsetDays: 7, image: "https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=1200&q=80" },
  { title: "OpenAI Announces New Vision Model", category: "News & Updates", views: "102K views", offsetDays: 0, image: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=1200&q=80" },
];

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function seed() {
  await connectDB();
  console.log('🔗 Connected to DB');
  
  await Article.deleteMany({});
  console.log('🗑️ Cleared old articles');

  for (const item of MOCK_DATA) {
    const slug = generateSlug(item.title);
    
    const existing = await Article.findOne({ slug });
    if (existing) {
      console.log(`⚠️ Skipping existing: ${item.title}`);
      continue;
    }

    const publishedAt = new Date();
    publishedAt.setDate(publishedAt.getDate() - item.offsetDays);

    // Download AI image locally to prevent browser rate-limiting
    console.log(`🖼️ Generating AI image for: ${item.title}...`);
    const prompt = encodeURIComponent(item.title + ' clean modern tech editorial photography 8k resolution highly detailed');
    const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=1200&height=800&nologo=true&seed=${Math.floor(Math.random() * 10000)}`;
    const imageRes = await fetch(imageUrl);
    const arrayBuffer = await imageRes.arrayBuffer();
    
    const imageDir = path.join(__dirname, '../../../frontend/public/mock-articles');
    if (!fs.existsSync(imageDir)) {
      fs.mkdirSync(imageDir, { recursive: true });
    }
    const localImagePath = `/mock-articles/${slug}.jpg`;
    fs.writeFileSync(path.join(imageDir, `${slug}.jpg`), Buffer.from(arrayBuffer));
    
    // Wait 2 seconds to respect free API rate limits during seeding
    await new Promise(r => setTimeout(r, 2000));

    const article = new Article({
      slug,
      title: item.title,
      description: `A comprehensive guide and review about ${item.title.toLowerCase()}. Discover the best tools and practices to improve your workflow.`,
      category: item.category,
      tags: ["AI", item.category.replace(' & ', ''), "2026"],
      coverImage: localImagePath,
      author: {
        name: 'QuickTools AI Team',
        avatar: 'https://ui-avatars.com/api/?name=QuickTools+AI&background=6D5EF8&color=fff',
        isVerified: true,
        bio: 'AI enthusiasts and researchers passionate about the future of artificial intelligence and productivity.'
      },
      readTime: `${Math.floor(Math.random() * 10) + 4} min read`,
      publishedAt,
      views: item.views,
      
      content: `## Introduction\n\nWelcome to the ultimate guide on **${item.title}**. In today's fast-paced digital world, leveraging artificial intelligence is no longer optional—it's a necessity for staying competitive.\n\n### Why this matters\n\nAI tools can save you countless hours every week, automate mundane tasks, and unlock new levels of creativity. In this article, we'll dive deep into the top solutions available, comparing their features, pricing, and overall value.\n\n## Top Tools Overview\n\nHere are some of the standout platforms in this category...\n\n### Tool 1\n\nThis is a fantastic option for beginners.\n\n### Tool 2\n\nPerfect for enterprise teams with complex needs.\n\n## Conclusion\n\nEmbracing these AI solutions will drastically improve your productivity and output quality. Don't hesitate to test a few options to see which best fits your workflow.`,
      tableOfContents: [
        { id: 1, title: "Introduction", isActive: true },
        { id: 2, title: "Top Tools Overview", isActive: false },
        { id: 3, title: "Conclusion", isActive: false }
      ],
      whatYoullLearn: [
        "The best tools currently available in the market",
        "How to evaluate pricing versus features",
        "Actionable tips for integrating these tools into your daily routine"
      ],
      prosAndCons: {
        pros: ["Increases efficiency significantly", "Reduces human error", "Scales easily with your business"],
        cons: ["Learning curve can be steep for some tools", "Premium features often require paid subscriptions"]
      },
      comparisonTable: {
        headers: ["Tool Name", "Starting Price", "Best For", "Our Rating"],
        rows: [
          ["Basic AI", "$0/mo", "Beginners", "4.2/5"],
          ["Pro AI", "$20/mo", "Professionals", "4.8/5"],
          ["Enterprise AI", "Custom", "Large Teams", "4.5/5"]
        ]
      },
      faq: [
        { question: `Are these ${item.category} tools free?`, answer: "Many offer free tiers or trials, but advanced features typically require a paid subscription." },
        { question: "Is my data safe with these AI tools?", answer: "Most reputable platforms have strong privacy policies, but you should always review their terms before uploading sensitive information." }
      ],
      
      relatedSlugs: [],
      internalLinks: [
        { anchor: "More AI Tools", path: "/articles" }
      ],
      externalLinks: [
        { anchor: "Learn more about AI", url: "https://en.wikipedia.org/wiki/Artificial_intelligence" }
      ],
      
      metaTitle: `${item.title} | QuickTools.ai`,
      metaDescription: `Read our in-depth guide on ${item.title.toLowerCase()}. Compare top tools, features, and pricing to find the perfect fit for your needs.`
    });

    await article.save();
    console.log(`✅ Saved mock article: ${item.title}`);
  }

  console.log('🎉 Done seeding!');
  process.exit(0);
}

seed();
