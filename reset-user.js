const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const email = 's39479334@gmail.com';
  
  // 1. Find user
  const user = await mongoose.connection.collection('users').findOne({ email });
  if (!user) {
    console.log('User not found!');
    process.exit(1);
  }

  // 2. Reset credits to exactly 15
  await mongoose.connection.collection('users').updateOne(
    { _id: user._id },
    { $set: { credits: 15, plan: 'free' } }
  );
  
  // 3. Clear their ToolUsage so "Used This Month" goes back to 0
  const deleted = await mongoose.connection.collection('toolusages').deleteMany({ userId: user._id });
  
  console.log(`✅ Reset user ${email}`);
  console.log(`- Set remaining credits to 15`);
  console.log(`- Cleared ${deleted.deletedCount} usage history records (Used is now 0)`);
  
  process.exit(0);
});
