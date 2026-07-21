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
      You are the elite Social Media Manager for QuickTools.ai.
      Write a highly engaging, professional, and exciting social media post promoting our tool: "${tool.name}".
      
      CRITICAL INSTRUCTIONS FOR VARIETY:
      - The text style, structure, and length MUST be completely different every time. 
      - Use a unique hook (e.g., question, bold statement, statistic, or short story).
      - EMOJIS: Do NOT use the same generic emojis (like 🚀 or ✨) every time. Pick unique, highly specific emojis that match the tool's context. 
      - FORMAT: Sometimes use bullet points, sometimes short paragraphs, sometimes a single punchy paragraph.
      
      Requirements:
      - Briefly explain the core benefit of "${tool.name}".
      - Add a catchy, varied tagline at the end.
      - Include 3-6 relevant, trending hashtags.
      - Include this exact link at the very end of the post text: ${tool.url}
      - Keep it engaging and professional.
      
      Return ONLY the text of the post. Do not include any JSON, quotes, or markdown formatting blocks.
    `;

    const generatedText = await runWithFailover(async (genAI) => {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(postPrompt);
      return result.response.text();
    });

    const postContent = generatedText.trim();
    
    // Generate AI Image dynamically
    // Instagram Graph API is very strict and rejects URLs without .jpg/.png or fm=jpg.
    // So we use highly reliable premium Unsplash robot/tech images with exact formatting.
    const roboImages = [
      'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max', // Robot looking up
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max', // Robot hand
      'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max', // Circuit board AI
      'https://images.unsplash.com/photo-1589254065878-42c9da997008?q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max', // Robot face
      'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max', // Cute robot
      'https://images.unsplash.com/photo-1488229297570-58520851e868?q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max', // AI screen
      'https://images.unsplash.com/photo-1507146426996-ef05306b995a?q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max', // Tech puppy dog robot
      'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max'  // Abstract AI brain
    ];

    // Cycle through images using the current day and hour so they NEVER repeat consecutively
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    const hour = now.getHours();
    
    const index = (dayOfYear + hour) % roboImages.length;
    const finalImageUrl = roboImages[index];

    // 3. Post to Make.com Webhook
    const payload = {
      text: postContent,
      imageUrl: finalImageUrl,
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

