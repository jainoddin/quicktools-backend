import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db';
import blogRoutes from './routes/blog.routes';
import cronRoutes from './routes/cron.routes';
import toolsRoutes from './routes/tools.routes';
import authRoutes from './routes/auth.routes';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { startCronJobs } from './cron/blogScheduler';

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────
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
