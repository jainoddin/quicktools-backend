import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch';

dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || '';

const PromptSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  description: { type: String },
  prompt: { type: String, required: true },
  variables: [{ type: String }],
  models: [{ type: String }],
  tags: [{ type: String }],
  difficulty: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced', 'beginner', 'intermediate', 'advanced'], default: 'Beginner' },
  sourceType: { type: String, enum: ['curated', 'user', 'ai_generated'], default: 'curated' },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'published' },
  views: { type: Number, default: 0 },
  copies: { type: Number, default: 0 },
  uses: { type: Number, default: 0 },
  favorites: { type: Number, default: 0 },
  promptHash: { type: String },
  ogImage: { type: String }
}, { timestamps: true });

const Prompt = mongoose.models.Prompt || mongoose.model('Prompt', PromptSchema);

async function seed() {
  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    const baseUrl = 'https://pub-0a928134dcdc420da2af02e6238ef06b.r2.dev/promt/quicktools_prompt_hub_300_relevant_images.json';
    const url = `${baseUrl}?v=${Date.now()}`; // Cache buster
    console.log(`Fetching data from ${url}...`);
    const res = await fetch(url);
    const data: any = await res.json();

    if (!data.prompts || !Array.isArray(data.prompts)) {
      console.error('Invalid JSON structure. Expected "prompts" array.');
      process.exit(1);
    }

    console.log(`Fetched ${data.prompts.length} prompts.`);
    
    // Clear existing curated prompts if any, or maybe just insert new ones?
    // Let's use bulkWrite with upsert to avoid duplicate slugs
    const ops = data.prompts.map((p: any) => {
      // Force status to 'published' for the UI to show them
      p.status = 'published';
      
      // Map imageUrl from JSON → ogImage in DB (overwrite old quicktool.space OG URLs)
      if (p.imageUrl) {
        p.ogImage = p.imageUrl;
      }
      
      return {
        updateOne: {
          filter: { slug: p.slug },
          update: { $set: p },
          upsert: true
        }
      };
    });

    console.log(`Writing ${ops.length} prompts to the database...`);
    const result = await Prompt.bulkWrite(ops);
    console.log('Seed completed successfully!', result);

    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
}

seed();
