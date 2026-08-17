const test = require('node:test');
const assert = require('node:assert/strict');
const { isLikelyDuplicateIntent } = require('../dist/services/promptGenerator');

test('rejects paraphrased prompts that target the same search intent', () => {
  assert.equal(
    isLikelyDuplicateIntent(
      'Write a High-Converting Thought Leadership Article',
      'Turn an expert idea into an authoritative LinkedIn article.',
      'Create an Engaging Thought Leadership Article',
      'Transform an expert concept into a compelling LinkedIn article.'
    ),
    true
  );
});

test('allows prompts in the same category when their actual intent differs', () => {
  assert.equal(
    isLikelyDuplicateIntent(
      'Build a Weekly Editorial Calendar',
      'Organize publication dates, owners, and distribution channels.',
      'Improve a Technical Article Introduction',
      'Rewrite the opening paragraph for clarity and reader relevance.'
    ),
    false
  );
});
