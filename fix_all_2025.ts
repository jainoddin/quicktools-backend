import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');
  const db = mongoose.connection.db;
  if (!db) return;

  const cols = ['blogs', 'articles', 'news'];
  for (const col of cols) {
    const docs = await db.collection(col).find({ title: /2025/ }).toArray();
    for (const doc of docs) {
      console.log(`Found 2025 in ${col}:`, doc.title);
      await db.collection(col).updateOne(
        { _id: doc._id },
        { $set: { 
            title: doc.title.replace(/2025/g, '2026'),
            slug: doc.slug.replace(/2025/g, '2026')
          } 
        }
      );
      console.log('Updated to 2026');
    }
  }

  mongoose.disconnect();
}
run();
