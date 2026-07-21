import { generateAndPostToSocialMedia } from './src/services/socialMediaGenerator';

generateAndPostToSocialMedia().then(() => {
  console.log('✅ Triggered socialMediaGenerator');
}).catch(console.error);
