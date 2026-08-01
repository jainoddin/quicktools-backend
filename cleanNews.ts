const mongoose = require('mongoose');
const { News } = require('./src/models/News');
require('dotenv').config();

async function cleanNews() {
  await mongoose.connect(process.env.MONGODB_URI);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const afternoonNews = await News.find({ 
    createdAt: { $gte: startOfDay },
  }).sort({ createdAt: -1 });

  console.log(`Found ${afternoonNews.length} news articles created today.`);
  
  if (afternoonNews.length > 2) {
    // Keep the latest 2 (Morning + Afternoon) or maybe 3 if Night is there.
    // Let's just group by isBreaking. Morning is breaking=true. Afternoon/Night is breaking=false.
    // Wait, let's just keep the oldest Morning, oldest Afternoon, oldest Night, delete the rest.
    // But how to identify Morning vs Afternoon?
    // Morning: generated between 8 AM and 12:59 PM.
    // Afternoon: generated between 1 PM and 7:59 PM.
    // Let's just keep 1 Morning (isBreaking = true) and 1 non-breaking (Afternoon) if night hasn't happened.
    const breaking = afternoonNews.filter((n: any) => n.isBreaking);
    const nonBreaking = afternoonNews.filter((n: any) => !n.isBreaking);

    console.log(`Breaking (Morning): ${breaking.length}, Non-Breaking (Afternoon/Night): ${nonBreaking.length}`);

    if (breaking.length > 1) {
      const toDelete = breaking.slice(1);
      const idsToDelete = toDelete.map((n: any) => n._id);
      
      const result = await News.deleteMany({ _id: { $in: idsToDelete } });
      console.log(`Deleted ${result.deletedCount} duplicate breaking (morning) news articles.`);
    } else {
      console.log("No duplicate breaking news to delete.");
    }
  }

  process.exit(0);
}

cleanNews().catch(console.error);
