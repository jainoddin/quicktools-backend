import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { generateToolText, generateToolCode } from '../services/gemini.service';
import { verifyAuth } from '../middlewares/auth.middleware';
import { User } from '../models/user.model';
import { ToolUsage } from '../models/toolUsage.model';
import { sendAdminNotificationEmail } from '../services/emailService';
import rateLimit from 'express-rate-limit';
import { JWT_SECRET } from '../config/env';
import { ShortUrl } from '../models/ShortUrl';

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
    },
    {
      title: 'AI Text Summarizer',
      slug: 'ai-summarizer',
      category: 'Productivity',
      image: 'https://cdn-icons-png.flaticon.com/512/3159/3159066.png',
      isFree: true
    },
    {
      title: 'AI Language Translator',
      slug: 'ai-translator',
      category: 'Productivity',
      image: 'https://cdn-icons-png.flaticon.com/512/484/484633.png',
      isFree: true
    },
    {
      title: 'AI Resume Builder',
      slug: 'ai-resume-builder',
      category: 'Productivity',
      image: 'https://cdn-icons-png.flaticon.com/512/2919/2919592.png',
      isFree: true
    },
    {
      title: 'AI Color Palette',
      slug: 'ai-color-palette',
      category: 'Design',
      image: 'https://cdn-icons-png.flaticon.com/512/6124/6124995.png',
      isFree: true
    },
    {
      title: 'URL Shortener',
      slug: 'url-shortener',
      category: 'Utilities',
      image: 'https://cdn-icons-png.flaticon.com/512/1006/1006771.png',
      isFree: true
    }
  ];
  
  res.json({
    success: true,
    data: tools
  });
});

// POST /api/tools/generate-text
router.post('/generate-text', async (req: Request, res: Response) => {
  try {
    const { prompt, contentType, tone, language, creativity, toolSlug, toolName } = req.body;
    
    // Optional Auth
    const token = req.cookies.token;
    let userId = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        userId = decoded.id;
      } catch (err) {}
    }

    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt is required' });
    }
    if (prompt.length > 2000) {
      return res.status(400).json({ success: false, message: 'Prompt too long. Maximum 2000 characters.' });
    }

    let user = null;
    const creditsNeeded = 10; // AI Writer uses 10 credits

    // 1. Check user credits if authenticated
    if (userId) {
      user = await User.findById(userId);
      if (user && user.credits < creditsNeeded) {
        return res.status(403).json({ 
          success: false, 
          message: 'Not enough credits. Please upgrade to Premium.' 
        });
      }
    }

    // 2. Generate content
    const text = await generateToolText({
      prompt,
      contentType: contentType || 'Blog Post',
      tone: tone || 'Friendly',
      language: language || 'English',
      creativity: creativity || 6,
    });

    // 3. Deduct credits and track usage for authenticated users
    if (user) {
      user.credits -= creditsNeeded;
      await user.save();

      await ToolUsage.create({
        userId: user._id,
        toolSlug: toolSlug || '/tools/ai-writer',
        toolName: toolName || 'AI Writer',
        prompt: prompt.substring(0, 500),
        result: text,
        creditsUsed: creditsNeeded,
      });
    }

    res.json({
      success: true,
      data: text,
      creditsRemaining: user ? user.credits : 'Guest'
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
          if (user.credits < creditsNeeded) {
            return res.status(403).json({ 
              success: false, 
              message: 'Not enough credits. Please upgrade to generate more images.',
              errorType: 'INSUFFICIENT_CREDITS'
            });
          }
          // Deduct credits
          user.credits -= creditsNeeded;
          await user.save();
          await ToolUsage.create({
            userId: user._id,
            toolSlug: '/tools/ai-image-generator',
            toolName: 'AI Image Generator',
            prompt: prompt.substring(0, 500),
            result: imageUrl,
            creditsUsed: creditsNeeded,
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

// POST /api/tools/deduct-credits
// General endpoint to deduct credits for client-side processed tools (like Background Remover)
router.post('/deduct-credits', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { toolSlug, toolName, creditsNeeded, prompt, result } = req.body;
    const userId = (req.user as any).id;
    const credits = creditsNeeded || 5;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.plan === 'free' && user.credits < credits) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not enough credits. Please upgrade to use this tool.',
        errorType: 'INSUFFICIENT_CREDITS'
      });
    }

    if (user.plan === 'free') {
      user.credits -= credits;
      await user.save();
    }

    await ToolUsage.create({
      userId: user._id,
      toolSlug: toolSlug || '/tools',
      toolName: toolName || 'Tool',
      prompt: prompt || 'Client-side image processing',
      result: result || 'Processed successfully',
      creditsUsed: credits,
    });

    res.json({
      success: true,
      message: 'Credits deducted successfully',
      creditsRemaining: user.credits
    });
  } catch (error) {
    console.error('❌ Credit deduction failed:', error);
    res.status(500).json({
      success: false,
      message: 'Credit deduction failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/tools/generate-code
router.post('/generate-code', async (req: Request, res: Response) => {
  try {
    const { prompt, language, framework, codeType } = req.body;
    
    // Optional Auth
    const token = req.cookies.token;
    let userId = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        userId = decoded.id;
      } catch (err) {}
    }

    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt is required' });
    }
    if (prompt.length > 5000) {
      return res.status(400).json({ success: false, message: 'Prompt too long. Maximum 5000 characters.' });
    }

    let user = null;
    const creditsNeeded = 50; // Code generator uses 50 credits

    // 1. Check user credits if authenticated
    if (userId) {
      try {
        user = await User.findById(userId).maxTimeMS(2000);
        if (user && user.credits < creditsNeeded) {
          return res.status(403).json({ 
            success: false, 
            message: 'Not enough credits. Please upgrade to Premium.' 
          });
        }
      } catch (dbError) {
        console.warn('⚠️ MongoDB error during credit check, bypassing:', dbError);
        user = null; // Proceed as guest
      }
    }

    // 2. Generate code
    const generatedCode = await generateToolCode({
      prompt,
      language: language || 'JavaScript',
      framework: framework || 'React',
      codeType: codeType || 'Frontend (Web)'
    });

    // 3. Deduct credits and track usage for authenticated users
    if (user) {
      try {
        user.credits -= creditsNeeded;
        await user.save();

        await ToolUsage.create({
          userId: user._id,
          toolSlug: '/tools/ai-code',
          toolName: 'AI Code Generator',
          prompt: prompt.substring(0, 500),
          result: JSON.stringify({
            html: generatedCode.html || '',
            css: generatedCode.css || '',
            js: generatedCode.js || '',
            explanation: generatedCode.explanation
          }),
          creditsUsed: creditsNeeded,
        });
      } catch (dbError) {
        console.warn('⚠️ MongoDB error during credit deduction, bypassing:', dbError);
      }
    }

    res.json({
      success: true,
      data: generatedCode,
      creditsRemaining: user ? user.credits : 'Guest'
    });
  } catch (error) {
    console.error('❌ Code generation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Code generation failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});


router.post('/generate-video', async (req: Request, res: Response) => {
  try {
    const { prompt, videoType, style, duration, aspectRatio } = req.body;
    
    // Optional Auth
    const token = req.cookies.token;
    let userId = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        userId = decoded.id;
      } catch (err) {}
    }

    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt is required' });
    }
    if (prompt.length > 2000) {
      return res.status(400).json({ success: false, message: 'Prompt too long. Maximum 2000 characters.' });
    }

    let user = null;
    const creditsNeeded = 10; // AI Video generator uses 10 credits

    // 1. Check user credits if authenticated
    if (userId) {
      user = await User.findById(userId);
      if (user && user.plan === 'free' && user.credits < creditsNeeded) {
        return res.status(403).json({ 
          success: false, 
          message: 'Not enough credits. Please upgrade to Premium.' 
        });
      }
    }

    let videoUrl = "https://www.w3schools.com/html/mov_bbb.mp4"; // Fallback video
    let hdVideoUrl = "https://www.w3schools.com/html/mov_bbb.mp4"; // Fallback HD video
    let thumbnailUrl = "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=600&auto=format&fit=crop"; // Fallback thumbnail

    try {
      const pixabayKey = '56697833-4e57c050209137ee8fb8ad3ad';
      const searchTerms = encodeURIComponent(prompt.substring(0, 100));
      const response = await fetch(`https://pixabay.com/api/videos/?key=${pixabayKey}&q=${searchTerms}&video_type=film&per_page=3`);
      const data: any = await response.json();
      
      if (data && data.hits && data.hits.length > 0) {
        const hit: any = data.hits[0];
        const videos: any = hit.videos;
        videoUrl = (videos.tiny || videos.small || videos.medium || videos.large).url;
        hdVideoUrl = (videos.large || videos.medium || videos.small).url;
        thumbnailUrl = `https://i.vimeocdn.com/video/${hit.picture_id}_960x540.jpg`;
      }
    } catch (e) {
      console.error("Pixabay fetch error:", e);
    }
    
    const resultData = {
      videoUrl: videoUrl,
      hdVideoUrl: hdVideoUrl,
      thumbnailUrl: thumbnailUrl,
      prompt: prompt
    };

    // 3. Deduct credits and track usage for authenticated users
    if (user) {
      user.credits -= creditsNeeded;
      await user.save();

      await ToolUsage.create({
        userId: user._id,
        toolSlug: '/tools/ai-video-generator',
        toolName: 'AI Video Generator',
        prompt: prompt.substring(0, 500),
        result: JSON.stringify(resultData),
        creditsUsed: creditsNeeded,
      });
    }

    res.json({
      success: true,
      data: resultData,
      creditsRemaining: user ? user.credits : 'Guest'
    });
  } catch (error) {
    console.error('❌ Video generation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Video generation failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/tools/report-error
// Reports client-side tool errors to the backend, which notifies the team via email.
router.post('/report-error', async (req: Request, res: Response) => {
  try {
    const { toolName, errorDetails, userEmail, prompt } = req.body;
    
    const subject = `[Error Report] Failure in ${toolName || 'Tool'}`;
    const contentHTML = `
      <h3>An error was reported by a user</h3>
      <p><strong>Tool:</strong> ${toolName}</p>
      <p><strong>User Email:</strong> ${userEmail || 'Guest'}</p>
      <p><strong>Prompt/Input:</strong> ${prompt || 'N/A'}</p>
      <p><strong>Error Details:</strong></p>
      <pre style="background: #f4f4f4; padding: 10px; border-radius: 5px;">${JSON.stringify(errorDetails, null, 2)}</pre>
    `;

    await sendAdminNotificationEmail(subject, contentHTML);

    res.json({ success: true, message: 'Error reported and team notified.' });
  } catch (error) {
    console.error('Failed to process error report:', error);
    res.status(500).json({ success: false, message: 'Failed to process error report.' });
  }
});

// -------------------------------------------------------------
// NEW FREE TOOLS (No credits required)
// -------------------------------------------------------------

// Helper to save free tool usage
const saveFreeToolUsage = async (req: Request, toolSlug: string, toolName: string, prompt: string, result: string) => {
  const token = req.cookies.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded.id) {
        await ToolUsage.create({
          userId: decoded.id,
          toolSlug,
          toolName,
          prompt: prompt.substring(0, 500),
          result,
          creditsUsed: 0,
        });
      }
    } catch (err) {}
  }
};

// POST /api/tools/summarize
router.post('/summarize', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Text is required' });

    const prompt = `Please summarize the following text into clear bullet points. Keep it concise and easy to understand.\n\nText:\n${text}`;
    const summary = await generateToolText({ prompt, contentType: 'Summary', tone: 'Professional', language: 'English', creativity: 3 });

    await saveFreeToolUsage(req, '/tools/ai-summarizer', 'AI Text Summarizer', text, summary);
    res.json({ success: true, text: summary });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to summarize text' });
  }
});

// POST /api/tools/translate
router.post('/translate', async (req: Request, res: Response) => {
  try {
    const { text, targetLanguage } = req.body;
    if (!text || !targetLanguage) return res.status(400).json({ success: false, message: 'Text and targetLanguage are required' });

    const prompt = `Translate the following text into ${targetLanguage}. Provide only the translation, no extra text.\n\nText:\n${text}`;
    const translation = await generateToolText({ prompt, contentType: 'Translation', tone: 'Neutral', language: targetLanguage, creativity: 1 });

    await saveFreeToolUsage(req, '/tools/ai-translator', 'AI Language Translator', `Translate to ${targetLanguage}: ${text}`, translation);
    res.json({ success: true, text: translation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to translate text' });
  }
});

// POST /api/tools/resume
router.post('/resume', async (req: Request, res: Response) => {
  try {
    const { details } = req.body;
    if (!details) return res.status(400).json({ success: false, message: 'Details are required' });

    const prompt = `Act as an expert Resume Writer. Create a professional, ATS-friendly resume based on the following details. Format the output nicely in Markdown.\n\nDetails:\n${details}`;
    const resume = await generateToolText({ prompt, contentType: 'Resume', tone: 'Professional', language: 'English', creativity: 4 });

    await saveFreeToolUsage(req, '/tools/ai-resume-builder', 'AI Resume Builder', details, resume);
    res.json({ success: true, text: resume });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to generate resume' });
  }
});

// POST /api/tools/color-palette
router.post('/color-palette', async (req: Request, res: Response) => {
  try {
    const { description } = req.body;
    if (!description) return res.status(400).json({ success: false, message: 'Description is required' });

    const prompt = `Act as an expert Designer. Generate a beautiful color palette based on this description or mood: "${description}". 
Provide exactly 5 colors. For each color, provide the HEX code and a short name/description. 
Format as a JSON array of objects, e.g. [{"hex": "#FFFFFF", "name": "Pure White"}]. Output ONLY valid JSON, nothing else.`;
    
    let paletteText = await generateToolText({ prompt, contentType: 'JSON', tone: 'Creative', language: 'English', creativity: 7 });
    
    // Clean JSON if needed
    paletteText = paletteText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    await saveFreeToolUsage(req, '/tools/ai-color-palette', 'AI Color Palette', description, paletteText);
    res.json({ success: true, palette: JSON.parse(paletteText) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to generate color palette' });
  }
});

// POST /api/tools/shorten
router.post('/shorten', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, message: 'URL is required' });

    const shortCode = Math.random().toString(36).substring(2, 8);
    const newUrl = await ShortUrl.create({ originalUrl: url, shortCode });

    const shortLink = \`/s/\${shortCode}\`;
    await saveFreeToolUsage(req, '/tools/url-shortener', 'URL Shortener', url, shortLink);
    
    res.json({ success: true, shortCode, originalUrl: url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to shorten URL' });
  }
});

export default router;
