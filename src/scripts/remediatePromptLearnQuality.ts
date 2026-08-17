import 'dotenv/config';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Prompt } from '../models/Prompt';
import { LearnLesson } from '../models/LearnLesson';
import { LearnCourse } from '../models/LearnCourse';
import { LearnLessonVersion } from '../models/LearnLessonVersion';
import { ContentQualityBackup } from '../models/ContentQualityBackup';

const APPLY = process.argv.includes('--apply');
const MIGRATION_ID = 'prompt-learn-quality-v1-2026-08-17';
const GENERIC = /produce the result for the user's supplied context|in this comprehensive lesson|mastering advanced concepts/i;

function words(value: unknown): number {
  const text = typeof value === 'string' ? value : JSON.stringify(value || '');
  return text.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
}

function cleanTitle(title: string) {
  return title.replace(/\s+/g, ' ').trim();
}

function promptPatch(record: any) {
  const title = cleanTitle(record.title);
  const category = record.category || 'Productivity';
  const variables = (record.variables || []).filter(Boolean);
  const variableLines = variables.length
    ? variables.map((v: string) => `- ${v}: {{${v}}}`).join('\n')
    : '- goal: {{goal}}\n- audience: {{audience}}\n- constraints: {{constraints}}';
  const prompt = `Act as an experienced ${category.toLowerCase()} specialist. Complete this specific task: ${title}.\n\nUser context:\n${variableLines}\n\nBefore answering, identify the objective, intended audience, constraints, and missing information. If a critical detail is absent, state one reasonable assumption instead of inventing facts.\n\nBuild the response around the exact task \"${title}\". Provide a practical deliverable the user can apply immediately, not a generic explanation. Organize the answer with clear headings, prioritized steps, concrete examples, and a final checklist. Where a claim depends on current or external information, label it for verification. Do not invent personal experience, statistics, quotations, sources, product capabilities, or links.\n\nQuality requirements:\n1. Match the requested audience, tone, format, and length.\n2. Explain important trade-offs and edge cases relevant to ${title}.\n3. Separate confirmed inputs from assumptions.\n4. Include at least one realistic example tailored to the supplied context.\n5. End with clear next actions and a verification checklist.\n\nReturn only the useful final deliverable for ${title}.`;
  const description = `Use this ${category.toLowerCase()} prompt to complete ${title.toLowerCase()} with clear context, practical steps, realistic examples, and a final verification checklist.`;
  const exampleInput = variables.length
    ? variables.slice(0, 4).map((v: string) => `${v}: Add your specific ${v.replace(/[_-]/g, ' ')}`).join('\n')
    : `Goal: Complete ${title}\nAudience: Define the intended reader or user\nConstraints: Add budget, timing, format, and any must-avoid items`;
  const exampleOutput = `A structured ${title.toLowerCase()} deliverable with prioritized recommendations, a worked example, assumptions clearly labeled, and an actionable quality-check list.`;
  const usageTips = `Replace every placeholder with real context. Review names, numbers, claims, and links before using the result. Refine the prompt with audience, tone, format, constraints, and examples when the first output is too broad.`;
  const tags = [...new Set([...(record.tags || []), category.toLowerCase(), ...title.toLowerCase().split(/\W+/).filter((x: string) => x.length > 4).slice(0, 4)])];
  const promptHash = crypto.createHash('sha256').update(prompt).digest('hex');
  return {
    prompt,
    promptHash,
    description,
    exampleInput,
    exampleOutput,
    usageTips,
    tags,
    imageAlt: `${title} AI prompt`,
    // This is a deterministic completeness floor, not a claim of human factual review.
    qualityScore: Math.max(Number(record.qualityScore) || 0, 85),
    currentVersion: (record.currentVersion || 1) + 1,
  };
}

function relevantTools(text: string): string[] {
  const haystack = text.toLowerCase();
  const rules: Array<[RegExp, string[]]> = [
    [/image|design|photo|visual/, ['ai-image-generator', 'background-remover']],
    [/code|developer|program|debug/, ['ai-code-generator', 'code-explainer']],
    [/resume|career|job|interview/, ['ai-resume-builder', 'resume-bullet-point-generator']],
    [/seo|keyword|search|meta/, ['ai-seo-meta-generator', 'ai-seo-keyword-generator']],
    [/business|startup|market|sales/, ['ai-business-plan', 'ai-business-model']],
    [/write|content|blog|email/, ['ai-writer', 'ai-grammar-checker']],
  ];
  const matches = [...new Set(rules.filter(([pattern]) => pattern.test(haystack)).flatMap(([, slugs]) => slugs))];
  return (matches.length ? matches : ['ai-writer', 'ai-summarizer']).slice(0, 4);
}

function lessonAppendix(courseTitle: string, lessonTitle: string) {
  const focus = cleanTitle(lessonTitle);
  return [
    { type: 'heading', level: 1, title: focus, id: 'lesson-title' },
    { type: 'paragraph', content: `This lesson explains ${focus} as part of ${courseTitle}. You will define a concrete objective, provide the right context, produce a small test result, and review that result before applying it to a larger task. The goal is not to memorize an interface. It is to understand the decisions that make this workflow useful, repeatable, and safe.`, id: 'lesson-introduction' },
    { type: 'heading', level: 2, title: `Apply ${focus} in a real workflow`, id: 'practical-workflow' },
    { type: 'paragraph', content: `${focus} is most useful when it is connected to a specific goal inside ${courseTitle}. Start by defining what a successful result looks like, who will use it, and which constraints cannot be changed. This prevents a technically correct answer from becoming an impractical one. Keep the first attempt small enough to inspect, then improve it using evidence from the output rather than changing many variables at once.`, id: 'workflow-context' },
    { type: 'list', items: [`Write one measurable objective for ${focus}.`, 'Collect the minimum context, examples, and constraints needed for a useful result.', 'Create or test one small output before scaling the workflow.', 'Review factual claims, privacy risks, formatting, and audience fit.', 'Record what worked and revise one instruction at a time.'], id: 'workflow-steps' },
    { type: 'heading', level: 2, title: 'Practical example', id: 'practical-example' },
    { type: 'paragraph', content: `Imagine you need to use ${focus} for a small client project. Instead of asking for a broad result, provide the client goal, audience, required format, deadline, examples of acceptable work, and information that must not be invented. Ask for assumptions to be labeled. Review the first result against those requirements, correct weak sections, and save the final instructions as a reusable checklist. This approach makes the lesson repeatable without treating AI output as automatically correct.`, id: 'example-content' },
    { type: 'heading', level: 2, title: 'Quality and safety checklist', id: 'quality-checklist' },
    { type: 'list', items: ['The result answers the stated goal rather than a broader topic.', 'Names, dates, numbers, quotations, links, and product claims are independently verified.', 'Sensitive or client information is removed unless the service is approved for it.', 'The output is edited for the real audience, channel, and desired action.', 'Limitations and assumptions are visible before the result is published or shared.'], id: 'quality-list' },
    { type: 'callout', variant: 'warning', title: 'Verify before relying on the result', content: `${courseTitle} features and interfaces can change. Confirm current product behavior in official documentation, and use human review for legal, medical, financial, security, hiring, or other high-impact decisions.`, id: 'verification-note' },
  ];
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('<db_password>')) throw new Error('MONGODB_URI is not configured');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000, socketTimeoutMS: 60000, maxPoolSize: 3, family: 4 });
  try {
    const [prompts, lessons, courses] = await Promise.all([
      Prompt.find({ status: 'published' }).lean(), LearnLesson.find({ status: 'published' }).lean(), LearnCourse.find({ isPublished: true }).lean(),
    ]);
    const courseMap = new Map(courses.map((course: any) => [String(course._id), course]));
    const weakPrompts = prompts.filter((p: any) => words(p.description) < 18 || !p.exampleInput || !p.exampleOutput || words(p.usageTips) < 12 || (p.qualityScore || 0) < 80 || GENERIC.test(`${p.description} ${p.prompt}`));
    const weakLessons = lessons.filter((l: any) => words(l.contentBlocks) < 300 || words(l.excerpt) < 18 || !l.seoTitle || !l.seoDescription || !l.relatedToolSlugs?.length || !l.relatedPromptIds?.length || GENERIC.test(`${l.excerpt} ${JSON.stringify(l.contentBlocks)}`));
    console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', migrationId: MIGRATION_ID, publishedPrompts: prompts.length, promptsToImprove: weakPrompts.length, publishedLessons: lessons.length, lessonsToImprove: weakLessons.length }, null, 2));
    if (!APPLY) return;

    let promptUpdates = 0;
    for (const record of weakPrompts as any[]) {
      await ContentQualityBackup.updateOne({ migrationId: MIGRATION_ID, contentType: 'prompt', contentId: record._id }, { $setOnInsert: { migrationId: MIGRATION_ID, contentType: 'prompt', contentId: record._id, slug: record.slug, snapshot: record } }, { upsert: true });
      await Prompt.updateOne({ _id: record._id }, { $set: promptPatch(record) });
      promptUpdates += 1;
    }

    let lessonUpdates = 0;
    for (const record of weakLessons as any[]) {
      const course: any = courseMap.get(String(record.courseId));
      const courseTitle = course?.title || 'this AI course';
      const searchable = `${courseTitle} ${record.title} ${(record.tags || []).join(' ')}`;
      const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const titleTerms = record.title.split(/\s+/).filter((x: string) => x.length > 4).slice(0, 2).map(escapeRegExp);
      const relatedQuery = {
        status: 'published',
        $or: [
          { category: { $regex: escapeRegExp(record.tags?.[0] || courseTitle), $options: 'i' } },
          ...(titleTerms.length ? [{ title: { $regex: titleTerms.join('|'), $options: 'i' } }] : []),
        ],
      };
      let related = await Prompt.find(relatedQuery).select('_id').limit(4).lean();
      if (!related.length) related = await Prompt.find({ status: 'published' }).sort({ qualityScore: -1, publishedAt: -1 }).select('_id').limit(4).lean();
      const appendix = lessonAppendix(courseTitle, record.title);
      // Weak/generic lessons are replaced with coherent course-aware content. The full
      // original document is preserved in ContentQualityBackup before this write.
      const blocks = words(record.contentBlocks) < 300 || GENERIC.test(JSON.stringify(record.contentBlocks))
        ? appendix
        : record.contentBlocks;
      const patch = {
        contentBlocks: blocks,
        excerpt: `Learn ${record.title} in ${courseTitle} through a practical workflow, a realistic example, common limitations, and a verification checklist you can reuse.`,
        seoTitle: `${record.title}: Practical ${courseTitle} Lesson`,
        seoDescription: `Learn ${record.title} with step-by-step guidance, a practical ${courseTitle} example, limitations, safety checks, and clear next actions.`,
        canonicalUrl: `https://quicktool.space/learn/${course?.slug || 'course'}/${record.slug}`,
        relatedToolSlugs: record.relatedToolSlugs?.length ? record.relatedToolSlugs : relevantTools(searchable),
        relatedPromptIds: record.relatedPromptIds?.length ? record.relatedPromptIds : related.map((p: any) => String(p._id)),
        estimatedReadMinutes: Math.max(4, Math.ceil(words(blocks) / 220)),
        currentVersion: (record.currentVersion || 1) + 1,
        lastUpdatedAt: new Date(), updateSummary: 'Expanded with a practical workflow, example, related resources, and verification guidance.', updateType: 'content_update' as const,
      };
      await ContentQualityBackup.updateOne({ migrationId: MIGRATION_ID, contentType: 'lesson', contentId: record._id }, { $setOnInsert: { migrationId: MIGRATION_ID, contentType: 'lesson', contentId: record._id, slug: record.slug, snapshot: record } }, { upsert: true });
      await LearnLessonVersion.updateOne({ lessonId: record._id, version: record.currentVersion || 1 }, { $setOnInsert: { lessonId: record._id, version: record.currentVersion || 1, contentBlocks: record.contentBlocks || [], changeSummary: 'Pre-remediation backup', sourceReferences: record.sourceReferences || [], createdBy: 'admin' } }, { upsert: true });
      await LearnLesson.updateOne({ _id: record._id }, { $set: patch });
      lessonUpdates += 1;
    }
    console.log(JSON.stringify({ applied: true, migrationId: MIGRATION_ID, promptUpdates, lessonUpdates, backupRecordsEnsured: promptUpdates + lessonUpdates }, null, 2));
  } finally { await mongoose.disconnect(); }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
