import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quicktools';

const QuestionSchema = new mongoose.Schema({
  slug: String,
  title: String,
  body: String,
  excerpt: String,
  category: String,
  tags: [String],
  author: {
    name: String,
    isGuest: Boolean
  },
  status: String,
  likedBy: [],
  savedBy: [],
  answers: [],
  views: Number,
  viewedBy: [],
  createdAt: Date
});

const CommunityQuestion = mongoose.models.CommunityQuestion || mongoose.model('CommunityQuestion', QuestionSchema);

const kidQuestion = {
  slug: 'how-to-make-robox-game-' + Date.now(),
  title: 'how to make my own robox game very fast plzz?',
  body: 'hi everybody i am 10 yers old and i play lots of robox. i want to make a game like adpot me but with dinosaurs. is there a ai tool that makes the game for me?? becoz i dont know how to write the code. my freind said there is a ai that can do it. plzz tell me the name of the app so i can make my dino game today!!',
  excerpt: 'hi everybody i am 10 yers old and i play lots of robox. i want to make a game like adpot me but with dinosaurs.',
  category: 'AI Tools',
  tags: ['gaming', 'roblox', 'ai', 'help'],
  author: { name: 'QuickTools Guest', isGuest: true },
  status: 'visible',
  likedBy: [],
  savedBy: [],
  answers: [],
  views: 0,
  viewedBy: [],
  createdAt: new Date()
};

async function resetAndSeed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Delete all questions
    const result = await CommunityQuestion.deleteMany({});
    console.log(`Deleted ${result.deletedCount} existing questions.`);
    
    // Add the kid's question
    await CommunityQuestion.create(kidQuestion);
    console.log('Successfully added the 5th-grader question!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error resetting data:', error);
    process.exit(1);
  }
}

resetAndSeed();
