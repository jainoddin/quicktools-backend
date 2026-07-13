import 'dotenv/config';
import { connectDB } from '../config/db';
import { Article } from '../models/Article';
import { generateArticle } from '../services/articleGenerator';

async function run() {
  await connectDB();
  console.log('🔗 Connected to DB');

  const count = 1; // Generate 1 article for testing
  console.log(`🚀 Starting generation of ${count} articles...`);

  for (let i = 0; i < count; i++) {
    try {
      console.log(`\n⏳ Generating Article ${i + 1}/${count}...`);
      const articleData = await generateArticle();

      const existing = await Article.findOne({ slug: articleData.slug });
      if (existing) {
        articleData.slug = `${articleData.slug}-${Date.now()}`;
      }

      const article = new Article(articleData);
      await article.save();

      console.log(`✅ Success: "${article.title}" saved!`);
    } catch (error) {
      console.error(`❌ Failed to generate Article ${i + 1}:`, error);
    }
  }

  console.log('\n🎉 Finished generating articles.');
  process.exit(0);
}

run();
