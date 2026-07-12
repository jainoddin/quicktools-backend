const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://skjainoddin39854_db_user:FAC9OfJvhySSUhOl@cluster0.ircj0dm.mongodb.net/';
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db('test');
    
    // Find user by email
    const users = db.collection('users');
    const user = await users.findOne({ email: 'skn79302@gmail.com' });
    
    if (!user) {
      console.log('User not found');
      return;
    }
    console.log('User found:', user._id);
    
    // Find tool usage for this user
    const toolUsages = db.collection('toolusages');
    const usages = await toolUsages.find({ userId: user._id }).toArray();
    
    console.log(`Found ${usages.length} usages for user.`);
    usages.forEach((u, i) => {
      console.log(`[${i+1}] Prompt: "${u.prompt}" | Date: ${u.createdAt} | Image: ${u.result.substring(0, 50)}...`);
    });
    
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
