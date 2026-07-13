import 'dotenv/config';
import { connectDB } from '../config/db';
import { News } from '../models/News';
import { generateNews } from '../services/newsGenerator';
import mongoose from 'mongoose';

async function seedNews() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Optionally clear existing news
    // await News.deleteMany({});
    // console.log('🗑️  Cleared existing news');

    const newsToGenerate = 4; // Generate 4 news items for the UI showcase

    for (let i = 0; i < newsToGenerate; i++) {
      console.log(`\n📰 Generating News ${i + 1}/${newsToGenerate}...`);
      
      try {
        const newsData = await generateNews();
        
        // Ensure the first one is breaking news for the UI hero section
        if (i === 0) {
          newsData.isBreaking = true;
        }

        const news = new News(newsData);
        await news.save();
        console.log(`✅ Successfully saved News: ${news.title}`);
      } catch (genError) {
        console.error(`❌ Failed to generate/save news ${i + 1}:`, genError);
      }
      
      // Delay to avoid rate limits
      if (i < newsToGenerate - 1) {
        console.log('⏳ Waiting 5 seconds before next generation...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    console.log('\n🎉 News seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedNews();
