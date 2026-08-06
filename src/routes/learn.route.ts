import { Router } from 'express';
import { getCourses, getCourseBySlug, getLessonBySlug, searchLearn, getProgress, updateLessonProgress, addBookmark, removeBookmark } from '../controllers/learn.controller';

// Note: Ensure `authMiddleware` is implemented in your project before using these.
// We mock it here if not available, but you should replace it with your actual auth middleware.
const mockAuthMiddleware = (req: any, res: any, next: any) => {
  // Replace with actual auth extraction
  req.user = { _id: 'mock-user-id' }; 
  next();
};

const router = Router();

// Public Routes
router.get('/courses', getCourses);
router.get('/search', searchLearn);
router.get('/courses/:courseSlug', getCourseBySlug);
router.get('/courses/:courseSlug/lessons/:lessonSlug', getLessonBySlug);

// Protected Routes (Assuming mockAuthMiddleware for now)
router.get('/progress', mockAuthMiddleware, getProgress);
router.post('/progress/lesson', mockAuthMiddleware, updateLessonProgress);
router.post('/bookmarks/:lessonId', mockAuthMiddleware, addBookmark);
router.delete('/bookmarks/:lessonId', mockAuthMiddleware, removeBookmark);

export default router;
