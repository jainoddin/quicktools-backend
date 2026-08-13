import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Setup models
const contentSchema = new mongoose.Schema({
  title: String,
  slug: String,
  content: String,
  author: {
    name: String,
    url: String,
    avatar: String
  }
}, { strict: false });

const Blog = mongoose.models.Blog || mongoose.model('Blog', contentSchema);
const Article = mongoose.models.Article || mongoose.model('Article', contentSchema);
const News = mongoose.models.News || mongoose.model('News', contentSchema);

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const models = [Blog, Article, News];
  let totalUpdated = 0;

  for (const Model of models) {
    // Find all records
    const records = await Model.find({});
    console.log(`Checking ${records.length} records in ${Model.modelName}...`);

    for (const record of records) {
      let updated = false;

      // Fix content
      if (record.content) {
        const oldContent = record.content;
        // Replace QuickTools.ai, QuickTool.ai, QuickTools AI, QuickTools with QuickTool
        // Be careful not to replace URLs if they are meant to be quicktool.space?
        // Wait, the prompt says URLs should be quicktool.space.
        
        // Let's do a global replace
        let newContent = oldContent
          .replace(/QuickTools\.ai/gi, 'QuickTool')
          .replace(/QuickTool\.ai/gi, 'QuickTool')
          .replace(/QuickTools AI/gi, 'QuickTool')
          .replace(/QuickTools/gi, 'QuickTool');
        
        // Also fix any remaining author names just in case
        if (record.author) {
          if (record.author.name && record.author.name.toLowerCase().includes('quicktools')) {
            record.author.name = 'QuickTool Team';
            updated = true;
          }
        }

        if (newContent !== oldContent) {
          record.content = newContent;
          updated = true;
        }
      }

      if (updated) {
        await record.save();
        totalUpdated++;
      }
    }
  }

  console.log(`Updated content/branding in ${totalUpdated} records total.`);
  process.exit(0);
}

run().catch(console.error);
