import cron from 'node-cron';
import crypto from 'crypto';
import { Prompt } from '../models/Prompt';
import { PromptGenerationRun } from '../models/PromptGenerationRun';
import { CronLock } from '../models/CronLock';
import { generateSinglePrompt, checkDuplicate, checkSemanticDuplicate, reviewGeneratedPrompt } from '../services/promptGenerator';
import { triggerPostPublishHooks } from '../services/promptPostPublish';

const CATEGORIES = ['Business', 'Marketing', 'Coding', 'SEO', 'Writing', 'Career', 'Productivity', 'Social Media', 'Education'];
const MAX_ATTEMPTS = 3;
const TARGET_DRAFTS = 2; // Initial run as per user request
const QUALITY_THRESHOLD = 80; // Lowered to prevent excessive API retries
// Lower than the old 0.90 exact-word threshold so paraphrased versions of the
// same search intent are rejected before another indexable page is published.
const SEMANTIC_SIMILARITY_THRESHOLD = 0.78;

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, ' ').trim();
}

function generateSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function generateSemanticFingerprint(title: string, description: string): string {
  const words = normalizeText(`${title} ${description}`).split(' ');
  const significant = Array.from(new Set(words.filter(w => w.length > 3))).sort();
  return crypto.createHash('sha256').update(significant.join(' ')).digest('hex');
}

async function pickCategoryWeighted(): Promise<string> {
  // A simple rotation for now, could be enhanced with actual weighted logic based on DB deficit
  const lastRun = await PromptGenerationRun.findOne().sort({ createdAt: -1 });
  const lastCat = lastRun?.category;
  
  const available = CATEGORIES.filter(c => c !== lastCat);
  return available[Math.floor(Math.random() * available.length)];
}

export async function runPromptGeneration() {
  const runId = crypto.randomUUID();
  const category = await pickCategoryWeighted();
  
  console.log(`[PromptCron] Starting generation run ${runId} for category: ${category}`);
  
  const run = new PromptGenerationRun({
    runId,
    category,
    requestedCount: TARGET_DRAFTS,
    model: 'gemini-1.5-pro'
  });
  await run.save();

  let attempts = 0;
  
  while (run.savedCount < TARGET_DRAFTS && attempts < MAX_ATTEMPTS) {
    attempts++;
    console.log(`[PromptCron] Attempt ${attempts}/${MAX_ATTEMPTS} for ${category}`);
    
    try {
      const generated = await generateSinglePrompt(category);
      if (!generated) {
        run.failedCount++;
        continue;
      }
      
      run.generatedCount++;
      
      const slug = generateSlug(generated.title);
      const isExactDup = await checkDuplicate(generated.title, slug);
      const isSemanticDup = await checkSemanticDuplicate(generated.title, generated.description, SEMANTIC_SIMILARITY_THRESHOLD);
      const editorialReview = await reviewGeneratedPrompt(generated);
      
      // Determine final status
      const isSafetyPassed = !/(hack|malware|phishing|credential theft|violence|explicit sexual)/i.test(`${generated.title} ${generated.prompt}`);
      const isStructureValid = generated.prompt.length >= 120 && generated.description.length >= 30 && generated.variables.every(value => /^[a-z0-9_ -]{1,60}$/i.test(value));
      
      let finalStatus = 'rejected';
      let publishedAt: Date | undefined = undefined;
      
      if (
        generated.qualityScore >= QUALITY_THRESHOLD && editorialReview.approved && editorialReview.score >= 85 &&
        !isExactDup &&
        !isSemanticDup &&
        isSafetyPassed &&
        isStructureValid
      ) {
        finalStatus = 'published';
        publishedAt = new Date();
      } else {
        console.log(`[PromptCron] Skipped/Rejected: writerScore=${generated.qualityScore}, reviewScore=${editorialReview.score}, issues=${editorialReview.issues.join('; ')}, dup=${isExactDup}, semDup=${isSemanticDup}`);
        run.failedCount++;
        continue;
      }
      
      // Save Prompt
      const normalizedTitle = normalizeText(generated.title);
      const promptHash = crypto.createHash('sha256').update(normalizedTitle).digest('hex');
      const semanticFingerprint = generateSemanticFingerprint(generated.title, generated.description);
      
      const prompt = new Prompt({
        ...generated,
        slug,
        status: finalStatus,
        publishedAt,
        sourceType: 'ai_generated',
        generatedBy: 'gemini', // from service
        normalizedTitle,
        promptHash,
        semanticFingerprint,
        currentVersion: 1
      });
      
      await prompt.save();
      run.savedCount++;
      console.log(`[PromptCron] Saved ${finalStatus}: ${prompt.title}`);
      
      if (finalStatus === 'published') {
        triggerPostPublishHooks(prompt);
        const primaryModel = String(generated.models?.[0] || 'chatgpt').toLowerCase();
        const url = `https://quicktool.space/prompts/${primaryModel}/${slug}`;
        try {
          const { pingIndexNow } = await import('../utils/seo');
          await pingIndexNow(url);
        } catch (e) {
          console.error('[PromptCron] Failed to ping IndexNow', e);
        }
      }
      
    } catch (error: any) {
      console.error(`[PromptCron] Error during generation attempt:`, error.message);
      run.failedCount++;
      // Service handles exponential backoff natively, so we just continue
    }
  }
  
  run.finishedAt = new Date();
  if (run.savedCount >= TARGET_DRAFTS) {
    run.status = 'success';
  } else if (run.savedCount > 0) {
    run.status = 'partial_success';
  } else {
    run.status = 'failed';
  }
  
  await run.save();
  console.log(`[PromptCron] Finished run ${runId}. Status: ${run.status}. Saved: ${run.savedCount}`);
}

export function startPromptCron() {
  cron.schedule('30 2 * * *', async () => {
    const lockKey = 'prompt_generator';
    try {
      await CronLock.create({ key: lockKey });
    } catch (error: any) {
      if (error?.code === 11000) {
        console.log('[PromptCron] Job already ran recently (lock detected). Skipping.');
        await PromptGenerationRun.create({
          runId: crypto.randomUUID(),
          category: 'skipped',
          requestedCount: 0,
          model: 'none',
          status: 'skipped_lock'
        });
        
        return;
      }
      console.error('[PromptCron] Lock error:', error);
      return;
    }

    try {
      await runPromptGeneration();
    } catch (error) {
      console.error('[PromptCron] Global cron error:', error);
    } finally {
      await CronLock.deleteOne({ key: lockKey }).catch(() => undefined);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });
  
  console.log('⏰ Prompt Generator Cron initialized (Daily at 2:30 AM IST)');
}
