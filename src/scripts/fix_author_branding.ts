import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Setup models
const contentSchema = new mongoose.Schema({
  title: String,
  slug: String,
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
    const records = await Model.find({ 'author.name': { $regex: 'QuickTools', $options: 'i' } });
    console.log(`Found ${records.length} records in ${Model.modelName} to update.`);

    for (const record of records) {
      if (record.author) {
        if (record.author.name && record.author.name.toLowerCase().includes('quicktools')) {
          record.author.name = 'QuickTool Team';
        }
        if (record.author.url && record.author.url.includes('quicktools')) {
          record.author.url = 'https://quicktool.space/author/quicktool-team';
        }
        await record.save();
        totalUpdated++;
      }
    }
  }

  console.log(`Updated ${totalUpdated} records in total.`);
  process.exit(0);
}

run().catch(console.error);
