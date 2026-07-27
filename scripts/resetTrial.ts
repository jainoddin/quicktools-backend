import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const TARGET_EMAIL = 'jainoddins221@gmail.com';

async function resetTrial() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to MongoDB.');

  const User = mongoose.model('User', new mongoose.Schema({
    email: String,
    createdAt: Date,
    freeGenerationsCount: Number,
    lastGenerationDate: Date,
  }, { timestamps: false }));

  const user = await User.findOne({ email: TARGET_EMAIL });

  if (!user) {
    console.log(`❌ User not found: ${TARGET_EMAIL}`);
    await mongoose.disconnect();
    return;
  }

  // Set createdAt to now → 3 day trial starts fresh
  user.createdAt = new Date();
  user.freeGenerationsCount = 0;
  user.lastGenerationDate = new Date(0); // epoch → today's counter resets on first gen
  await user.save();

  console.log(`✅ Free trial reset for: ${TARGET_EMAIL}`);
  console.log(`   New createdAt: ${user.createdAt}`);
  console.log(`   freeGenerationsCount: ${user.freeGenerationsCount}`);
  console.log(`   Trial active until: ${new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`);

  await mongoose.disconnect();
}

resetTrial().catch(console.error);
