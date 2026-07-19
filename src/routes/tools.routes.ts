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
import { premiumPrompts } from '../config/premiumPrompts';


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
    let usageId = null;
    if (user) {
      user.credits -= creditsNeeded;
      await user.save();

      const usage = await ToolUsage.create({
        userId: user._id,
        toolSlug: toolSlug || '/tools/ai-writer',
        toolName: toolName || 'AI Writer',
        prompt: prompt.substring(0, 500),
        result: text,
        creditsUsed: creditsNeeded,
      });
      usageId = usage._id;
    }

    res.json({
      success: true,
      data: text,
      creditsRemaining: user ? user.credits : 'Guest',
      usageId
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
    let usageId = null;
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
    let usageId = null;
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
        const usage = await ToolUsage.create({
          userId: decoded.id,
          toolSlug,
          toolName,
          prompt: prompt.substring(0, 500),
          result,
          creditsUsed: 0,
        });
        return usage._id;
      }
    } catch (err) {}
  }
  return null;
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

    const shortLink = `/s/${shortCode}`;
    await saveFreeToolUsage(req, '/tools/url-shortener', 'URL Shortener', url, shortLink);
    
    res.json({ success: true, shortCode, originalUrl: url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to shorten URL' });
  }
});

// POST /api/tools/grammar
router.post('/grammar', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Text is required' });

    const prompt = `Act as an expert Proofreader. Correct the grammar, spelling, and punctuation of the following text. Make it sound professional and fluent, but keep the original meaning intact. Output ONLY the corrected text without any extra conversational filler.\n\nText:\n${text}`;
    const result = await generateToolText({ prompt, contentType: 'Grammar Correction', tone: 'Professional', language: 'English', creativity: 2 });

    const usageId = await saveFreeToolUsage(req, '/tools/ai-grammar-checker', 'AI Grammar Checker', text, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to correct grammar' });
  }
});

// POST /api/tools/caption
router.post('/caption', async (req: Request, res: Response) => {
  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ success: false, message: 'Topic is required' });

    const prompt = `Act as an expert Social Media Manager. Generate 3 highly engaging captions for an Instagram or Twitter post about "${topic}". Include relevant emojis and 5 trending hashtags for each. Format the output in Markdown with clear separation between options.`;
    const result = await generateToolText({ prompt, contentType: 'Social Media Caption', tone: 'Engaging', language: 'English', creativity: 8 });

    const usageId = await saveFreeToolUsage(req, '/tools/ai-caption-generator', 'AI Caption Generator', topic, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to generate captions' });
  }
});

// POST /api/tools/email
router.post('/email', async (req: Request, res: Response) => {
  try {
    const { emailText, tone } = req.body;
    if (!emailText) return res.status(400).json({ success: false, message: 'Original email text is required' });

    const prompt = `Act as an expert Communicator. Draft a ${tone || 'Professional'} reply to the following email. Make it clear, concise, and appropriate for the requested tone. Output ONLY the email body.\n\nOriginal Email:\n${emailText}`;
    const result = await generateToolText({ prompt, contentType: 'Email Reply', tone: tone || 'Professional', language: 'English', creativity: 5 });

    const usageId = await saveFreeToolUsage(req, '/tools/ai-email-generator', 'AI Email Reply Generator', `Tone: ${tone || 'Professional'}\nEmail: ${emailText}`, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to generate email reply' });
  }
});

// POST /api/tools/business-name
router.post('/business-name', async (req: Request, res: Response) => {
  try {
    const { keywords } = req.body;
    if (!keywords) return res.status(400).json({ success: false, message: 'Keywords/Description is required' });

    const prompt = `Act as an expert Branding Consultant. Generate 7 catchy, memorable, and creative business names based on the following keywords or description: "${keywords}". For each name, provide a short, catchy tagline. Format the output clearly as a bulleted list in Markdown.`;
    const result = await generateToolText({ prompt, contentType: 'Business Name', tone: 'Creative', language: 'English', creativity: 9 });

    const usageId = await saveFreeToolUsage(req, '/tools/ai-business-name-generator', 'AI Business Name Generator', keywords, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to generate business names' });
  }
});

// POST /api/tools/blog-idea
router.post('/blog-idea', async (req: Request, res: Response) => {
  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ success: false, message: 'Topic is required' });
    const prompt = `Act as an expert Content Marketer. Generate 10 highly engaging and viral blog post ideas or titles about "${topic}". Format as a markdown numbered list.`;
    const result = await generateToolText({ prompt, contentType: 'Blog Ideas', tone: 'Engaging', language: 'English', creativity: 8 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-blog-idea-generator', 'AI Blog Idea Generator', topic, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate blog ideas' }); }
});

// POST /api/tools/article-outline
router.post('/article-outline', async (req: Request, res: Response) => {
  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ success: false, message: 'Topic is required' });
    const prompt = `Act as an expert Content Writer. Create a comprehensive, SEO-optimized article outline for the topic "${topic}". Include H1, H2, and H3 headers. Format nicely in markdown.`;
    const result = await generateToolText({ prompt, contentType: 'Article Outline', tone: 'Professional', language: 'English', creativity: 7 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-article-outline-generator', 'AI Article Outline Generator', topic, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate outline' }); }
});

// POST /api/tools/paraphraser
router.post('/paraphraser', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Text is required' });
    const prompt = `Act as an expert Editor. Paraphrase and rewrite the following text to make it completely unique while retaining the original meaning. Make it flow beautifully.\n\nText:\n${text}`;
    const result = await generateToolText({ prompt, contentType: 'Paraphrased Text', tone: 'Professional', language: 'English', creativity: 6 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-paraphraser', 'AI Paraphrasing Tool', text, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to paraphrase' }); }
});

// POST /api/tools/product-desc
router.post('/product-desc', async (req: Request, res: Response) => {
  try {
    const { productName, features } = req.body;
    if (!productName || !features) return res.status(400).json({ success: false, message: 'Product name and features are required' });
    const prompt = `Act as an expert Copywriter. Write a compelling, conversion-focused product description for "${productName}". Key features include: ${features}. Use persuasive language and format in markdown with bullet points for features.`;
    const result = await generateToolText({ prompt, contentType: 'Product Description', tone: 'Persuasive', language: 'English', creativity: 8 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-product-description', 'AI Product Description Generator', productName, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate product description' }); }
});

// POST /api/tools/cover-letter
router.post('/cover-letter', async (req: Request, res: Response) => {
  try {
    const { jobTitle, skills } = req.body;
    if (!jobTitle || !skills) return res.status(400).json({ success: false, message: 'Job title and skills are required' });
    const prompt = `Act as an expert Career Coach. Write a professional, standout cover letter for the position of "${jobTitle}". The applicant's key skills/experience include: ${skills}. Keep it concise, confident, and format it properly.`;
    const result = await generateToolText({ prompt, contentType: 'Cover Letter', tone: 'Professional', language: 'English', creativity: 5 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-cover-letter', 'AI Cover Letter Generator', jobTitle, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate cover letter' }); }
});

// POST /api/tools/seo-meta
router.post('/seo-meta', async (req: Request, res: Response) => {
  try {
    const { pageContent } = req.body;
    if (!pageContent) return res.status(400).json({ success: false, message: 'Page content/topic is required' });
    const prompt = `Act as an SEO Expert. Based on this page content/topic: "${pageContent}", generate 3 options for an SEO-optimized Page Title (max 60 chars) and Meta Description (max 160 chars). Format in markdown.`;
    const result = await generateToolText({ prompt, contentType: 'SEO Meta Tags', tone: 'Professional', language: 'English', creativity: 6 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-seo-meta-generator', 'AI SEO Title & Meta Generator', pageContent, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate SEO meta tags' }); }
});

// POST /api/tools/youtube-title
router.post('/youtube-title', async (req: Request, res: Response) => {
  try {
    const { videoTopic } = req.body;
    if (!videoTopic) return res.status(400).json({ success: false, message: 'Video topic is required' });
    const prompt = `Act as a YouTube Growth Hacker. Generate 10 highly clickable, viral, and engaging YouTube video titles for the topic: "${videoTopic}". Format as a markdown numbered list.`;
    const result = await generateToolText({ prompt, contentType: 'YouTube Titles', tone: 'Engaging', language: 'English', creativity: 9 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-youtube-title', 'AI YouTube Title Generator', videoTopic, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate titles' }); }
});

// POST /api/tools/tweet-thread
router.post('/tweet-thread', async (req: Request, res: Response) => {
  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ success: false, message: 'Topic is required' });
    const prompt = `Act as an expert Twitter Ghostwriter. Write a highly engaging, viral Twitter thread about "${topic}". The first tweet should be a strong hook. Include emojis and format each tweet clearly (e.g., 1/5, 2/5).`;
    const result = await generateToolText({ prompt, contentType: 'Twitter Thread', tone: 'Engaging', language: 'English', creativity: 8 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-tweet-thread', 'AI Tweet Thread Generator', topic, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate thread' }); }
});

// POST /api/tools/hook-generator
router.post('/hook-generator', async (req: Request, res: Response) => {
  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ success: false, message: 'Topic is required' });
    const prompt = `Act as a TikTok/Reels Scriptwriter. Generate 7 extremely catchy and curiosity-inducing 3-second hooks for a short video about "${topic}". Format as a markdown bulleted list.`;
    const result = await generateToolText({ prompt, contentType: 'Video Hooks', tone: 'Engaging', language: 'English', creativity: 9 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-hook-generator', 'AI Hook Generator', topic, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate hooks' }); }
});

// POST /api/tools/ad-copy
router.post('/ad-copy', async (req: Request, res: Response) => {
  try {
    const { product, platform } = req.body;
    if (!product || !platform) return res.status(400).json({ success: false, message: 'Product and platform are required' });
    const prompt = `Act as a top-tier Media Buyer. Write 3 highly converting ad copy variations for "${product}" designed specifically for ${platform} Ads. Include Primary Text, Headline, and Call to Action. Format in markdown.`;
    const result = await generateToolText({ prompt, contentType: 'Ad Copy', tone: 'Persuasive', language: 'English', creativity: 8 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-ad-copy', 'AI Ad Copy Generator', `${platform}: ${product}`, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate ad copy' }); }
});

// POST /api/tools/linkedin-bio
router.post('/linkedin-bio', async (req: Request, res: Response) => {
  try {
    const { currentRole, achievements } = req.body;
    if (!currentRole || !achievements) return res.status(400).json({ success: false, message: 'Role and achievements are required' });
    const prompt = `Act as a Personal Branding Expert. Write an optimized, professional, and engaging LinkedIn "About" section bio. Current Role: "${currentRole}". Key Achievements/Skills: "${achievements}". Keep it structured with short paragraphs.`;
    const result = await generateToolText({ prompt, contentType: 'LinkedIn Bio', tone: 'Professional', language: 'English', creativity: 6 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-linkedin-bio', 'AI LinkedIn Bio Generator', currentRole, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate bio' }); }
});

// POST /api/tools/regex-generator
router.post('/regex-generator', async (req: Request, res: Response) => {
  try {
    const { description } = req.body;
    if (!description) return res.status(400).json({ success: false, message: 'Description is required' });
    const prompt = `Act as a Senior Developer. Provide a Regular Expression (Regex) that matches the following description: "${description}". Provide ONLY the regex pattern inside a markdown code block, followed by a brief 1-sentence explanation of how it works.`;
    const result = await generateToolText({ prompt, contentType: 'Regex Pattern', tone: 'Technical', language: 'English', creativity: 2 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-regex-generator', 'Regex Generator', description, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate regex' }); }
});

// POST /api/tools/quote
router.post('/quote', async (req: Request, res: Response) => {
  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ success: false, message: 'Topic is required' });
    const prompt = `Act as an inspirational figure. Generate a highly inspiring, completely original motivational quote about "${topic}". The quote should be impactful and memorable. Do not use existing famous quotes.`;
    const result = await generateToolText({ prompt, contentType: 'Motivational Quote', tone: 'Inspiring', language: 'English', creativity: 9 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-quote-generator', 'AI Motivational Quote Generator', topic, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate quote' }); }
});

// POST /api/tools/code-explainer
router.post('/code-explainer', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Code is required' });
    const prompt = `Act as an expert Senior Developer. Explain the following code snippet in plain, easy-to-understand English. Break down what the code does step-by-step.\n\nCode:\n${code}`;
    const result = await generateToolText({ prompt, contentType: 'Code Explanation', tone: 'Educational', language: 'English', creativity: 3 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-code-explainer', 'AI Code Explainer', code.substring(0, 100), result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to explain code' }); }
});

// POST /api/tools/recipe-generator
router.post('/recipe-generator', async (req: Request, res: Response) => {
  try {
    const { ingredients } = req.body;
    if (!ingredients) return res.status(400).json({ success: false, message: 'Ingredients are required' });
    const prompt = `Act as a Master Chef. Create a delicious recipe using mostly or only these ingredients: "${ingredients}". Provide a creative name for the dish, prep time, cooking time, step-by-step instructions, and tips. Format nicely in markdown.`;
    const result = await generateToolText({ prompt, contentType: 'Recipe', tone: 'Friendly', language: 'English', creativity: 9 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-recipe-generator', 'AI Recipe Generator', ingredients, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate recipe' }); }
});

// POST /api/tools/workout-generator
router.post('/workout-generator', async (req: Request, res: Response) => {
  try {
    const { goal, level, duration } = req.body;
    if (!goal || !level) return res.status(400).json({ success: false, message: 'Goal and level are required' });
    const prompt = `Act as an expert Personal Trainer. Create a structured, easy-to-follow workout plan. Goal: "${goal}". Fitness Level: "${level}". Duration per session: ${duration} minutes. Include exercises, sets, and reps. Format nicely in markdown.`;
    const result = await generateToolText({ prompt, contentType: 'Workout Plan', tone: 'Motivating', language: 'English', creativity: 5 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-workout-generator', 'AI Workout Plan Generator', `${goal} (${level})`, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate workout plan' }); }
});

// POST /api/tools/motivational-quote
router.post('/motivational-quote', async (req: Request, res: Response) => {
  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ success: false, message: 'Topic is required' });
    const prompt = `Act as an inspiring philosopher and thought leader. Write 5 completely original, profound, and highly motivational quotes about "${topic}". Format as a markdown list.`;
    const result = await generateToolText({ prompt, contentType: 'Motivational Quotes', tone: 'Inspiring', language: 'English', creativity: 10 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-motivational-quote-generator', 'AI Motivational Quote Generator', topic, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate quotes' }); }
});

// POST /api/tools/gift-idea
router.post('/gift-idea', async (req: Request, res: Response) => {
  try {
    const { recipient, budget, interests } = req.body;
    if (!recipient || !interests) return res.status(400).json({ success: false, message: 'Recipient and interests are required' });
    const prompt = `Act as a master Gift Concierge. Suggest 7 highly thoughtful, unique, and creative gift ideas for a ${recipient} who is interested in: "${interests}". Budget: ${budget}. Format as a markdown bulleted list with a brief reason for each suggestion.`;
    const result = await generateToolText({ prompt, contentType: 'Gift Ideas', tone: 'Friendly', language: 'English', creativity: 9 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-gift-idea-generator', 'AI Gift Idea Generator', `${recipient} (${interests})`, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate gift ideas' }); }
});

// ✅ 20 NEW BATCH TOOLS ROUTES

// POST /api/tools/interview-questions
router.post('/interview-questions', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, message: 'Input is required' });
    const prompt = `Act as an expert Technical Recruiter and Hiring Manager. Generate 10 highly relevant, challenging, and insightful interview questions for the following role: "${input}". Include a mix of technical, behavioral, and situational questions. Format as a markdown list.`;
    const result = await generateToolText({ prompt, contentType: 'AI Interview Questions Generator', tone: 'Professional', language: 'English', creativity: 7 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-interview-questions', 'AI Interview Questions Generator', input, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate content' }); }
});

// POST /api/tools/sql-generator
router.post('/sql-generator', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, message: 'Input is required' });
    const prompt = `Act as a Senior Database Administrator. Generate a highly optimized SQL query based on this request: "${input}". Provide ONLY the SQL code in a markdown block, followed by a brief 1-sentence explanation.`;
    const result = await generateToolText({ prompt, contentType: 'AI SQL Query Generator', tone: 'Professional', language: 'English', creativity: 7 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-sql-generator', 'AI SQL Query Generator', input, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate content' }); }
});

// POST /api/tools/slogan-generator
router.post('/slogan-generator', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, message: 'Input is required' });
    const prompt = `Act as an expert Copywriter. Generate 10 catchy, creative, and memorable slogans for the following brand/product: "${input}". Keep them punchy and impactful. Format as a markdown bulleted list.`;
    const result = await generateToolText({ prompt, contentType: 'AI Slogan Generator', tone: 'Professional', language: 'English', creativity: 7 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-slogan-generator', 'AI Slogan Generator', input, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate content' }); }
});

// POST /api/tools/elevator-pitch
router.post('/elevator-pitch', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, message: 'Input is required' });
    const prompt = `Act as an expert Career Coach and Sales Strategist. Write 3 compelling, persuasive, and concise elevator pitches (under 60 seconds spoken) based on this information: "${input}". Format in markdown with bold headings.`;
    const result = await generateToolText({ prompt, contentType: 'AI Elevator Pitch Generator', tone: 'Professional', language: 'English', creativity: 7 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-elevator-pitch', 'AI Elevator Pitch Generator', input, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate content' }); }
});

// POST /api/tools/video-script
router.post('/video-script', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, message: 'Input is required' });
    const prompt = `Act as a Viral Content Creator and Scriptwriter. Write a highly engaging, fast-paced video script about "${input}". Include visual cues (e.g., [Camera zooms in]) and a strong hook in the first 3 seconds. Format in markdown.`;
    const result = await generateToolText({ prompt, contentType: 'AI Video Script Generator', tone: 'Professional', language: 'English', creativity: 7 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-video-script', 'AI Video Script Generator', input, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate content' }); }
});

// POST /api/tools/job-description
router.post('/job-description', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, message: 'Input is required' });
    const prompt = `Act as an expert HR Manager. Write a comprehensive, professional, and attractive job description for: "${input}". Include sections for About the Role, Key Responsibilities, Requirements, and Benefits. Format beautifully in markdown.`;
    const result = await generateToolText({ prompt, contentType: 'AI Job Description Generator', tone: 'Professional', language: 'English', creativity: 7 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-job-description', 'AI Job Description Generator', input, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate content' }); }
});

// POST /api/tools/hashtag-generator
router.post('/hashtag-generator', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, message: 'Input is required' });
    const prompt = `Act as a Social Media Marketing Expert. Generate 30 highly relevant, trending, and optimized hashtags for a post about: "${input}". Group them into Broad, Niche, and Location/Specific categories. Format in markdown.`;
    const result = await generateToolText({ prompt, contentType: 'AI Instagram Hashtag Generator', tone: 'Professional', language: 'English', creativity: 7 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-hashtag-generator', 'AI Instagram Hashtag Generator', input, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate content' }); }
});

// POST /api/tools/story-generator
router.post('/story-generator', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, message: 'Input is required' });
    const prompt = `Act as a Bestselling Novelist. Write a captivating, creative, and well-structured short story based on this prompt: "${input}". Focus on showing, not telling, and include strong character dialogue. Format in markdown.`;
    const result = await generateToolText({ prompt, contentType: 'AI Story Generator', tone: 'Professional', language: 'English', creativity: 7 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-story-generator', 'AI Story Generator', input, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate content' }); }
});

// POST /api/tools/travel-planner
router.post('/travel-planner', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, message: 'Input is required' });
    const prompt = `Act as an expert Travel Agent. Create a detailed, day-by-day travel itinerary for "${input}". Include morning, afternoon, and evening activities, plus local food recommendations. Format nicely in markdown.`;
    const result = await generateToolText({ prompt, contentType: 'AI Travel Itinerary Planner', tone: 'Professional', language: 'English', creativity: 7 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-travel-planner', 'AI Travel Itinerary Planner', input, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate content' }); }
});

// POST /api/tools/meal-planner
router.post('/meal-planner', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, message: 'Input is required' });
    const prompt = `Act as a certified Nutritionist. Create a 7-day meal plan based on these requirements: "${input}". Include Breakfast, Lunch, Dinner, and Snacks for each day. Format as a clean markdown table or structured list.`;
    const result = await generateToolText({ prompt, contentType: 'AI Meal Planner', tone: 'Professional', language: 'English', creativity: 7 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-meal-planner', 'AI Meal Planner', input, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate content' }); }
});

// POST /api/tools/poem-generator
router.post('/poem-generator', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, message: 'Input is required' });
    const prompt = `Act as a Master Poet. Write a beautiful, evocative, and creative poem based on this topic and style: "${input}". Use strong imagery and emotional resonance. Format in markdown.`;
    const result = await generateToolText({ prompt, contentType: 'AI Poem Generator', tone: 'Professional', language: 'English', creativity: 7 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-poem-generator', 'AI Poem Generator', input, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate content' }); }
});

// POST /api/tools/review-responder
router.post('/review-responder', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, message: 'Input is required' });
    const prompt = `Act as a Professional Customer Success Manager. Write a polite, empathetic, and professional response to the following customer review: "${input}". If it is a negative review, de-escalate and offer a solution. Format in markdown.`;
    const result = await generateToolText({ prompt, contentType: 'AI Review Responder', tone: 'Professional', language: 'English', creativity: 7 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-review-responder', 'AI Review Responder', input, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate content' }); }
});

// POST /api/tools/event-planner
router.post('/event-planner', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, message: 'Input is required' });
    const prompt = `Act as an expert Event Coordinator. Create a comprehensive event plan and checklist for: "${input}". Include a timeline (months/weeks before), budget tips, and day-of schedule. Format cleanly in markdown.`;
    const result = await generateToolText({ prompt, contentType: 'AI Event Planner', tone: 'Professional', language: 'English', creativity: 7 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-event-planner', 'AI Event Planner', input, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate content' }); }
});

// POST /api/tools/youtube-tags
router.post('/youtube-tags', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, message: 'Input is required' });
    const prompt = `Act as a YouTube SEO Expert. Generate a comma-separated list of 30 highly optimized, high-volume search tags/keywords for a video about: "${input}". Put them in a code block so they are easy to copy.`;
    const result = await generateToolText({ prompt, contentType: 'AI YouTube Tags Generator', tone: 'Professional', language: 'English', creativity: 7 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-youtube-tags', 'AI YouTube Tags Generator', input, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate content' }); }
});

// POST /api/tools/apology-letter
router.post('/apology-letter', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, message: 'Input is required' });
    const prompt = `Act as an expert Communicator. Write a sincere, professional, and well-structured apology letter based on this situation: "${input}". Do not make overly defensive excuses. Format in markdown.`;
    const result = await generateToolText({ prompt, contentType: 'AI Apology Letter Generator', tone: 'Professional', language: 'English', creativity: 7 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-apology-letter', 'AI Apology Letter Generator', input, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate content' }); }
});

// POST /api/tools/dream-interpreter
router.post('/dream-interpreter', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, message: 'Input is required' });
    const prompt = `Act as an expert Psychologist and Dream Analyst (like Carl Jung). Provide a fascinating, symbolic, and psychological interpretation of this dream: "${input}". Format in markdown with bold headings.`;
    const result = await generateToolText({ prompt, contentType: 'AI Dream Interpreter', tone: 'Professional', language: 'English', creativity: 7 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-dream-interpreter', 'AI Dream Interpreter', input, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate content' }); }
});

// POST /api/tools/git-command
router.post('/git-command', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, message: 'Input is required' });
    const prompt = `Act as a Senior DevOps Engineer. Provide the exact Git terminal command(s) needed to accomplish this: "${input}". Put the commands in a bash markdown block, followed by a very brief explanation.`;
    const result = await generateToolText({ prompt, contentType: 'AI Git Command Generator', tone: 'Professional', language: 'English', creativity: 7 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-git-command', 'AI Git Command Generator', input, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate content' }); }
});

// POST /api/tools/real-estate-listing
router.post('/real-estate-listing', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, message: 'Input is required' });
    const prompt = `Act as a top-tier Real Estate Copywriter. Write an engaging, highly attractive property listing description based on these details: "${input}". Highlight the best features. Format in markdown.`;
    const result = await generateToolText({ prompt, contentType: 'AI Real Estate Listing Generator', tone: 'Professional', language: 'English', creativity: 7 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-real-estate-listing', 'AI Real Estate Listing Generator', input, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate content' }); }
});

// POST /api/tools/resignation-letter
router.post('/resignation-letter', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, message: 'Input is required' });
    const prompt = `Act as an expert HR Professional. Write a polite, professional, and standard resignation letter based on these details: "${input}". Ensure it leaves a positive final impression. Format in markdown.`;
    const result = await generateToolText({ prompt, contentType: 'AI Resignation Letter Generator', tone: 'Professional', language: 'English', creativity: 7 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-resignation-letter', 'AI Resignation Letter Generator', input, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate content' }); }
});

// POST /api/tools/emoji-translator
router.post('/emoji-translator', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, message: 'Input is required' });
    const prompt = `Act as an expert in internet culture and emojis. Translate the following text purely into a creative, expressive sequence of emojis that tells the story visually: "${input}". Provide ONLY the emojis, no text.`;
    const result = await generateToolText({ prompt, contentType: 'AI Emoji Translator', tone: 'Professional', language: 'English', creativity: 7 });
    const usageId = await saveFreeToolUsage(req, '/tools/ai-emoji-translator', 'AI Emoji Translator', input, result);
    res.json({ success: true, text: result, usageId });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to generate content' }); }
});



// POST /api/tools/ai-business-plan
router.post('/ai-business-plan', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, message: 'Input is required' });

    let user = null;
    let creditsNeeded = 5;
    
    // Optional Auth Check
    const token = req.cookies?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        user = await User.findById(decoded.id);
      } catch (err) {}
    }

    // If logged in, check and deduct credits for EVERYONE (Free and Pro)
    if (user) {
      if (user.credits < creditsNeeded) {
        return res.status(403).json({ 
          success: false, 
          message: 'Not enough credits. Please upgrade or buy more.',
          errorType: 'INSUFFICIENT_CREDITS'
        });
      }
      user.credits -= creditsNeeded;
      await user.save();
    }
    // If not logged in, we let it pass because frontend allows 1 free trial for guests. 
    // We could add server-side IP rate-limiting, but this matches ai-writer logic for now.

    const prompt = `Act as an expert Business Strategist. Generate a comprehensive 10-page business plan based on the following details. Include Executive Summary, Market Analysis, Competitive Advantage, and Financial Projections. Format professionally in Markdown with proper headings.

Details:
${input}`;
    const result = await generateToolText({ prompt, contentType: 'Business Plan', tone: 'Professional', language: 'English', creativity: 7 });

    const usageId = await saveFreeToolUsage(req, '/tools/ai-business-plan', 'Business Plan Generator', input, result);
    
    res.json({ success: true, text: result, usageId, creditsRemaining: user ? user.credits : undefined });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to generate content' });
  }
});

// POST /api/tools/ai-sales-funnel
router.post('/ai-sales-funnel', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, message: 'Input is required' });

    let user = null;
    let creditsNeeded = 5;
    
    // Optional Auth Check
    const token = req.cookies?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        user = await User.findById(decoded.id);
      } catch (err) {}
    }

    // If logged in, check and deduct credits for EVERYONE (Free and Pro)
    if (user) {
      if (user.credits < creditsNeeded) {
        return res.status(403).json({ 
          success: false, 
          message: 'Not enough credits. Please upgrade or buy more.',
          errorType: 'INSUFFICIENT_CREDITS'
        });
      }
      user.credits -= creditsNeeded;
      await user.save();
    }
    // If not logged in, we let it pass because frontend allows 1 free trial for guests. 
    // We could add server-side IP rate-limiting, but this matches ai-writer logic for now.

    const prompt = `Act as an expert Copywriter. Write complete sales funnel copy for the following product/service. Include: 1) Facebook Ad Copy, 2) Landing Page Headline & Body, 3) 3-part Email Sequence. Format nicely in Markdown.

Product Details:
${input}`;
    const result = await generateToolText({ prompt, contentType: 'Sales Funnel Copy', tone: 'Professional', language: 'English', creativity: 7 });

    const usageId = await saveFreeToolUsage(req, '/tools/ai-sales-funnel', 'Sales Funnel Copy Generator', input, result);
    
    res.json({ success: true, text: result, usageId, creditsRemaining: user ? user.credits : undefined });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to generate content' });
  }
});

// POST /api/tools/ai-ebook-writer
router.post('/ai-ebook-writer', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, message: 'Input is required' });

    let user = null;
    let creditsNeeded = 5;
    
    // Optional Auth Check
    const token = req.cookies?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        user = await User.findById(decoded.id);
      } catch (err) {}
    }

    // If logged in, check and deduct credits for EVERYONE (Free and Pro)
    if (user) {
      if (user.credits < creditsNeeded) {
        return res.status(403).json({ 
          success: false, 
          message: 'Not enough credits. Please upgrade or buy more.',
          errorType: 'INSUFFICIENT_CREDITS'
        });
      }
      user.credits -= creditsNeeded;
      await user.save();
    }
    // If not logged in, we let it pass because frontend allows 1 free trial for guests. 
    // We could add server-side IP rate-limiting, but this matches ai-writer logic for now.

    const prompt = `Act as an expert Author. Write a detailed outline and the first full chapter for an e-book about the following topic. Make the content engaging and informative. Format in Markdown.

Topic:
${input}`;
    const result = await generateToolText({ prompt, contentType: 'E-Book', tone: 'Professional', language: 'English', creativity: 7 });

    const usageId = await saveFreeToolUsage(req, '/tools/ai-ebook-writer', 'E-Book Generator', input, result);
    
    res.json({ success: true, text: result, usageId, creditsRemaining: user ? user.credits : undefined });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to generate content' });
  }
});

// POST /api/tools/ai-course-creator
router.post('/ai-course-creator', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, message: 'Input is required' });

    let user = null;
    let creditsNeeded = 5;
    
    // Optional Auth Check
    const token = req.cookies?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        user = await User.findById(decoded.id);
      } catch (err) {}
    }

    // If logged in, check and deduct credits for EVERYONE (Free and Pro)
    if (user) {
      if (user.credits < creditsNeeded) {
        return res.status(403).json({ 
          success: false, 
          message: 'Not enough credits. Please upgrade or buy more.',
          errorType: 'INSUFFICIENT_CREDITS'
        });
      }
      user.credits -= creditsNeeded;
      await user.save();
    }
    // If not logged in, we let it pass because frontend allows 1 free trial for guests. 
    // We could add server-side IP rate-limiting, but this matches ai-writer logic for now.

    const prompt = `Act as an expert Instructional Designer. Create a comprehensive 4-week course curriculum for the following subject. Include weekly modules, lesson titles, and 2 quiz questions per week. Format in Markdown.

Subject:
${input}`;
    const result = await generateToolText({ prompt, contentType: 'Course Curriculum', tone: 'Professional', language: 'English', creativity: 7 });

    const usageId = await saveFreeToolUsage(req, '/tools/ai-course-creator', 'Course Curriculum Generator', input, result);
    
    res.json({ success: true, text: result, usageId, creditsRemaining: user ? user.credits : undefined });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to generate content' });
  }
});

// POST /api/tools/ai-seo-topical-map
router.post('/ai-seo-topical-map', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, message: 'Input is required' });

    let user = null;
    let creditsNeeded = 5;
    
    // Optional Auth Check
    const token = req.cookies?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        user = await User.findById(decoded.id);
      } catch (err) {}
    }

    // If logged in, check and deduct credits for EVERYONE (Free and Pro)
    if (user) {
      if (user.credits < creditsNeeded) {
        return res.status(403).json({ 
          success: false, 
          message: 'Not enough credits. Please upgrade or buy more.',
          errorType: 'INSUFFICIENT_CREDITS'
        });
      }
      user.credits -= creditsNeeded;
      await user.save();
    }
    // If not logged in, we let it pass because frontend allows 1 free trial for guests. 
    // We could add server-side IP rate-limiting, but this matches ai-writer logic for now.

    const prompt = `Act as an SEO Expert. Generate a comprehensive Topical Map (Content Cluster) for the following niche. Group the topics into 5 main pillars and provide 5 article titles for each pillar. Format as a nested list in Markdown.

Niche:
${input}`;
    const result = await generateToolText({ prompt, contentType: 'SEO Topical Map', tone: 'Professional', language: 'English', creativity: 7 });

    const usageId = await saveFreeToolUsage(req, '/tools/ai-seo-topical-map', 'SEO Topical Map Generator', input, result);
    
    res.json({ success: true, text: result, usageId, creditsRemaining: user ? user.credits : undefined });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to generate content' });
  }
});

// POST /api/tools/ai-pitch-deck
router.post('/ai-pitch-deck', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, message: 'Input is required' });

    let user = null;
    let creditsNeeded = 5;
    
    // Optional Auth Check
    const token = req.cookies?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        user = await User.findById(decoded.id);
      } catch (err) {}
    }

    // If logged in, check and deduct credits for EVERYONE (Free and Pro)
    if (user) {
      if (user.credits < creditsNeeded) {
        return res.status(403).json({ 
          success: false, 
          message: 'Not enough credits. Please upgrade or buy more.',
          errorType: 'INSUFFICIENT_CREDITS'
        });
      }
      user.credits -= creditsNeeded;
      await user.save();
    }
    // If not logged in, we let it pass because frontend allows 1 free trial for guests. 
    // We could add server-side IP rate-limiting, but this matches ai-writer logic for now.

    const prompt = `Act as an expert Startup Advisor. Generate the content and script for a 10-slide startup pitch deck based on the following idea. Include Problem, Solution, Market Size, Business Model, and Ask. Format in Markdown.

Startup Idea:
${input}`;
    const result = await generateToolText({ prompt, contentType: 'Pitch Deck', tone: 'Professional', language: 'English', creativity: 7 });

    const usageId = await saveFreeToolUsage(req, '/tools/ai-pitch-deck', 'Pitch Deck Generator', input, result);
    
    res.json({ success: true, text: result, usageId, creditsRemaining: user ? user.credits : undefined });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to generate content' });
  }
});

// POST /api/tools/ai-app-architecture
router.post('/ai-app-architecture', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, message: 'Input is required' });

    let user = null;
    let creditsNeeded = 5;
    
    // Optional Auth Check
    const token = req.cookies?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        user = await User.findById(decoded.id);
      } catch (err) {}
    }

    // If logged in, check and deduct credits for EVERYONE (Free and Pro)
    if (user) {
      if (user.credits < creditsNeeded) {
        return res.status(403).json({ 
          success: false, 
          message: 'Not enough credits. Please upgrade or buy more.',
          errorType: 'INSUFFICIENT_CREDITS'
        });
      }
      user.credits -= creditsNeeded;
      await user.save();
    }
    // If not logged in, we let it pass because frontend allows 1 free trial for guests. 
    // We could add server-side IP rate-limiting, but this matches ai-writer logic for now.

    const prompt = `Act as a Senior Software Architect. Design the system architecture for the following application idea. Include the recommended Tech Stack, High-Level Database Schema, and Core API Endpoints. Format clearly in Markdown.

App Idea:
${input}`;
    const result = await generateToolText({ prompt, contentType: 'App Architecture', tone: 'Professional', language: 'English', creativity: 7 });

    const usageId = await saveFreeToolUsage(req, '/tools/ai-app-architecture', 'App Architecture Generator', input, result);
    
    res.json({ success: true, text: result, usageId, creditsRemaining: user ? user.credits : undefined });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to generate content' });
  }
});

// POST /api/tools/ai-grant-proposal
router.post('/ai-grant-proposal', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, message: 'Input is required' });

    let user = null;
    let creditsNeeded = 5;
    
    // Optional Auth Check
    const token = req.cookies?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        user = await User.findById(decoded.id);
      } catch (err) {}
    }

    // If logged in, check and deduct credits for EVERYONE (Free and Pro)
    if (user) {
      if (user.credits < creditsNeeded) {
        return res.status(403).json({ 
          success: false, 
          message: 'Not enough credits. Please upgrade or buy more.',
          errorType: 'INSUFFICIENT_CREDITS'
        });
      }
      user.credits -= creditsNeeded;
      await user.save();
    }
    // If not logged in, we let it pass because frontend allows 1 free trial for guests. 
    // We could add server-side IP rate-limiting, but this matches ai-writer logic for now.

    const prompt = `Act as an expert Grant Writer. Write a professional and persuasive grant proposal based on the following project details. Include Need Statement, Objectives, Methodology, and Evaluation. Format in Markdown.

Project Details:
${input}`;
    const result = await generateToolText({ prompt, contentType: 'Grant Proposal', tone: 'Professional', language: 'English', creativity: 7 });

    const usageId = await saveFreeToolUsage(req, '/tools/ai-grant-proposal', 'Grant Proposal Generator', input, result);
    
    res.json({ success: true, text: result, usageId, creditsRemaining: user ? user.credits : undefined });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to generate content' });
  }
});

// POST /api/tools/ai-legal-template
router.post('/ai-legal-template', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, message: 'Input is required' });

    let user = null;
    let creditsNeeded = 5;
    
    // Optional Auth Check
    const token = req.cookies?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        user = await User.findById(decoded.id);
      } catch (err) {}
    }

    // If logged in, check and deduct credits for EVERYONE (Free and Pro)
    if (user) {
      if (user.credits < creditsNeeded) {
        return res.status(403).json({ 
          success: false, 
          message: 'Not enough credits. Please upgrade or buy more.',
          errorType: 'INSUFFICIENT_CREDITS'
        });
      }
      user.credits -= creditsNeeded;
      await user.save();
    }
    // If not logged in, we let it pass because frontend allows 1 free trial for guests. 
    // We could add server-side IP rate-limiting, but this matches ai-writer logic for now.

    const prompt = `Act as a Paralegal. Generate a standard, boilerplate legal template based on the following requirement (e.g., NDA, Freelance Contract). Disclaimer: This is for educational purposes and not official legal advice. Format in Markdown.

Requirement:
${input}`;
    const result = await generateToolText({ prompt, contentType: 'Legal Template', tone: 'Professional', language: 'English', creativity: 7 });

    const usageId = await saveFreeToolUsage(req, '/tools/ai-legal-template', 'Legal Template Generator', input, result);
    
    res.json({ success: true, text: result, usageId, creditsRemaining: user ? user.credits : undefined });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to generate content' });
  }
});

// POST /api/tools/ai-social-calendar
router.post('/ai-social-calendar', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ success: false, message: 'Input is required' });

    let user = null;
    let creditsNeeded = 5;
    
    // Optional Auth Check
    const token = req.cookies?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        user = await User.findById(decoded.id);
      } catch (err) {}
    }

    // If logged in, check and deduct credits for EVERYONE (Free and Pro)
    if (user) {
      if (user.credits < creditsNeeded) {
        return res.status(403).json({ 
          success: false, 
          message: 'Not enough credits. Please upgrade or buy more.',
          errorType: 'INSUFFICIENT_CREDITS'
        });
      }
      user.credits -= creditsNeeded;
      await user.save();
    }
    // If not logged in, we let it pass because frontend allows 1 free trial for guests. 
    // We could add server-side IP rate-limiting, but this matches ai-writer logic for now.

    const prompt = `Act as a Social Media Manager. Create a 30-day social media content calendar for the following brand/topic. Provide specific post ideas for each day across different platforms (Instagram, LinkedIn, Twitter). Format as a table in Markdown.

Brand/Topic:
${input}`;
    const result = await generateToolText({ prompt, contentType: 'Social Media Calendar', tone: 'Professional', language: 'English', creativity: 7 });

    const usageId = await saveFreeToolUsage(req, '/tools/ai-social-calendar', 'Social Media Calendar Generator', input, result);
    
    res.json({ success: true, text: result, usageId, creditsRemaining: user ? user.credits : undefined });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to generate content' });
  }
});


// POST /api/tools/generate-premium
router.post('/generate-premium', async (req: Request, res: Response) => {
  try {
    const { input, toolSlug, toolName } = req.body;
    if (!input || !toolSlug) return res.status(400).json({ success: false, message: 'Input and toolSlug are required' });

    let user = null;
    let creditsNeeded = 5;
    
    const token = req.cookies?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        user = await User.findById(decoded.id);
      } catch (err) {}
    }

    if (user) {
      if (user.credits < creditsNeeded) {
        return res.status(403).json({ 
          success: false, 
          message: 'Not enough credits. Please upgrade or buy more.',
          errorType: 'INSUFFICIENT_CREDITS'
        });
      }
      user.credits -= creditsNeeded;
      await user.save();
    }

    const systemPrompt = premiumPrompts[toolSlug];
    if (!systemPrompt) {
      return res.status(400).json({ success: false, message: 'Invalid premium tool slug' });
    }

    const prompt = `${systemPrompt}\n\nUser Requirement:\n${input}`;
    
    const result = await generateToolText({ prompt, contentType: toolName || 'Premium Content', tone: 'Professional', language: 'English', creativity: 7 });

    const usageId = await saveFreeToolUsage(req, '/tools/' + toolSlug, toolName || 'Premium Generator', input, result);
    
    res.json({ success: true, text: result, usageId, creditsRemaining: user ? user.credits : undefined });
  } catch (error) {
    console.error('Premium Generation Error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate premium content' });
  }
});

export default router;
