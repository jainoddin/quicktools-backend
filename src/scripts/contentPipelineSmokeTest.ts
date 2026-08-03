import assert from 'node:assert/strict';
import { deterministicReview, generateWithQualityGate, QualityResult } from '../services/contentQualityPipeline';
import { selectImageFamily } from '../services/imageQualityPipeline';

const valid = {
  topic: 'AI productivity', searchIntent: 'informational', title: 'Practical AI Productivity Workflows',
  slug: 'practical-ai-productivity-workflows', metaTitle: 'Practical AI Productivity Workflows',
  metaDescription: 'Learn practical AI productivity workflows with clear steps, useful examples, safe checks, and repeatable methods for improving everyday work.',
  coverImage: 'https://example.com/image.webp', content: Array(1250).fill('useful').join(' '),
};

const broken = deterministicReview('news', {
  title: 'Broken source', slug: 'broken-source', summary: 'short', metaTitle: 'Broken', metaDescription: 'short', heroImage: '', sourceName: '', sourceUrl: 'bad',
}, []);
assert.equal(broken.criticalIssues.length > 0, true, 'invalid payload must be rejected');

const duplicate = deterministicReview('blog', valid, ['Practical AI Productivity Workflows']);
assert.equal(duplicate.criticalIssues.some(issue => issue.includes('duplicate')), true, 'duplicate intent must be rejected');

const rotated = selectImageFamily('blog', 'Business', ['Modern SaaS', 'Modern SaaS', 'Workspace']);
assert.notEqual(rotated, 'Modern SaaS', 'same image family must not be selected consecutively');

const failed: QualityResult = {
  passed: false, score: 60, issues: ['forced test failure'], criticalIssues: [], deterministicErrors: [],
  scores: { deterministic: 100, fact: 60, seo: 60, readability: 60 },
};
async function main() {
  let generated = 0;
  const result = await generateWithQualityGate({
    kind: 'blog', existingTitles: [], generate: async () => ({ ...valid, attempt: ++generated }), review: async () => failed,
  });
  assert.equal(generated, 3, 'initial attempt plus two regenerations required');
  assert.equal(result.content, null, 'three failed attempts must skip publication');
  assert.equal(result.reviews.length, 3, 'all attempts must be retained');
  let exceptionAttempts = 0;
  const exceptionResult = await generateWithQualityGate({
    kind: 'blog', existingTitles: [], generate: async () => { exceptionAttempts++; throw new Error('malformed JSON'); },
  });
  assert.equal(exceptionAttempts, 3, 'generator exceptions must receive two retries');
  assert.equal(exceptionResult.content, null, 'generator exceptions must never publish');
  let reviewAttempts = 0;
  const reviewExceptionResult = await generateWithQualityGate({
    kind: 'blog', existingTitles: [], generate: async () => valid,
    review: async () => { reviewAttempts++; throw new Error('malformed reviewer JSON'); },
  });
  assert.equal(reviewAttempts, 3, 'reviewer exceptions must receive two retries');
  assert.equal(reviewExceptionResult.content, null, 'reviewer exceptions must never publish');
  console.log(JSON.stringify({ intentionalFailure: 'PASS', duplicateIntent: 'PASS', regenerationAndSkip: 'PASS', generationExceptionRetry: 'PASS', reviewerExceptionRetry: 'PASS', recentStyleRotation: 'PASS', attempts: generated }));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
