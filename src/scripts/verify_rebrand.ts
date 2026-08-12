// @ts-nocheck
import 'dotenv/config';
import { connectDB } from '../config/db';
import { Blog } from '../models/Blog';
import { Article } from '../models/Article';
import { News } from '../models/News';
import { CommunityQuestion } from '../models/CommunityQuestion';

async function checkInText(text: string | undefined): boolean {
  if (!text) return false;
  // Match "QuickTools" but not if it is part of a URL or similar. Actually, let's just find ANY occurrence of "QuickTools" case-insensitively and flag it, to be safe.
  const regex = /QuickTools/i;
  return regex.test(text);
}

async function verifyBlogs() {
  const blogs = await Blog.find({});
  let found = 0;
  for (const blog of blogs) {
    if (await checkInText(blog.title) || await checkInText(blog.content) || 
        (blog.author && await checkInText(blog.author.name)) || 
        (blog.metadata && (await checkInText(blog.metadata.seoTitle) || await checkInText(blog.metadata.seoDescription)))) {
      console.log(`[Blog] Found "QuickTools" in: ${blog.slug}`);
      found++;
    }
  }
  return found;
}

async function verifyArticles() {
  const items = await Article.find({});
  let found = 0;
  for (const item of items) {
    if (await checkInText(item.title) || await checkInText(item.content) || 
        (item.author && (await checkInText(item.author.name) || await checkInText(item.author.avatar))) || 
        (item.metadata && (await checkInText(item.metadata.seoTitle) || await checkInText(item.metadata.seoDescription)))) {
      console.log(`[Article] Found "QuickTools" in: ${item.slug}`);
      found++;
    }
  }
  return found;
}

async function verifyNews() {
  const items = await News.find({});
  let found = 0;
  for (const item of items) {
    if (await checkInText(item.title) || await checkInText(item.content) || await checkInText(item.quickToolsInsight) ||
        (item.author && await checkInText(item.author.name)) || 
        (item.metadata && (await checkInText(item.metadata.seoTitle) || await checkInText(item.metadata.seoDescription)))) {
      console.log(`[News] Found "QuickTools" in: ${item.slug}`);
      found++;
    }
  }
  return found;
}

async function verifyCommunity() {
  const items = await CommunityQuestion.find({});
  let found = 0;
  for (const item of items) {
    let hasIt = await checkInText(item.title) || await checkInText(item.content) || (item.author && await checkInText(item.author.name));
    if (!hasIt && item.answers) {
      for (const ans of item.answers) {
        if (await checkInText(ans.content) || (ans.author && await checkInText(ans.author.name))) {
          hasIt = true;
          break;
        }
      }
    }
    if (hasIt) {
      console.log(`[CommunityQuestion] Found "QuickTools" in: ${item.slug}`);
      found++;
    }
  }
  return found;
}

async function run() {
  await connectDB();
  console.log('Connected to DB, verifying rebranding...');
  
  let totalFound = 0;
  totalFound += await verifyBlogs();
  totalFound += await verifyArticles();
  totalFound += await verifyNews();
  totalFound += await verifyCommunity();
  
  if (totalFound === 0) {
    console.log('✅ SUCCESS: 0 occurrences of "QuickTools" found in the checked text fields.');
  } else {
    console.log(`❌ FAILURE: Found ${totalFound} documents containing "QuickTools". Please review logs above.`);
  }
  
  process.exit(0);
}

run();
