import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { LearnLesson } from '../models/LearnLesson';
import { LearnLessonUpdate } from '../models/LearnLessonUpdate';
import { publishLessonUpdate } from '../services/lessonUpdate.service';

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

afterEach(async () => {
  await LearnLesson.deleteMany({});
  await LearnLessonUpdate.deleteMany({});
});

describe('publishLessonUpdate', () => {
  let lesson: any;
  
  beforeEach(async () => {
    lesson = await LearnLesson.create({
      courseId: new mongoose.Types.ObjectId(),
      title: 'Test Lesson',
      slug: 'test-lesson',
      excerpt: 'Test excerpt',
      contentBlocks: [
        { id: 'b1', type: 'paragraph', content: 'Hello' },
        { id: 'b2', type: 'paragraph', content: 'World' }
      ]
    });
  });

  it('successfully publishes a valid patch', async () => {
    const patch = {
      blockId: 'b1',
      newBlock: { id: 'b1', type: 'paragraph', content: 'Hello updated' }
    };

    const idempotencyKey = new mongoose.Types.ObjectId().toString();
    const result = await publishLessonUpdate({
      lessonId: lesson._id,
      expectedVersion: 1,
      idempotencyKey,
      updateType: 'content_update',
      summary: 'Updated hello',
      patches: [patch],
      createdBy: 'test',
      triggerType: 'manual'
    });

    expect(result.success).toBe(true);

    const updatedLesson = await LearnLesson.findById(lesson._id);
    expect(updatedLesson?.currentVersion).toBe(2);
    expect(updatedLesson?.contentBlocks[0].content).toBe('Hello updated');
    expect(updatedLesson?.lastMajorUpdateAt).toBeDefined();

    const history = await LearnLessonUpdate.findOne({ lessonId: lesson._id });
    expect(history?.versionTo).toBe(2);
    expect(history?.idempotencyKey).toBe(idempotencyKey);
  });

  it('rejects duplicate patch via idempotency key', async () => {
    const patch = {
      blockId: 'b1',
      newBlock: { id: 'b1', type: 'paragraph', content: 'Hello updated' }
    };
    const idempotencyKey = new mongoose.Types.ObjectId().toString();
    
    await publishLessonUpdate({
      lessonId: lesson._id,
      expectedVersion: 1,
      idempotencyKey,
      updateType: 'content_update',
      summary: 'Updated hello',
      patches: [patch],
      createdBy: 'test',
      triggerType: 'manual'
    });

    // Try again with expectedVersion 2 and same key
    await expect(publishLessonUpdate({
      lessonId: lesson._id,
      expectedVersion: 2,
      idempotencyKey,
      updateType: 'content_update',
      summary: 'Updated hello again',
      patches: [{
         blockId: 'b2',
         newBlock: { id: 'b2', type: 'paragraph', content: 'World updated' }
      }],
      createdBy: 'test',
      triggerType: 'manual'
    })).rejects.toThrow('Duplicate patch');
  });

  it('rejects stale version patch', async () => {
    await expect(publishLessonUpdate({
      lessonId: lesson._id,
      expectedVersion: 2, // Should be 1
      idempotencyKey: new mongoose.Types.ObjectId().toString(),
      updateType: 'content_update',
      summary: 'Updated hello',
      patches: [{ blockId: 'b1', newBlock: { id: 'b1', type: 'paragraph', content: 'Hello updated' } }],
      createdBy: 'test',
      triggerType: 'manual'
    })).rejects.toThrow('Stale patch');
  });

  it('rejects invalid block ID in patch', async () => {
    await expect(publishLessonUpdate({
      lessonId: lesson._id,
      expectedVersion: 1,
      idempotencyKey: new mongoose.Types.ObjectId().toString(),
      updateType: 'content_update',
      summary: 'Updated hello',
      patches: [{ blockId: 'invalid-id', newBlock: { id: 'invalid-id', type: 'paragraph', content: 'Hello updated' } }],
      createdBy: 'test',
      triggerType: 'manual'
    })).rejects.toThrow('Unknown block ID');
  });

  it('rejects mismatching block ID in new block structure', async () => {
    await expect(publishLessonUpdate({
      lessonId: lesson._id,
      expectedVersion: 1,
      idempotencyKey: new mongoose.Types.ObjectId().toString(),
      updateType: 'content_update',
      summary: 'Updated hello',
      patches: [{ blockId: 'b1', newBlock: { id: 'b2', type: 'paragraph', content: 'Hello updated' } }],
      createdBy: 'test',
      triggerType: 'manual'
    })).rejects.toThrow('Block ID mismatch');
  });
});
