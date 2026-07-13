import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { generateToolText } from '../services/gemini.service';
import { verifyAuth } from '../middlewares/auth.middleware';
import { User } from '../models/user.model';
import { ToolUsage } from '../models/toolUsage.model';
import rateLimit from 'express-rate-limit';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only_please_change';

const router = Router();

// Rate limiter for image generation to prevent spam/bots
const imageGenerationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 image generation requests per windowMs
  message: { success: false, message: 'Too many images generated from this IP, please try again after 15 minutes' }
});

// GET /api/tools
router.get('/', (req: Request, res: Response) => {
  const tools = [
    {
      title: 'AI Image Generator',
      slug: 'ai-image-generator',
      category: 'Design',
      image: 'https://cdn-icons-png.flaticon.com/512/8345/8345328.png'
    },
    {
      title: 'Background Remover',
      slug: 'background-remover',
      category: 'Design',
      image: 'https://cdn-icons-png.flaticon.com/512/10051/10051515.png'
    },
    {
      title: 'AI Writer',
      slug: 'ai-writer',
      category: 'Productivity',
      image: 'https://cdn-icons-png.flaticon.com/512/11186/11186638.png'
    },
    {
      title: 'AI Video Generator',
      slug: 'ai-video-generator',
      category: 'Marketing',
      image: 'https://cdn-icons-png.flaticon.com/512/8061/8061266.png'
    },
    {
      title: 'AI Code Generator',
      slug: 'ai-code-generator',
      category: 'Development',
      image: 'https://cdn-icons-png.flaticon.com/512/10051/10051410.png'
    }
  ];
  
  res.json({
    success: true,
    data: tools
  });
});

// POST /api/tools/generate-text
router.post('/generate-text', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { prompt, contentType, tone, language, creativity, toolSlug, toolName } = req.body;
    const userId = (req.user as any).id;

    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt is required' });
    }
    if (prompt.length > 2000) {
      return res.status(400).json({ success: false, message: 'Prompt too long. Maximum 2000 characters.' });
    }

    // 1. Check user credits
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const creditsNeeded = 2; // AI Writer / Code uses 2 credits

    if (user.plan === 'free' && user.credits < creditsNeeded) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not enough credits. Please upgrade to Premium.' 
      });
    }

    // 2. Generate content
    const text = await generateToolText({
      prompt,
      contentType: contentType || 'Blog Post',
      tone: tone || 'Friendly',
      language: language || 'English',
      creativity: creativity || 6,
    });

    // 3. Deduct credits and track usage
    if (user.plan === 'free') {
      user.credits -= creditsNeeded;
      await user.save();
    }

    await ToolUsage.create({
      userId: user._id,
      toolSlug: toolSlug || '/tools/ai-writer',
      toolName: toolName || 'AI Writer',
      prompt: prompt.substring(0, 500), // Save first 500 chars of prompt
      result: 'Generated content successfully',
      creditsUsed: user.plan === 'free' ? creditsNeeded : 0, // 0 if premium (unlimited)
    });

    res.json({
      success: true,
      data: text,
      creditsRemaining: user.plan === 'free' ? user.credits : 'Unlimited'
    });
  } catch (error) {
    console.error('❌ Text generation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Text generation failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/tools/generate-image
// Guests: 1 free generation (IP rate limited). Auth users: credit system.
router.post('/generate-image', imageGenerationLimiter, async (req: Request, res: Response) => {
  try {
    const { prompt, model, style, ratio, quality } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt is required' });
    }
    if (prompt.length > 1000) {
      return res.status(400).json({ success: false, message: 'Prompt too long. Maximum 1000 characters.' });
    }
    
    // Construct Pollinations URL
    const fullPrompt = `Model: ${model || 'dall-e-3'}, Style: ${style || 'Realistic'}, ${prompt.trim()}`;
    const encodedPrompt = encodeURIComponent(fullPrompt);
    
    let width = 1024, height = 1024;
    if (quality === 'standard') {
      if (ratio === '1:1') { width = 512; height = 512; }
      else if (ratio === '16:9') { width = 640; height = 360; }
      else if (ratio === '9:16') { width = 360; height = 640; }
      else if (ratio === '4:3') { width = 512; height = 384; }
      else { width = 512; height = 512; }
    } else {
      if (ratio === '1:1') { width = 1024; height = 1024; }
      else if (ratio === '16:9') { width = 1280; height = 720; }
      else if (ratio === '9:16') { width = 720; height = 1280; }
      else if (ratio === '4:3') { width = 1024; height = 768; }
      else { width = 1024; height = 1024; }
    }

    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;

    // Optional auth — if logged in, use credit system
    const token = req.cookies?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const user = await User.findById(decoded.id);
        
        if (user) {
          const creditsNeeded = 5;
          if (user.plan === 'free' && user.credits < creditsNeeded) {
            return res.status(403).json({ 
              success: false, 
              message: 'Not enough credits. Please upgrade to generate more images.',
              errorType: 'INSUFFICIENT_CREDITS'
            });
          }
          // Deduct credits
          if (user.plan === 'free') {
            user.credits -= creditsNeeded;
            await user.save();
          }
          await ToolUsage.create({
            userId: user._id,
            toolSlug: '/tools/ai-image-generator',
            toolName: 'AI Image Generator',
            prompt: prompt.substring(0, 500),
            result: imageUrl,
            creditsUsed: user.plan === 'free' ? creditsNeeded : 0,
          });
        }
      } catch (authErr) {
        // Token invalid — treat as guest (IP rate limit protects us)
        console.error('Auth check in image gen failed, treating as guest:', authErr);
      }
    }
    // If no token → guest user, IP rate limit (10/15min) is the protection

    // Pre-fetch the image to ensure Pollinations generates it and it's ready for the frontend browser
    try {
      console.log(`Pre-fetching AI image: ${imageUrl}`);
      // Simple fetch without waiting for body text, just wait for headers/status
      const imgRes = await fetch(imageUrl);
      console.log(`AI image pre-fetch status: ${imgRes.status}`);
    } catch (fetchErr) {
      console.error('Error pre-fetching pollinations image:', fetchErr);
    }

    res.json({
      success: true,
      data: imageUrl
    });
  } catch (error) {
    console.error('❌ Image generation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Image generation failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
