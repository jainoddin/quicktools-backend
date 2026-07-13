const fs = require('fs');
const path = require('path');

async function downloadImage(title, filename) {
    console.log(`Downloading: ${title}`);
    const prompt = encodeURIComponent(title + ' clean modern tech editorial photography 8k resolution highly detailed');
    const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=1200&height=800&nologo=true&seed=${Math.floor(Math.random() * 10000)}`;
    
    try {
        const response = await fetch(imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        
        const filepath = path.join(__dirname, '../../../frontend/public/mock-articles', filename);
        fs.writeFileSync(filepath, Buffer.from(arrayBuffer));
        console.log(`Success: ${filename} (Size: ${arrayBuffer.byteLength} bytes)`);
    } catch (e) {
        console.error(`Failed for ${title}:`, e);
    }
}

async function run() {
    await downloadImage("How to Build an AI Chatbot Tutorial", "how-to-build-an-ai-chatbot-tutorial.jpg");
    await new Promise(r => setTimeout(r, 5000)); // 5 second delay
    await downloadImage("OpenAI Announces New Vision Model", "openai-announces-new-vision-model.jpg");
}

run();
