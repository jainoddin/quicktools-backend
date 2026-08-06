import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { CommunityQuestion } from './src/models/CommunityQuestion';

dotenv.config({path: './.env'});

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  
  // 1. Update the Roblox answer author
  const robloxQ = await CommunityQuestion.findOne({ title: /robox game/i });
  if (robloxQ) {
    // Find the answer we added (DevMike)
    const answer = robloxQ.answers.find((a: any) => a.author.name === 'DevMike' || a.author.name === 'QuickTools Guest');
    if (answer) {
      answer.author.name = "QuickTools Guest";
      answer.author.avatar = "";
      robloxQ.markModified('answers');
      await robloxQ.save();
      console.log("Updated answer author to QuickTools Guest.");
    }
  }

  // 2. Update the new question author
  const newQ = await CommunityQuestion.findOne({ title: /Any free AI tools to remove background/i });
  if (newQ) {
    newQ.author.name = "QuickTools Guest";
    newQ.author.avatar = "";
    await newQ.save();
    console.log("Updated new question author to QuickTools Guest.");
  }
  
  process.exit(0);
};

run().catch(console.error);
