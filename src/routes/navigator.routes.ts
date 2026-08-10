import express from 'express';
import rateLimit from 'express-rate-limit';
import { answerNavigatorQuestion, getAdjacentNavigatorContent, resolveNavigatorContent, searchNavigatorData } from '../controllers/navigator.controller';

const router = express.Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
router.post('/ask', limiter, answerNavigatorQuestion);
router.post('/content', limiter, resolveNavigatorContent);
router.get('/search', limiter, searchNavigatorData);
router.get('/adjacent', limiter, getAdjacentNavigatorContent);
export default router;
