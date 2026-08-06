import mongoose from 'mongoose';
import axios from 'axios';
import { LearnLesson, ILearnLesson } from '../models/LearnLesson';
import { LearnLessonUpdate } from '../models/LearnLessonUpdate';
import { LearnRevalidationJob } from '../models/LearnRevalidationJob';
import { LearnCourse } from '../models/LearnCourse';

interface PatchBlock {
  blockId: string;
  newBlock: any;
}

interface PublishUpdateParams {
  lessonId: mongoose.Types.ObjectId | string;
  expectedVersion: number;
  idempotencyKey: string;
  updateType: 'new_lesson' | 'content_update' | 'major_feature';
  summary: string;
  patches: PatchBlock[];
  primaryUpdateAnchor?: string;
  sourceReferences?: string[];
  createdBy: string;
  triggerType: 'manual' | 'automation' | 'admin';
}

let transactionsSupported: boolean | null = null;

export async function verifyTransactionSupport() {
  if (transactionsSupported !== null) return transactionsSupported;
  
  try {
    const admin = mongoose.connection.db?.admin();
    if (!admin) {
      console.warn('Could not verify MongoDB transaction support (no admin access). Assuming false.');
      transactionsSupported = false;
      return false;
    }
    const info = await admin.command({ replSetGetStatus: 1 }).catch(() => null);
    if (info && info.ok) {
      transactionsSupported = true;
      return true;
    }
    
    // Check mongos for sharded clusters which also support transactions
    const isMaster = await admin.command({ isMaster: 1 }).catch(() => null);
    if (isMaster && isMaster.msg === 'isdbgrid') {
      transactionsSupported = true;
      return true;
    }
    
    transactionsSupported = false;
    return false;
  } catch (err) {
    console.error('Error verifying transaction support:', err);
    transactionsSupported = false;
    return false;
  }
}

export async function publishLessonUpdate(params: PublishUpdateParams) {
  if (transactionsSupported === false) {
    throw new Error('Transaction support verification failed: MongoDB deployment is not a replica set. Lesson patch publishing is disabled for safety. Do not fall back to unsafe partial writes.');
  }

  // Ensure verification has run at least once if not explicitly called at startup
  if (transactionsSupported === null) {
    const supported = await verifyTransactionSupport();
    if (!supported) {
      throw new Error('Transaction support verification failed: MongoDB deployment is not a replica set. Lesson patch publishing is disabled for safety. Do not fall back to unsafe partial writes.');
    }
  }

  const session = await mongoose.startSession();

  let courseSlug = '';
  let lessonSlug = '';
  let revalidationSuccess = false;

  try {
    await session.withTransaction(async () => {
      // 1. Fetch lesson
      const lesson = await LearnLesson.findById(params.lessonId).session(session);
      if (!lesson) {
        throw new Error('Lesson not found');
      }

      // Fetch course for revalidation slugs
      const course = await LearnCourse.findById(lesson.courseId).session(session);
      courseSlug = course?.slug || '';
      lessonSlug = lesson.slug;

      // 2. Validate expected version
      if (lesson.currentVersion !== params.expectedVersion) {
        throw new Error(`Stale patch: Expected version ${params.expectedVersion} but got ${lesson.currentVersion}`);
      }

      // 3. Validate patches
      if (!params.patches || params.patches.length === 0) {
        throw new Error('Empty patch: No blocks provided');
      }

      const validBlockIds = new Set(lesson.contentBlocks.map((b: any) => b.id));
      const changedBlockIds: string[] = [];
      const newBlocks = [...lesson.contentBlocks];

      for (const patch of params.patches) {
        if (!validBlockIds.has(patch.blockId)) {
          throw new Error(`Unknown block ID: ${patch.blockId}`);
        }
        if (patch.newBlock.id !== patch.blockId) {
          throw new Error(`Block ID mismatch: Patch targets ${patch.blockId} but new block has id ${patch.newBlock.id}`);
        }
        
        const idx = newBlocks.findIndex(b => b.id === patch.blockId);
        if (idx !== -1) {
          newBlocks[idx] = patch.newBlock;
          changedBlockIds.push(patch.blockId);
        }
      }

      // 4. Update Lesson Document
      lesson.contentBlocks = newBlocks;
      lesson.currentVersion += 1;
      lesson.lastUpdatedAt = new Date();
      lesson.lastMajorUpdateAt = new Date();
      lesson.updateSummary = params.summary;
      lesson.updateType = params.updateType;
      lesson.updatedBlockIds = changedBlockIds;
      if (params.primaryUpdateAnchor) {
        lesson.primaryUpdateAnchor = params.primaryUpdateAnchor;
      }
      
      await lesson.save({ session });

      // 5. Create History Record
      const history = new LearnLessonUpdate({
        lessonId: lesson._id,
        versionFrom: params.expectedVersion,
        versionTo: lesson.currentVersion,
        expectedVersion: params.expectedVersion,
        summary: params.summary,
        updateType: params.updateType,
        changedBlockIds,
        sourceReferences: params.sourceReferences || [],
        createdBy: params.createdBy,
        triggerType: params.triggerType,
        idempotencyKey: params.idempotencyKey
      });

      // Mongoose unique index will throw if idempotencyKey is duplicate
      await history.save({ session });
    });
  } catch (err: any) {
    if (err.code === 11000 && err.message.includes('idempotencyKey')) {
      throw new Error(`Duplicate patch: idempotencyKey ${params.idempotencyKey} already exists.`);
    }
    throw err;
  } finally {
    await session.endSession();
  }

  // 6. External Cache Revalidation (outside transaction)
  if (courseSlug && lessonSlug) {
    const cacheKey = `learn-course-${courseSlug}-lesson-${lessonSlug}`;
    try {
      const response = await axios.post(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/internal/revalidate-learn`, {
        courseSlug,
        lessonSlug
      }, {
        headers: {
          Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`
        }
      });
      if (response.status === 200) {
        revalidationSuccess = true;
      }
    } catch (apiError: any) {
      console.error('Frontend revalidation failed:', apiError.message);
    }

    if (!revalidationSuccess) {
      try {
        await LearnRevalidationJob.create({
          courseSlug,
          lessonSlug,
          cacheKey,
          status: 'pending',
          attempts: 0,
          nextRetryAt: new Date(Date.now() + 5 * 60 * 1000) // Retry in 5 mins
        });
      } catch (jobErr: any) {
        if (jobErr.code === 11000) {
          // Already a pending job for this cacheKey, ignore
        } else {
          console.error('Failed to create revalidation job:', jobErr);
        }
      }
    }
  }

  return { success: true, revalidationSuccess };
}
