// @ts-nocheck
import 'dotenv/config';
import { connectDB } from './src/config/db';
import { News } from './src/models/News';
import fs from 'fs';

async function run() {
  await connectDB();
  const news = await News.find({}, 'title slug');
  fs.writeFileSync('news_slugs.json', JSON.stringify(news, null, 2));
  console.log('Done mapping news slugs');
  process.exit(0);
}
run();
