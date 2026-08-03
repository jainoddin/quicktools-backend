import { GoogleGenerativeAI } from '@google/generative-ai';

const keys = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
let currentKeyIndex = 0;

const DEFAULT_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-pro-latest',
  'gemini-3.1-pro-preview'
];

export async function runWithFailover<T>(
  operation: (genAI: GoogleGenerativeAI, modelName: string) => Promise<T>,
  models: string[] = DEFAULT_MODELS
): Promise<T> {
  if (keys.length === 0) throw new Error('No Gemini API keys configured');
  let attempts = 0;
  let currentModelIndex = 0;
  const maxAttempts = keys.length * models.length;

  while (attempts < maxAttempts) {
    const currentModelName = models[currentModelIndex];
    try {
      const genAI = new GoogleGenerativeAI(keys[currentKeyIndex]);
      const result = await operation(genAI, currentModelName);
      return result;
    } catch (error: any) {
      console.warn(`[GeminiClient] Error with key index ${currentKeyIndex}, model ${currentModelName}:`, error.message);
      
      // Handle 404 (Model not found/supported) by switching to the next fallback model
      if (error.status === 404 || error?.message?.includes('404') || error?.message?.includes('not found') || error?.message?.includes('not supported')) {
         console.log(`[GeminiClient] Model ${currentModelName} failed (404). Switching to next model...`);
         currentModelIndex++;
         currentKeyIndex = 0;
         if (currentModelIndex >= models.length) {
            throw new Error(`All Gemini models failed. Last error: ${error.message}`);
         }
         attempts++;
         continue; // retry immediately with next model
      }
      
      // Handle Rate limits, Quota, Invalid Keys, and High Demand by switching the API Key
      if (
        error.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota') || 
        error.status === 400 || error?.message?.includes('API_KEY_INVALID') || error?.message?.includes('API key not valid') ||
        error.status === 503 || error?.message?.includes('503') || error?.message?.includes('high demand')
      ) {
        console.log(`[GeminiClient] Key ${currentKeyIndex} unavailable for ${currentModelName}. Switching immediately...`);
        currentKeyIndex = (currentKeyIndex + 1) % keys.length;
        if (currentKeyIndex === 0) {
          currentModelIndex++;
          if (currentModelIndex >= models.length) break;
          console.log(`[GeminiClient] All keys exhausted for ${currentModelName}. Trying model ${models[currentModelIndex]}...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        attempts++;
      } else {
        throw error;
      }
    }
  }
  throw new Error('All Gemini API keys and models failed or rate limited');
}
