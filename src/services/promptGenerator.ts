import { runWithFailover } from './geminiClient';
import { Prompt } from '../models/Prompt';
import crypto from 'crypto';

export interface GeneratedPromptResult {
  title: string;
  category: string;
  models: string[];
  prompt: string;
  description: string;
  tags: string[];
  variables: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  exampleInput?: string;
  exampleOutput?: string;
  usageTips?: string;
  qualityScore: number; // 0 - 100
}

export interface PromptReviewResult { score: number; approved: boolean; issues: string[] }

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function generateSemanticFingerprint(title: string, description: string): string {
  // A basic semantic fingerprint: sort unique words > 3 chars
  const words = normalizeText(`${title} ${description}`).split(' ');
  const significant = Array.from(new Set(words.filter(w => w.length > 3))).sort();
  return crypto.createHash('sha256').update(significant.join(' ')).digest('hex');
}

function jaccardSimilarity(fingerprintA: string, fingerprintB: string): number {
  // If we are using hashes for fingerprints, they must match exactly.
  // However, since we want a similarity score threshold (0.90), we'll do a basic word overlap check
  // on the normalized title + description, bypassing the hash for similarity computation.
  return 0; // Handled in checkSemanticDuplicate
}

function computeWordSimilarity(text1: string, text2: string): number {
  const set1 = new Set(normalizeText(text1).split(' ').filter(w => w.length > 2));
  const set2 = new Set(normalizeText(text2).split(' ').filter(w => w.length > 2));
  if (set1.size === 0 && set2.size === 0) return 1;
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

export async function checkDuplicate(title: string, slug: string): Promise<boolean> {
  const normalizedTitle = normalizeText(title);
  const promptHash = crypto.createHash('sha256').update(normalizedTitle).digest('hex');
  
  const existing = await Prompt.findOne({
    $or: [{ slug }, { promptHash }]
  });
  
  return !!existing;
}

export async function checkSemanticDuplicate(title: string, description: string, threshold = 0.90): Promise<boolean> {
  // Pull recent or relevant prompts to check against (to avoid scanning entire DB, maybe limit to same category)
  // For safety, we can check the last 1000 prompts
  const recentPrompts = await Prompt.find({}, 'title description').sort({ createdAt: -1 }).limit(1000);
  
  const targetText = `${title} ${description}`;
  
  for (const p of recentPrompts) {
    const existingText = `${p.title} ${p.description}`;
    const similarity = computeWordSimilarity(targetText, existingText);
    if (similarity >= threshold) {
      return true; // Too similar!
    }
  }
  return false;
}

export async function generateSinglePrompt(category: string): Promise<GeneratedPromptResult | null> {
  const promptInstruction = `
You are an expert Prompt Engineer. Create a highly professional, ready-to-use AI prompt for the category: "${category}".
The prompt should be highly effective, detailed, and use placeholder variables where the user can inject their own context.

Return ONLY a valid JSON object with the following exact structure, no markdown wrappers, no code blocks:
{
  "title": "Clear, actionable title (e.g., Create a Complete Business Plan)",
  "category": "${category}",
  "models": ["ChatGPT", "Claude", "Gemini"],
  "prompt": "The actual detailed prompt text. Use [variable_name] for variables.",
  "description": "Short description of what the prompt achieves.",
  "tags": ["tag1", "tag2"],
  "variables": ["variable_name1"],
  "difficulty": "beginner" | "intermediate" | "advanced",
  "exampleInput": "Example variable values",
  "exampleOutput": "Brief example of what the AI would output",
  "usageTips": "Tips on how to use this prompt effectively",
  "qualityScore": 95
}

Ensure the quality score reflects your strict assessment of this prompt's utility (0-100).
`;

  return await runWithFailover(async (genAI, modelName) => {
    const model = genAI.getGenerativeModel({ model: modelName });
    
    // Attempt generation with backoff on failover
    let retries = 0;
    while (retries < 3) {
      try {
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: promptInstruction }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json",
          }
        });

        const text = result.response.text();
        const json: GeneratedPromptResult = JSON.parse(text);
        
        // Basic schema validation
        if (!json.title || !json.prompt || !json.description || !json.variables) {
          throw new Error('Malformed JSON schema');
        }
        
        return json;
      } catch (err) {
        retries++;
        console.warn(`[promptGenerator] Attempt ${retries} failed:`, err);
        if (retries >= 3) throw err;
        await sleep(Math.pow(2, retries) * 1000); // Exponential backoff
      }
    }
    return null;
  });
}

export async function generateCustomPrompt(goal: string, model = 'ChatGPT', category = 'Productivity'): Promise<GeneratedPromptResult | null> {
  const safeGoal = goal.trim().slice(0, 1200);
  if (safeGoal.length < 10) throw new Error('Please describe your goal in at least 10 characters');
  const generated = await generateSinglePrompt(`${category}. The user specifically wants: ${safeGoal}. Optimize the result for ${model}`);
  if (!generated) return null;
  return { ...generated, category, models: [model] };
}

export async function reviewGeneratedPrompt(candidate: GeneratedPromptResult): Promise<PromptReviewResult> {
  const instruction = `You are a strict independent prompt editor. Review this AI prompt for usefulness, clarity, safe instructions, realistic claims, variable consistency, non-repetition, and whether it genuinely fits its category. Return JSON only: {"score":0,"approved":false,"issues":["reason"]}. Approve only at score 85 or higher. Candidate: ${JSON.stringify(candidate)}`;
  return runWithFailover(async (genAI, modelName) => {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: instruction }] }], generationConfig: { temperature: 0.1, responseMimeType: 'application/json' } });
    const review = JSON.parse(result.response.text());
    return { score: Math.max(0, Math.min(100, Number(review.score) || 0)), approved: Boolean(review.approved), issues: Array.isArray(review.issues) ? review.issues.slice(0, 8).map(String) : [] };
  });
}
