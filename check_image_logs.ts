import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ImageStyleHistory } from './src/models/ImageStyleHistory';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || '';

async function checkLogs() {
  try {
    await mongoose.connect(MONGO_URI);
    
    // Get today's image generation histories
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const logs = await ImageStyleHistory.find({ createdAt: { $gte: startOfDay } }).sort({ createdAt: -1 }).limit(5);
    
    console.log("Recent Image Generation Logs:");
    logs.forEach(log => {
      console.log(`- Topic: ${log.prompt.substring(0, 50)}...`);
      console.log(`  Family: ${log.selectedFamily}`);
      console.log(`  Asset Key (Fallback): ${log.selectedAssetKey || 'None (Generated)'}`);
      console.log(`  Errors: ${JSON.stringify(log.validationErrors)}`);
      console.log(`  Upload Error: ${log.uploadError || 'None'}`);
      console.log('---');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
}

checkLogs();
