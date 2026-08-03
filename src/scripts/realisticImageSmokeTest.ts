import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { generateImageWithQualityGate } from '../services/imageQualityPipeline';
import { deleteFromR2 } from '../services/r2.service';

async function main() {
  await connectDB();
  const result = await generateImageWithQualityGate({
    contentId: `realistic-image-smoke-${Date.now()}`,
    kind: 'blog', category: 'AI & Tools',
    topic: 'AI workflow automation for small teams', folder: 'pipeline_smoke', maxRegenerations: 0,
  });
  if (!result) throw new Error('Realistic image smoke test failed');
  await deleteFromR2(result.url);
  console.log(`Realistic image smoke test passed (${result.family})`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async error => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
