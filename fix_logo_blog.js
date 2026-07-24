const mongoose = require('mongoose');

async function fixLogoBlog() {
  try {
    const mongoUri = 'mongodb+srv://skjainoddin39854_db_user:FAC9OfJvhySSUhOl@cluster0.ircj0dm.mongodb.net/';
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;

    const blog = await db.collection('blogs').findOne({ title: /Logo Generator/i });
    if (blog) {
      const newTitle = blog.title.replace(/2025/g, '2026');
      const newSlug = blog.slug.replace(/2025/g, '2026');
      
      await db.collection('blogs').updateOne(
        { _id: blog._id },
        { $set: { title: newTitle, slug: newSlug } }
      );
      console.log('✅ Blog fixed:', newTitle);
    } else {
      console.log('❌ Blog not found.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixLogoBlog();
