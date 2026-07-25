import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const apiKey = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '').split(',')[0];

if (!apiKey) {
  console.error("No API key found in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data: any = await response.json();
    console.log("Available models:");
    data.models.forEach((m: any) => {
      console.log(`- ${m.name} (Methods: ${m.supportedGenerationMethods?.join(', ')})`);
    });
  } catch (err) {
    console.error("Error fetching models:", err);
  }
}

listModels();
