const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Load the model directly to avoid TS compilation issues in JS script
const articleSchema = new mongoose.Schema({ title: String, publishedAt: Date }, { collection: 'articles', strict: false });
const Article = mongoose.models.Article || mongoose.model('Article', articleSchema);

const cronFailureSchema = new mongoose.Schema({ type: String, date: String, error: String, emailed: Boolean }, { collection: 'cronfailures', strict: false });
const CronFailure = mongoose.models.CronFailure || mongoose.model('CronFailure', cronFailureSchema);

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const failures = await CronFailure.find({ type: 'article' });
  console.log("Article Failures:", failures);
  
  const startOfDay = new Date('2026-07-20T00:00:00.000+05:30');
  const endOfDay = new Date('2026-07-20T23:59:59.999+05:30');
  
  const articles = await Article.find({
    publishedAt: {
      $gte: startOfDay,
      $lt: endOfDay
    }
  });
  console.log(`Articles published on 20th: ${articles.length}`);
  
  process.exit();
}

check();
