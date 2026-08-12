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
import articleRoutes from './routes/article.routes';
import newsRoutes from './routes/news.routes';
import subscriberRoutes from './routes/subscriberRoutes';
import statsRoutes from './routes/stats.routes';
import contactRoutes from './routes/contact.routes';
import adminRoutes from './routes/admin.routes';
import adminSeoRoutes from './routes/adminSeo.routes';
import communityRoutes from './routes/community.routes';
import uploadRoutes from './routes/upload.routes';
import learnRoutes from './routes/learn.route';
import promptRoutes from './routes/prompt.routes';
import navigatorRoutes from './routes/navigator.routes';
import adminPromptRoutes from './routes/adminPrompt.routes';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import helmet from 'helmet';
import './services/auth.service'; // Register passport strategies
import { startCronJobs } from './cron/blogScheduler';
import { startSocialMediaCron } from './cron/socialMediaScheduler';
import { startReportingCron } from './cron/reportingScheduler';
import { startPromptCron } from './cron/promptScheduler';
import rateLimit from 'express-rate-limit';
import { FRONTEND_URL, PORT, isProd, validateRuntimeEnvironment } from './config/env';

validateRuntimeEnvironment();

const app = express();

// ─── Middleware ───────────────────────────────────────────
app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const allowedOrigins = new Set(
  [
    'https://quicktools.ai',
    'https://www.quicktools.ai',   // www variant
    'https://quicktool.space',
    'https://www.quicktool.space', // www variant
    FRONTEND_URL,
    ...(isProd ? [] : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3005']),
  ].filter(Boolean)
);

app.use(
  cors({
    origin(origin, cb) {
      // allow non-browser clients (curl/postman) with no origin
      if (!origin) return cb(null, true);
      
      // Allow any local LAN IP during development for mobile testing
      if (!isProd && (origin.startsWith('http://192.168.') || origin.startsWith('http://10.') || origin.startsWith('http://172.'))) {
        return cb(null, true);
      }

      if (allowedOrigins.has(origin)) {
        return cb(null, true);
      }
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

// Cookie-authenticated mutations must originate from a trusted browser origin.
// Requests without Origin remain allowed for trusted server-to-server clients.
app.use((req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const fetchSite = req.get('sec-fetch-site');
  if (fetchSite === 'cross-site') {
    return res.status(403).json({ error: 'Cross-site mutation rejected' });
  }
  const origin = req.get('origin');
  const referer = req.get('referer');
  const browserOrigin = origin || (() => {
    if (!referer) return undefined;
    try {
      return new URL(referer).origin;
    } catch {
      return undefined;
    }
  })();

  // CLI/webhook/server clients normally send neither Origin nor Referer.
  if (!browserOrigin) return next();
  const localDevelopmentOrigin = !isProd && /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.)/.test(browserOrigin);
  if (allowedOrigins.has(browserOrigin) || localDevelopmentOrigin) return next();
  return res.status(403).json({ error: 'Untrusted request origin' });
});

// ─── Routes ──────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('QuickTools.ai Backend API is Running! 🚀');
});
app.use('/api/blogs', blogRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/tools', toolsRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/user', userRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/subscribe', subscriberRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/seo', adminSeoRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/learn', learnRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/navigator', navigatorRoutes);
app.use('/api/admin/prompts', adminPromptRoutes);

// /api/fix-blogs REMOVED — was a public destructive endpoint (security risk)

// URL Shortener Redirect
import { ShortUrl } from './models/ShortUrl';
app.get('/s/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;
    const url = await ShortUrl.findOne({ shortCode });
    if (url) {
      url.clicks += 1;
      await url.save();
      return res.redirect(url.originalUrl);
    }
    return res.status(404).send('Short URL not found');
  } catch (error) {
    console.error('URL redirect error:', error);
    res.status(500).send('Server Error');
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
  startSocialMediaCron();
  startReportingCron();
  startPromptCron();
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api/blogs`);
    console.log(`⏰ Cron: Daily blog at 9:00 AM IST`);
  });
};

start();
