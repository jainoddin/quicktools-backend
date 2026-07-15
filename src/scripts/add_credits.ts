import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/user.model';

dotenv.config();

async function addCredits() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    const user = await User.findOne({ email: 'naseemas646@gmail.com' });
    if (user) {
      user.credits += 100;
      await user.save();
      console.log('Added 100 credits. New balance:', user.credits);
    } else {
      console.log('User not found');
    }
  } catch(e) {
    console.error(e);
  } finally {
    mongoose.disconnect();
  }
}

addCredits();
