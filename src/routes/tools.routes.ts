import { Router, Request, Response } from 'express';
import { generateToolText } from '../services/gemini.service';

const router = Router();

// POST /api/tools/generate-text
router.post('/generate-text', async (req: Request, res: Response) => {
  try {
    const { prompt, contentType, tone, language, creativity } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt is required' });
    }

    const text = await generateToolText({
      prompt,
      contentType: contentType || 'Blog Post',
      tone: tone || 'Friendly',
      language: language || 'English',
      creativity: creativity || 6,
    });

    res.json({
      success: true,
      data: text,
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

export default router;
