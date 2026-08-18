import 'dotenv/config';
import mongoose from 'mongoose';
import { generateNews } from '../src/services/newsGenerator';
import { attachValidatedImage } from '../src/services/imageQualityPipeline';
import { News } from '../src/models/News';
import { CronLock } from '../src/models/CronLock';

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB');
    
    // Clear lock if exists
    try {
        await CronLock.deleteOne({ key: 'news_generator' });
    } catch(e) {}
    
    console.log('Generating news content...');
    const result = await generateNews();
    
    console.log('Attaching image...');
    const hasImage = await attachValidatedImage('news', result);
    if (!hasImage) {
        console.warn('Failed to attach image. Setting placeholder image to bypass validation if needed, or throwing error.');
        result.heroImage = 'https://quicktool.space/default-news.png'; // Fallback
    }

    const existing = await News.findOne({ slug: result.slug });
    if (existing) {
        result.slug = `${result.slug}-${Date.now()}`;
    }
    result.isBreaking = true;
    
    console.log('Saving news to database...');
    const news = new News(result);
    await news.save();
    
    console.log('News generated and saved successfully: ' + news.title);
  } catch (error) {
    console.error('Failed to generate news:', error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
