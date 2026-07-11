import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

let isConnected = false;

export const connectDB = async (): Promise<void> => {
  if (isConnected) {
    console.log('✅ MongoDB already connected');
    return;
  }

  try {
    if (!MONGODB_URI || MONGODB_URI.includes('<username>')) {
      console.warn('⚠️ MongoDB URI not configured yet. Skipping connection...');
      return;
    }
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    // process.exit(1);
  }
};
