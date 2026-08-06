import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { CommunityQuestion } from './src/models/CommunityQuestion';

dotenv.config({path: './.env'});

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  
  // 1. Add answer to Roblox question
  const robloxQ = await CommunityQuestion.findOne({ title: /robox game/i });
  if (robloxQ) {
    const answer = {
      body: "Hey buddy! If you want to make a game like Adopt Me but with dinosaurs, you should download Roblox Studio on a computer. It has a 'Toolbox' where you can search for free dinosaur models to put in your game! There are awesome tutorials on YouTube for beginners (search for 'Roblox Studio beginner tutorial'). Don't worry about making it very fast, just have fun building your world piece by piece. Good luck with your dinosaur game! 🦖",
      author: {
        name: "DevMike",
        isGuest: true,
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=DevMike"
      },
      likedBy: [],
      replies: [],
      status: 'visible'
    };
    robloxQ.answers.push(answer);
    await robloxQ.save();
    console.log("Added answer to Roblox question.");
  } else {
    console.log("Roblox question not found.");
  }

  // 2. Create new short realistic question
  const newQ = new CommunityQuestion({
    slug: 'free-ai-tools-remove-background-product-photos-' + Date.now(),
    title: 'Any free AI tools to remove background from product photos?',
    body: 'Hey guys, I run a small Etsy shop and take pictures of my crafts on my phone. Is there a free AI tool on this platform that can easily remove the background so I can put a solid white background instead? Thanks!',
    excerpt: 'Looking for a free tool to remove backgrounds from my Etsy product photos taken on my phone.',
    category: 'Design',
    tags: ['design', 'ecommerce', 'image-editing'],
    author: {
      name: 'Sarah Craft',
      isGuest: true,
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=SarahCraft"
    },
    status: 'visible',
    answers: []
  });
  
  await newQ.save();
  console.log("Created new realistic guest question.");
  
  process.exit(0);
};

run().catch(console.error);
