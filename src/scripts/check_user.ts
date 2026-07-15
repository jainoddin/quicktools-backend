import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/user.model';

dotenv.config();

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    const user = await User.findOne({ email: 'naseemas646@gmail.com' });
    if (user) {
      console.log('User found:', user.email, 'Plan:', user.plan, 'Credits:', user.credits);
      // Give them their correct pro credits if they don't have them
      if (user.credits < 10000) {
        user.credits = 10000;
        await user.save();
        console.log('Updated user credits to 10000');
      }
    } else {
      console.log('User not found');
    }
  } catch(e) {
    console.error(e);
  } finally {
    mongoose.disconnect();
  }
}

checkUser();
