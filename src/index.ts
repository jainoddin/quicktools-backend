import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db';
import blogRoutes from './routes/blog.routes';
import cronRoutes from './routes/cron.routes';
import { startCronJobs } from './cron/blogScheduler';

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// ─── Routes ──────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('QuickTools.ai Backend API is Running! 🚀');
});
app.use('/api/blogs', blogRoutes);
app.use('/api/cron', cronRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Start ───────────────────────────────────────────────
const start = async () => {
  await connectDB();
  startCronJobs();

  app.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api/blogs`);
    console.log(`⏰ Cron: Daily blog at 9:00 AM IST`);
  });
};

start();
