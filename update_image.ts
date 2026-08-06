import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import fs from 'fs';
import { uploadToR2 } from './src/services/r2.service';

dotenv.config({path: './.env'});

mongoose.connect(process.env.MONGODB_URI!).then(async () => {
  const Article = mongoose.models.Article || mongoose.model('Article', new mongoose.Schema({}, {strict: false}));
  
  const imagePath = 'C:\\Users\\jain\\.gemini\\antigravity-ide\\brain\\e9153271-3849-40ac-b76d-2f2d241ae9b7\\ai_synthetic_data_1785952931991.png';
  const fileBuffer = fs.readFileSync(imagePath);
  
  console.log('Uploading image to R2...');
  const publicUrl = await uploadToR2(fileBuffer, 'image/png', 'ai_synthetic_data.png', 'article_covers');
  
  console.log('Uploaded to:', publicUrl);
  
  await Article.updateOne(
    {slug: /ai-synthetic-data/},
    {$set: {coverImage: publicUrl}}
  );
  
  console.log('Database updated with R2 URL!');
}).catch(console.error).finally(() => process.exit(0));
