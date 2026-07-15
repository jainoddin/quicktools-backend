import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/user.model';

dotenv.config();

async function makePro() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    const user = await User.findOne({ email: 'naseemas646@gmail.com' });
    if (user) {
      user.plan = 'pro';
      await user.save();
      console.log('Account upgraded to pro successfully!');
    } else {
      console.log('User not found');
    }
  } catch(e) {
    console.error(e);
  } finally {
    mongoose.disconnect();
  }
}

makePro();
