const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  let connected = false;
  for (let i = 0; i < 5; i++) {
    try {
      await mongoose.connect('mongodb://skjainoddin39854_db_user:FAC9OfJvhySSUhOl@ac-y83j2vv-shard-00-00.ircj0dm.mongodb.net:27017,ac-y83j2vv-shard-00-01.ircj0dm.mongodb.net:27017,ac-y83j2vv-shard-00-02.ircj0dm.mongodb.net:27017/?ssl=true&replicaSet=atlas-y83j2vv-shard-0&authSource=admin&retryWrites=true&w=majority');
      connected = true;
      break;
    } catch (e) {
      console.log('Retry connection...', e.message);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  
  if (!connected) {
    console.error('Failed to connect to MongoDB');
    process.exit(1);
  }
  
  const db = mongoose.connection.db;
  
  console.log('--- Fixing Blogs Slugs ---');
  const blogs = await db.collection('blogs').find({ slug: /2024/ }).toArray();
  const blogRedirects = [];
  for (const b of blogs) {
    const newSlug = b.slug.replace(/2024/g, '2026');
    console.log(`Updating Blog: ${b.slug} -> ${newSlug}`);
    await db.collection('blogs').updateOne({ _id: b._id }, { $set: { slug: newSlug } });
    blogRedirects.push({ source: `/blog/${b.slug}`, destination: `/blog/${newSlug}`, permanent: true });
  }

  console.log('--- Fixing Articles Slugs ---');
  const articles = await db.collection('articles').find({ slug: /2024/ }).toArray();
  const articleRedirects = [];
  for (const a of articles) {
    const newSlug = a.slug.replace(/2024/g, '2026');
    console.log(`Updating Article: ${a.slug} -> ${newSlug}`);
    await db.collection('articles').updateOne({ _id: a._id }, { $set: { slug: newSlug } });
    articleRedirects.push({ source: `/article/${a.slug}`, destination: `/article/${newSlug}`, permanent: true });
  }

  console.log('--- Fixing Apple Intelligence News ---');
  // Revert title to iOS 18
  await db.collection('news').updateMany(
    { slug: { $regex: /ios-18/i } },
    { $set: { title: 'Apple Intelligence Debuts in iOS 18', date: '2024-06-10T10:00:00Z', isBreaking: false, isLatest: false } }
  );

  console.log('--- Fixing Meta Llama News ---');
  // Revert date and remove breaking flag
  await db.collection('news').updateMany(
    { slug: { $regex: /llama/i } },
    { $set: { date: '2024-07-23T10:00:00Z', isBreaking: false, isLatest: false } }
  );

  console.log('--- Fixing Duplicate NVIDIA Rubin News ---');
  const rubins = await db.collection('news').find({ title: { $regex: /Rubin/i } }).sort({ date: -1 }).toArray();
  if (rubins.length > 1) {
    console.log(`Found ${rubins.length} NVIDIA Rubin articles.`);
    // Keep the first one, delete the rest
    const mainRubin = rubins[0];
    for (let i = 1; i < rubins.length; i++) {
      console.log(`Deleting duplicate Rubin: ${rubins[i].slug}`);
      await db.collection('news').deleteOne({ _id: rubins[i]._id });
      // Redirect deleted to main
      blogRedirects.push({ source: `/news/${rubins[i].slug}`, destination: `/news/${mainRubin.slug}`, permanent: true });
    }
  }

  console.log('\n--- NEXT.JS REDIRECTS (Copy into next.config.ts) ---');
  console.log(JSON.stringify([...blogRedirects, ...articleRedirects], null, 2));

  process.exit(0);
}

run();
