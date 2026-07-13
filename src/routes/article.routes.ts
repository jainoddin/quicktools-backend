import express from 'express';
import { getArticles, getArticleBySlug } from '../controllers/article.controller';

const router = express.Router();

router.get('/', getArticles);
router.get('/:slug', getArticleBySlug);

export default router;
