import { runWithFailover } from './geminiClient';
import fetch from 'node-fetch';

// List of available tools to pick from
const toolsList = [
  { name: 'AI Resume Builder', url: 'https://quicktools.space/tools/ai-resume-builder' },
  { name: 'AI Image Generator', url: 'https://quicktools.space/tools/ai-image-generator' },
  { name: 'Background Remover', url: 'https://quicktools.space/tools/background-remover' },
  { name: 'AI Grammar Checker', url: 'https://quicktools.space/tools/ai-grammar-checker' },
  { name: 'AI Video Generator', url: 'https://quicktools.space/tools/ai-video-generator' },
  { name: 'AI Business Name Generator', url: 'https://quicktools.space/tools/ai-business-name-generator' },
  { name: 'AI Presentation Generator', url: 'https://quicktools.space/tools/ai-presentation-generator' },
  { name: 'AI Logo Maker', url: 'https://quicktools.space/tools/ai-logo-maker' },
  { name: 'Code Explainer', url: 'https://quicktools.space/tools/ai-code-explainer' },
  { name: 'SQL Query Generator', url: 'https://quicktools.space/tools/ai-sql-generator' }
];

export async function generateAndPostToSocialMedia() {
  try {
    const makeWebhookUrl = 'https://hook.eu1.make.com/ljr6ps4bje9d78zndivnahh0w5eaqk49';

    // 1. Pick a random tool
    const tool = toolsList[Math.floor(Math.random() * toolsList.length)];

    // 2. Generate Social Media Post Content using Gemini
    const postPrompt = `
      You are the Social Media Manager for QuickTools.ai.
      Write a highly engaging, professional, and exciting social media post promoting our tool: "${tool.name}".
      
      Requirements:
      - Start with a strong hook.
      - Briefly explain the core benefit of "${tool.name}".
      - Add a catchy tagline at the end.
      - Include 5-7 relevant, trending hashtags (e.g., #AI, #Productivity, #QuickTools).
      - Include this exact link at the very end of the post text: ${tool.url}
      - Keep it under 280 characters if possible so it fits on Twitter/X, but make sure it packs a punch.
      
      Return ONLY the text of the post. Do not include any JSON or markdown formatting blocks.
    `;

    const generatedText = await runWithFailover(async (genAI) => {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(postPrompt);
      return result.response.text();
    });

    const postContent = generatedText.trim();
    const defaultImageUrl = 'https://quicktools.space/og-image.jpg';

    // 3. Post to Make.com Webhook
    const payload = {
      text: postContent,
      imageUrl: defaultImageUrl,
      toolName: tool.name,
      toolUrl: tool.url
    };

    console.log(`[SocialMedia] Sending post data to Make.com Webhook...`);
    
    const response = await fetch(makeWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log(`✅ Successfully sent data to Make.com Webhook!`);
    } else {
      console.error(`❌ Make.com webhook failed with status: ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Failed to generate or post to social media:', error);
  }
}

