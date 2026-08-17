import { Request, Response } from 'express';
import { LearnCourse } from '../models/LearnCourse';
import { LearnLesson } from '../models/LearnLesson';
import { LearnProgress } from '../models/LearnProgress';
import { LearnBookmark } from '../models/LearnBookmark';
import { LearnQuiz } from '../models/LearnQuiz';
import { LearnQuizAttempt } from '../models/LearnQuizAttempt';
import { Prompt } from '../models/Prompt';

// Public endpoints
export const getCourses = async (req: Request, res: Response) => {
  try {
    const courses = await LearnCourse.find({ isPublished: true }).sort({ order: 1 });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

export const getCourseBySlug = async (req: Request, res: Response) => {
  try {
    const course = await LearnCourse.findOne({ slug: req.params.courseSlug, isPublished: true });
    if (!course) return res.status(404).json({ error: 'Course not found' });
    
    const lessons = await LearnLesson.find({ courseId: course._id, status: 'published' }).sort({ order: 1 }).select('-contentBlocks');
    res.json({ course, lessons });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch course' });
  }
};

export const getLessonBySlug = async (req: Request, res: Response) => {
  try {
    const course = await LearnCourse.findOne({ slug: req.params.courseSlug, isPublished: true });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const lesson = await LearnLesson.findOne({ courseId: course._id, slug: req.params.lessonSlug, status: 'published' });
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

    // Older seeded lessons may not have explicit previous/next IDs. Fall back to
    // the stable course order so navigation remains complete without mutating data.
    const [previousLesson, nextLesson] = await Promise.all([
      lesson.previousLessonId
        ? LearnLesson.findById(lesson.previousLessonId).select('slug title order')
        : LearnLesson.findOne({ courseId: course._id, status: 'published', order: { $lt: lesson.order } }).sort({ order: -1 }).select('slug title order'),
      lesson.nextLessonId
        ? LearnLesson.findById(lesson.nextLessonId).select('slug title order')
        : LearnLesson.findOne({ courseId: course._id, status: 'published', order: { $gt: lesson.order } }).sort({ order: 1 }).select('slug title order'),
    ]);

    const searchTerms = [course.title, lesson.title, ...(lesson.tags || [])]
      .join(' ')
      .split(/[^a-z0-9]+/i)
      .filter((term) => term.length >= 4)
      .slice(0, 8);
    const relatedPromptQuery = lesson.relatedPromptIds?.length
      ? { _id: { $in: lesson.relatedPromptIds }, status: 'published' }
      : {
          status: 'published',
          $or: searchTerms.length
            ? searchTerms.flatMap((term) => [
                { title: { $regex: term, $options: 'i' } },
                { tags: { $regex: term, $options: 'i' } },
              ])
            : [{ category: 'Productivity' }],
        };
    const relatedPrompts = await Prompt.find(relatedPromptQuery)
      .sort({ qualityScore: -1, publishedAt: -1 })
      .limit(4)
      .select('title slug description category models')
      .lean();

    res.json({ course: { _id: course._id, title: course.title, slug: course.slug, icon: course.icon }, lesson, previousLesson, nextLesson, relatedPrompts });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch lesson' });
  }
};

export const searchLearn = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') return res.json([]);
    
    // Very basic regex search for demo purposes (production would use Atlas Search or text indexes)
    const escapedQuery = q.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!escapedQuery) return res.json({ courses: [], lessons: [] });
    const regex = new RegExp(escapedQuery, 'i');
    
    const courses = await LearnCourse.find({ title: regex, isPublished: true });
    const lessons = await LearnLesson.find({ 
      status: 'published',
      $or: [
        { title: regex },
        { excerpt: regex },
        { tags: regex }
      ]
    }).populate('courseId', 'slug title');

    res.json({ courses, lessons });
  } catch (err) {
    res.status(500).json({ error: 'Failed to search' });
  }
};

// User authenticated endpoints
export const getProgress = async (req: Request, res: Response) => {
  try {
    const progress = await LearnProgress.find({ userId: (req.user as any)?._id });
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
};

export const updateLessonProgress = async (req: Request, res: Response) => {
  try {
    const { courseId, lessonId } = req.body;
    let progress = await LearnProgress.findOne({ userId: (req.user as any)?._id, courseId });
    
    if (!progress) {
      progress = new LearnProgress({
        userId: (req.user as any)?._id,
        courseId,
        completedLessonIds: [lessonId],
        currentLessonId: lessonId,
        progressPercentage: 0
      });
    } else {
      if (!progress.completedLessonIds.includes(lessonId)) {
        progress.completedLessonIds.push(lessonId);
      }
      progress.currentLessonId = lessonId;
    }

    const course = await LearnCourse.findById(courseId);
    if (course && course.lessonCount > 0) {
      progress.progressPercentage = Math.round((progress.completedLessonIds.length / course.lessonCount) * 100);
    }

    await progress.save();
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update progress' });
  }
};

export const addBookmark = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    await LearnBookmark.findOneAndUpdate(
      { userId: (req.user as any)?._id, lessonId },
      { userId: (req.user as any)?._id, lessonId },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add bookmark' });
  }
};

export const removeBookmark = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    await LearnBookmark.findOneAndDelete({ userId: (req.user as any)?._id, lessonId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove bookmark' });
  }
};
