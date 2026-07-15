import { GoogleGenerativeAI } from '@google/generative-ai';

const keys = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
let currentKeyIndex = 0;

export async function runWithFailover<T>(
  operation: (genAI: GoogleGenerativeAI) => Promise<T>
): Promise<T> {
  let attempts = 0;
  const maxAttempts = Math.max(5, keys.length);
  while (attempts < maxAttempts) {
    try {
      const genAI = new GoogleGenerativeAI(keys[currentKeyIndex]);
      const result = await operation(genAI);
      return result;
    } catch (error: any) {
      console.warn(`[GeminiClient] Error with key index ${currentKeyIndex}:`, error.message);
      if (
        error.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota') || 
        error.status === 400 || error?.message?.includes('API_KEY_INVALID') || error?.message?.includes('API key not valid') ||
        error.status === 503 || error?.message?.includes('503') || error?.message?.includes('high demand')
      ) {
        if (error.status === 503 || error?.message?.includes('503') || error.status === 429 || error?.message?.includes('429')) {
          console.log(`[GeminiClient] High demand/Rate limit on index ${currentKeyIndex}. Waiting 10 seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, 10000));
        } else {
          console.log(`[GeminiClient] Key invalid on index ${currentKeyIndex}. Switching to next key...`);
        }
        currentKeyIndex = (currentKeyIndex + 1) % keys.length;
        attempts++;
      } else {
        throw error;
      }
    }
  }
  throw new Error('All Gemini API keys failed or rate limited');
}
