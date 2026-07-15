import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

export const connectDB = async (): Promise<void> => {
  if (!MONGODB_URI || MONGODB_URI.includes('<username>')) {
    console.warn('⚠️ MongoDB URI not configured. Skipping connection...');
    return;
  }

  // Already connected or connecting
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return;
  }

  const tryConnect = async () => {
    try {
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 15000,  // 15s timeout
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        family: 4,
      });
      console.log('✅ MongoDB connected successfully');
    } catch (error) {
      console.error('❌ MongoDB connection failed. Retrying in 30s...', (error as Error).message);
      // Retry after 30 seconds (handles Atlas auto-pause resume)
      setTimeout(tryConnect, 30000);
    }
  };

  // Reconnect on disconnect (Atlas cluster pause/resume)
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
    setTimeout(tryConnect, 5000);
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB error:', err.message);
  });

  mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected successfully');
  });

  await tryConnect();
};
