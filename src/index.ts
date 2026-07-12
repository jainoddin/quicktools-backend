import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db';
import blogRoutes from './routes/blog.routes';
import cronRoutes from './routes/cron.routes';
import toolsRoutes from './routes/tools.routes';
import authRoutes from './routes/auth.routes';
import paymentRoutes from './routes/payment.routes';
import userRoutes from './routes/user.routes';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import helmet from 'helmet';
import './services/auth.service'; // Register passport strategies
import { startCronJobs } from './cron/blogScheduler';

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://quicktools.ai',
    'https://quicktool.space',
    process.env.FRONTEND_URL
  ].filter(Boolean) as string[],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// ─── Routes ──────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('QuickTools.ai Backend API is Running! 🚀');
});
app.use('/api/blogs', blogRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/tools', toolsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/user', userRoutes);

// TEMPORARY FIX ROUTE FOR IMAGES & DUPLICATES
import { Blog } from './models/Blog';
app.get('/api/fix-blogs', async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ publishedAt: -1 });
    
    // 1. Give every existing blog a new random image
    const DYNAMIC_COVER_IMAGES = [
      'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=80',
      'https://images.unsplash.com/photo-1686191128892-3b37add4c844?w=800&q=80',
      'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80',
      'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=80',
      'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80',
      'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&q=80',
      'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800&q=80',
      'https://images.unsplash.com/photo-1558655146-d09347e92766?w=800&q=80',
      'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=800&q=80',
      'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=800&q=80',
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80',
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
      'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&q=80',
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
      'https://images.unsplash.com/photo-1488229297570-58520851e868?w=800&q=80',
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80',
    ];
    
    let updated = 0;
    for (const b of blogs) {
      const randomImg = DYNAMIC_COVER_IMAGES[Math.floor(Math.random() * DYNAMIC_COVER_IMAGES.length)];
      b.coverImage = randomImg;
      await b.save();
      updated++;
    }

    // 2. Delete duplicates from today (keep only the newest 1)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayBlogs = await Blog.find({ publishedAt: { $gte: startOfDay } }).sort({ publishedAt: -1 });
    
    let deleted = 0;
    if (todayBlogs.length > 1) {
      // Skip the first one (newest), delete the rest
      for (let i = 1; i < todayBlogs.length; i++) {
        await Blog.findByIdAndDelete(todayBlogs[i]._id);
        deleted++;
      }
    }

    res.json({ success: true, message: `Updated images for ${updated} blogs. Deleted ${deleted} duplicates from today.` });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as any).message });
  }
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Start ───────────────────────────────────────────────
const start = async () => {
  await connectDB();
  startCronJobs();

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api/blogs`);
    console.log(`⏰ Cron: Daily blog at 9:00 AM IST`);
  });
};

start();
