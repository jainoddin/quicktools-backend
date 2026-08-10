import express from 'express';
import { getPrompts, getPromptBySlug, trackAction, toggleFavorite, getStats, getMyFavorites, generatePrompt } from '../controllers/prompt.controller';
import { optionalAuth, verifyAuth } from '../middlewares/auth.middleware';
import rateLimit from 'express-rate-limit';

const router = express.Router();
const promptGenerationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many prompt generation requests. Please try again later.' } });
const promptTrackingLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many tracking requests. Please try again later.' } });

router.get('/', getPrompts);
router.get('/stats', getStats);
router.get('/favorites/me', verifyAuth, getMyFavorites);
router.post('/generate', promptGenerationLimiter, generatePrompt);
router.get('/:slug', getPromptBySlug);
router.post('/:id/track', promptTrackingLimiter, optionalAuth, trackAction);
router.post('/:slug/favorite', verifyAuth, toggleFavorite);

export default router;
