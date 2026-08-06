import fs from 'fs';
import https from 'https';

async function fetchImages() {
  const url = 'https://www.anthropic.com/news/claude-3-5-sonnet';
  console.log(`Fetching ${url}...`);
  
  const response = await fetch(url);
  const html = await response.text();
  
  const regex = /https%3A%2F%2Fwww-cdn\.anthropic\.com%2Fimages%2F[^&"\s]+/g;
  let matches = [...new Set(html.match(regex))];
  
  console.log(`Found ${matches.length} encoded image URLs.`);
  
  for (let i = 0; i < matches.length; i++) {
    const encodedUrl = matches[i];
    const imageUrl = decodeURIComponent(encodedUrl);
    
    // Only grab png/jpg
    if (!imageUrl.endsWith('.png') && !imageUrl.endsWith('.jpg')) {
      continue;
    }
    
    console.log(`Downloading ${imageUrl}...`);
    
    await new Promise((resolve, reject) => {
      https.get(imageUrl, (res) => {
        const file = fs.createWriteStream(`claude_real_${i}.png`);
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(`claude_real_${i}.png`, () => {});
        reject(err);
      });
    });
    console.log(`Saved claude_real_${i}.png`);
  }
}

fetchImages().catch(console.error);
