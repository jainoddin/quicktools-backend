import { runWithFailover } from './geminiClient';
import { ContentQualityLog } from '../models/ContentQualityLog';

export type ContentKind = 'blog' | 'article' | 'news';
export type SearchIntent = 'informational' | 'commercial' | 'comparison' | 'tutorial' | 'news';

export interface QualityResult {
  passed: boolean;
  score: number;
  issues: string[];
  criticalIssues: string[];
  deterministicErrors: string[];
  scores: {
    deterministic: number;
    fact: number | null;
    seo: number | null;
    readability: number | null;
  };
}

interface AgentReview {
  score: number;
  issues: string[];
  criticalIssues: string[];
}

const bannedPhrases = [
  "in today's digital world",
  'as an ai language model',
  "it's worth noting",
  'the ultimate guide',
  'the definitive guide',
];

const words = (value: string) => value.trim().split(/\s+/).filter(Boolean);
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

export async function classifySearchIntent(topic: string, kind: ContentKind): Promise<SearchIntent> {
  if (kind === 'news') return 'news';
  return runWithFailover(async (genAI, modelName) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { temperature: 0.1, maxOutputTokens: 100, responseMimeType: 'application/json' },
    });
    const response = await model.generateContent(`Classify the search intent for this ${kind} topic: "${topic}".
Return JSON only: {"intent":"informational|commercial|comparison|tutorial"}.`);
    const allowed: SearchIntent[] = ['informational', 'commercial', 'comparison', 'tutorial'];
    const raw = response.response.text().trim().toLowerCase();
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      const parsed = JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned);
      return allowed.includes(parsed.intent) ? parsed.intent : 'informational';
    } catch {
      const detected = allowed.find(intent => new RegExp(`\\b${intent}\\b`).test(raw));
      return detected || 'informational';
    }
  });
}

function duplicateIntentIssue(title: string, existingTitles: string[]): string | null {
  const candidate = new Set(normalize(title).split(' ').filter(w => w.length > 3));
  for (const existing of existingTitles) {
    const current = new Set(normalize(existing).split(' ').filter(w => w.length > 3));
    const overlap = [...candidate].filter(word => current.has(word)).length;
    const denominator = Math.max(1, Math.min(candidate.size, current.size));
    if (overlap / denominator >= 0.7) return `Possible duplicate search intent: "${existing}"`;
  }
  return null;
}

export function deterministicReview(kind: ContentKind, content: any, existingTitles: string[]): AgentReview {
  const issues: string[] = [];
  const criticalIssues: string[] = [];
  const body = kind === 'news'
    ? [content.summary, content.whatHappened, content.whyItMatters, content.keyHighlights?.join(' '), content.industryReaction, content.quickToolsInsight, content.conclusion].filter(Boolean).join(' ')
    : String(content.content || '');
  const count = words(body).length;
  const [minWords, maxWords] = kind === 'news' ? [250, 350] : kind === 'blog' ? [1200, 1900] : [1000, 1800];

  if (!content.title || !content.slug || !body) criticalIssues.push('Missing required title, slug, or content');
  if (count < minWords || count > maxWords) criticalIssues.push(`Word count ${count} is outside ${minWords}-${maxWords}`);
  if (!content.metaTitle || content.metaTitle.length > 60) criticalIssues.push('Meta title is missing or exceeds 60 characters');
  if (!content.metaDescription || content.metaDescription.length < 120 || content.metaDescription.length > 160) {
    criticalIssues.push('Meta description must be 120-160 characters');
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(content.slug || ''))) criticalIssues.push('Slug is invalid');
  if (kind === 'news' && (!content.sourceName || !/^https:\/\//.test(String(content.sourceUrl || '')))) {
    criticalIssues.push('News source name or URL is invalid');
  }

  const duplicate = duplicateIntentIssue(String(content.title || ''), existingTitles);
  if (duplicate) criticalIssues.push(duplicate);
  for (const phrase of bannedPhrases) if (normalize(body).includes(phrase)) issues.push(`Templated phrase detected: ${phrase}`);

  const links = [...body.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map(match => match[1]);
  for (const link of links) {
    if (!/^https?:\/\//.test(link) && !/^\/[-a-zA-Z0-9/?=&]+$/.test(link)) criticalIssues.push(`Broken or invalid link format: ${link}`);
  }
  if (kind !== 'news') {
    const structuredInternalLinks = Array.isArray(content.internalLinks) ? content.internalLinks.length : 0;
    const relatedLinks = Array.isArray(content.relatedSlugs) ? content.relatedSlugs.length : 0;
    const inlineInternalLinks = links.filter(link => link.startsWith('/')).length;
    if (structuredInternalLinks + relatedLinks + inlineInternalLinks < 2) criticalIssues.push('At least two valid internal links are required');
  }
  try {
    JSON.stringify({
      '@context': 'https://schema.org',
      '@type': kind === 'news' ? 'NewsArticle' : kind === 'blog' ? 'BlogPosting' : 'Article',
      headline: content.title,
      image: content.coverImage || content.heroImage,
    });
  } catch {
    criticalIssues.push('JSON-LD payload is not serializable');
  }

  const penalty = criticalIssues.length * 25 + issues.length * 5;
  return { score: Math.max(0, 100 - penalty), issues, criticalIssues };
}

async function runReviewAgent(role: 'fact' | 'seo' | 'readability', kind: ContentKind, content: any): Promise<AgentReview> {
  const body = kind === 'news'
    ? [content.summary, content.whatHappened, content.whyItMatters, content.keyHighlights?.join(' '), content.industryReaction, content.quickToolsInsight, content.conclusion].filter(Boolean).join('\n')
    : String(content.content || '');
  const roleRules = {
    fact: kind === 'news'
      ? 'Reject every claim not supported by the supplied RSS source context, including invented reactions, quotations, figures, or implications.'
      : 'Reject invented first-hand experience, quotations, statistics, benchmarks, surveys, named standards, case-study results, current claims, or fabricated references. General qualitative explanations, clearly framed recommendations, QuickTools platform mentions, and valid internal tool links may pass without source context; links alone are not factual claims.',
    seo: 'Check search intent alignment, title quality, non-duplication, natural keywords, useful structure, and non-spammy writing. Structured internal-link recommendations are expected; only flag promotional density when the prose body repeatedly advertises them.',
    readability: 'Check clarity, grammar, repetition, templated AI phrases, useful examples, and reader value.',
  }[role];

  let lastError: unknown;
  for (let reviewAttempt = 1; reviewAttempt <= 2; reviewAttempt++) {
    try {
      return await runWithFailover(async (genAI, modelName) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { temperature: 0.1, maxOutputTokens: 1200, responseMimeType: 'application/json' },
    });
    const response = await model.generateContent(`You are the ${role} reviewer in an automated publishing quality gate.
${roleRules}
Content type: ${kind}
Review date: ${new Date().toISOString().slice(0, 10)}. This date is current, not speculative.
Title: ${content.title}
Meta title: ${content.metaTitle}
Meta description: ${content.metaDescription}
Source: ${content.sourceName || 'not supplied'} ${content.sourceUrl || ''}
Source context: ${JSON.stringify(content.sourceContext || content.externalLinks || []).slice(0, content.category === 'AI News' ? 16000 : 5000)}
Content:
${body.slice(0, 16000)}

Return concise JSON only: {"score":0-100,"issues":["..."],"criticalIssues":["..."]}. Maximum 5 short items per array.
Use criticalIssues only for a reason that must block publication.`);
    const raw = response.response.text().trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    const parsed = JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : raw);
    return {
      score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
      issues: Array.isArray(parsed.issues) ? parsed.issues.map(String) : [],
      criticalIssues: Array.isArray(parsed.criticalIssues) ? parsed.criticalIssues.map(String) : [],
    };
      });
    } catch (error) {
      lastError = error;
      console.warn(`[QualityPipeline] ${role} reviewer JSON attempt ${reviewAttempt}/2 failed`);
    }
  }
  throw lastError;
}

export async function reviewForPublication(kind: ContentKind, content: any, existingTitles: string[]): Promise<QualityResult> {
  const deterministic = deterministicReview(kind, content, existingTitles);
  if (deterministic.criticalIssues.length) {
    return {
      passed: false,
      score: deterministic.score,
      issues: deterministic.issues,
      criticalIssues: deterministic.criticalIssues,
      deterministicErrors: deterministic.criticalIssues,
      scores: { deterministic: deterministic.score, fact: null, seo: null, readability: null },
    };
  }

  const [fact, seo, readability] = await Promise.all([
    runReviewAgent('fact', kind, content),
    runReviewAgent('seo', kind, content),
    runReviewAgent('readability', kind, content),
  ]);
  const reviews = [deterministic, fact, seo, readability];
  const score = Math.round(reviews.reduce((sum, review) => sum + review.score, 0) / reviews.length);
  const issues = reviews.flatMap(review => review.issues);
  const criticalIssues = reviews.flatMap(review => review.criticalIssues);
  return {
    passed: score >= 80 && criticalIssues.length === 0,
    score,
    issues,
    criticalIssues,
    deterministicErrors: deterministic.criticalIssues,
    scores: { deterministic: deterministic.score, fact: fact.score, seo: seo.score, readability: readability.score },
  };
}

export async function generateWithQualityGate<T>(options: {
  kind: ContentKind;
  existingTitles: string[];
  generate: (attempt: number) => Promise<T>;
  maxRegenerations?: number;
  review?: (kind: ContentKind, content: T, existingTitles: string[]) => Promise<QualityResult>;
  onAttempt?: (entry: { attempt: number; content: T; review: QualityResult; final: boolean }) => Promise<void>;
}): Promise<{ content: T | null; reviews: QualityResult[] }> {
  const reviews: QualityResult[] = [];
  const attempts = 1 + (options.maxRegenerations ?? 2);
  for (let attempt = 1; attempt <= attempts; attempt++) {
    let content: T;
    try {
      content = await options.generate(attempt);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const review: QualityResult = {
        passed: false,
        score: 0,
        issues: [],
        criticalIssues: [`Generation failed: ${message}`],
        deterministicErrors: [`Generation failed: ${message}`],
        scores: { deterministic: 0, fact: null, seo: null, readability: null },
      };
      reviews.push(review);
      console.error(`[QualityPipeline] ${options.kind} generation attempt ${attempt}/${attempts} failed:`, message);
      await options.onAttempt?.({ attempt, content: { topic: 'Generation failure' } as T, review, final: attempt === attempts });
      continue;
    }
    let review: QualityResult;
    try {
      review = await (options.review || reviewForPublication)(options.kind, content, options.existingTitles);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      review = {
        passed: false,
        score: 0,
        issues: [],
        criticalIssues: [`Editorial review failed: ${message}`],
        deterministicErrors: [],
        scores: { deterministic: 0, fact: null, seo: null, readability: null },
      };
      reviews.push(review);
      console.error(`[QualityPipeline] ${options.kind} review attempt ${attempt}/${attempts} failed:`, message);
      await options.onAttempt?.({ attempt, content, review, final: attempt === attempts });
      continue;
    }
    reviews.push(review);
    console.log(`[QualityPipeline] ${options.kind} attempt ${attempt}/${attempts}: ${review.score}/100`, {
      issues: review.issues,
      criticalIssues: review.criticalIssues,
    });
    await options.onAttempt?.({ attempt, content, review, final: review.passed || attempt === attempts });
    if (review.passed) return { content, reviews };
  }
  return { content: null, reviews };
}

export async function persistQualityAttempt(
  kind: ContentKind,
  entry: { attempt: number; content: any; review: QualityResult; final: boolean },
): Promise<void> {
  const { content, review } = entry;
  await ContentQualityLog.create({
    contentType: kind,
    topic: String(content.topic || content.title || 'Unknown topic'),
    searchIntent: content.searchIntent || (kind === 'news' ? 'news' : 'informational'),
    attemptNumber: entry.attempt,
    deterministicValidationErrors: review.deterministicErrors,
    scores: review.scores,
    criticalRejectionReasons: review.criticalIssues,
    sourceUrl: content.sourceUrl,
    finalStatus: review.passed ? 'passed' : entry.final ? 'skipped' : 'retrying',
  });
}
