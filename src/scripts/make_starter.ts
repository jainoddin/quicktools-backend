import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/user.model';

dotenv.config();

async function makeStarter() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    const user = await User.findOne({ email: 'j28391233@gmail.com' });
    if (user) {
      user.plan = 'starter';
      user.credits = 500; // Starter plan gives 500 credits
      await user.save();
      console.log(`Updated user ${user.email} to Starter plan with 500 credits.`);
    } else {
      console.log('User not found');
    }
  } catch(e) {
    console.error(e);
  } finally {
    mongoose.disconnect();
  }
}

makeStarter();
