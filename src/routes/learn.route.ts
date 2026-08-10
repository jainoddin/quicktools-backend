import { Router } from 'express';
import { getCourses, getCourseBySlug, getLessonBySlug, searchLearn, getProgress, updateLessonProgress, addBookmark, removeBookmark } from '../controllers/learn.controller';
import { verifyAuth } from '../middlewares/auth.middleware';

const router = Router();

// Public Routes
router.get('/courses', getCourses);
router.get('/search', searchLearn);
router.get('/courses/:courseSlug', getCourseBySlug);
router.get('/courses/:courseSlug/lessons/:lessonSlug', getLessonBySlug);

// Protected Routes
router.get('/progress', verifyAuth, getProgress);
router.post('/progress/lesson', verifyAuth, updateLessonProgress);
router.post('/bookmarks/:lessonId', verifyAuth, addBookmark);
router.delete('/bookmarks/:lessonId', verifyAuth, removeBookmark);

export default router;
