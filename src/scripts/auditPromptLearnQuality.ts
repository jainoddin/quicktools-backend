import 'dotenv/config';
import mongoose from 'mongoose';
import { Prompt } from '../models/Prompt';
import { LearnLesson } from '../models/LearnLesson';

type Issue = { slug: string; reasons: string[]; metrics: Record<string, number> };
const GENERIC_PATTERNS = [/in this comprehensive lesson/i, /mastering advanced concepts/i, /experiment with (different )?settings/i, /stay updated with the latest/i, /produce the result for the user's supplied context/i];

function plainText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(plainText).join(' ');
  if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).map(plainText).join(' ');
  return '';
}

function words(value: unknown): number {
  const text = plainText(value).replace(/<[^>]*>/g, ' ').trim();
  return text ? text.split(/\s+/).length : 0;
}

function normalizedIntent(value: string): string {
  const stop = new Set(['a', 'an', 'and', 'best', 'create', 'for', 'generator', 'guide', 'how', 'in', 'of', 'prompt', 'the', 'to', 'tool', 'using', 'with', 'your', '2025', '2026']);
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((token) => token.length > 2 && !stop.has(token)).sort().join(' ');
}

function repeatedGroups<T extends { slug: string }>(records: T[], key: (record: T) => string) {
  const groups = new Map<string, string[]>();
  for (const record of records) {
    const value = key(record);
    if (!value) continue;
    groups.set(value, [...(groups.get(value) || []), record.slug]);
  }
  return [...groups.entries()].filter(([, slugs]) => slugs.length > 1).map(([value, slugs]) => ({ value, count: slugs.length, slugs }));
}

async function run() {
  const sampleLimit = Math.max(1, Number(process.env.AUDIT_SAMPLE_LIMIT || 25));
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('<db_password>')) throw new Error('MONGODB_URI is not configured');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000, socketTimeoutMS: 45000, maxPoolSize: 2, family: 4 });

  try {
    const [prompts, lessons] = await Promise.all([
      Prompt.find({ status: 'published' }).select('title slug description prompt category models tags variables exampleInput exampleOutput usageTips qualityScore normalizedTitle').lean(),
      LearnLesson.find({ status: 'published' }).select('title slug excerpt contentBlocks tags relatedToolSlugs relatedPromptIds seoTitle seoDescription canonicalUrl estimatedReadMinutes').lean(),
    ]);

    const promptIssues: Issue[] = prompts.map((record: any) => {
      const reasons: string[] = [];
      const promptWords = words(record.prompt);
      const descriptionWords = words(record.description);
      if (promptWords < 90) reasons.push('thin_prompt_body');
      if (descriptionWords < 18) reasons.push('short_description');
      if (!record.exampleInput || !record.exampleOutput) reasons.push('missing_example');
      if (!record.usageTips || words(record.usageTips) < 12) reasons.push('missing_or_short_usage_tips');
      if (!record.tags?.length) reasons.push('missing_tags');
      if (!record.models?.length) reasons.push('missing_models');
      if ((record.qualityScore ?? 0) < 80) reasons.push('quality_score_below_80');
      if (GENERIC_PATTERNS.some((pattern) => pattern.test(`${record.description} ${record.prompt}`))) reasons.push('generic_template_copy');
      return { slug: record.slug, reasons, metrics: { promptWords, descriptionWords, qualityScore: record.qualityScore ?? 0 } };
    }).filter((item) => item.reasons.length > 0);

    const lessonIssues: Issue[] = lessons.map((record: any) => {
      const reasons: string[] = [];
      const contentWords = words(record.contentBlocks);
      const excerptWords = words(record.excerpt);
      if (contentWords < 300) reasons.push('thin_lesson_content');
      if (excerptWords < 18) reasons.push('short_excerpt');
      if (!record.seoTitle || !record.seoDescription) reasons.push('missing_seo_metadata');
      if (!record.relatedToolSlugs?.length) reasons.push('missing_related_tools');
      if (!record.relatedPromptIds?.length) reasons.push('missing_related_prompts');
      if (GENERIC_PATTERNS.some((pattern) => pattern.test(`${record.excerpt} ${plainText(record.contentBlocks)}`))) reasons.push('generic_template_copy');
      return { slug: record.slug, reasons, metrics: { contentWords, excerptWords, estimatedReadMinutes: record.estimatedReadMinutes ?? 0 } };
    }).filter((item) => item.reasons.length > 0);

    const countIssues = (items: Issue[]) => items.flatMap((item) => item.reasons).reduce<Record<string, number>>((acc, reason) => ({ ...acc, [reason]: (acc[reason] || 0) + 1 }), {});
    console.log(JSON.stringify({
      mode: 'read-only', generatedAt: new Date().toISOString(),
      prompts: { published: prompts.length, affected: promptIssues.length, issueCounts: countIssues(promptIssues), duplicateTitles: repeatedGroups(prompts as any[], (r: any) => r.title.trim().toLowerCase()), duplicateIntentFingerprints: repeatedGroups(prompts as any[], (r: any) => normalizedIntent(`${r.title} ${r.category}`)), affectedRecordSamples: promptIssues.slice(0, sampleLimit), omittedAffectedRecords: Math.max(0, promptIssues.length - sampleLimit) },
      lessons: { published: lessons.length, affected: lessonIssues.length, issueCounts: countIssues(lessonIssues), duplicateTitles: repeatedGroups(lessons as any[], (r: any) => r.title.trim().toLowerCase()), duplicateExcerpts: repeatedGroups(lessons as any[], (r: any) => r.excerpt.trim().toLowerCase()), affectedRecordSamples: lessonIssues.slice(0, sampleLimit), omittedAffectedRecords: Math.max(0, lessonIssues.length - sampleLimit) },
    }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error(`Prompt/Learn quality audit failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
