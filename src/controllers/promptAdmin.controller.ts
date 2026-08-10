import { Request, Response } from 'express';
import { Prompt } from '../models/Prompt';
import { runPromptGeneration } from '../cron/promptScheduler';
import { triggerPostPublishHooks } from '../services/promptPostPublish';

export const getDrafts = async (req: Request, res: Response) => {
  try {
    const drafts = await Prompt.find({ status: 'draft' }).sort({ createdAt: -1 });
    res.json({ success: true, data: drafts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const approvePrompt = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const prompt = await Prompt.findById(id);
    if (!prompt) return res.status(404).json({ success: false, message: 'Not found' });
    if (prompt.status === 'published') return res.status(400).json({ success: false, message: 'Already published' });
    
    // Validate draft
    if (!prompt.prompt || !prompt.title || !prompt.slug) {
      return res.status(400).json({ success: false, message: 'Incomplete prompt' });
    }
    
    // Atomic publish
    prompt.status = 'published';
    prompt.publishedAt = new Date();
    await prompt.save();
    
    // Trigger async hooks
    triggerPostPublishHooks(prompt);
    
    res.json({ success: true, message: 'Published successfully', data: prompt });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const rejectPrompt = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body; // e.g. duplicate, low_quality, unsafe, malformed
    
    if (!reason) return res.status(400).json({ success: false, message: 'Reason required' });
    
    const prompt = await Prompt.findById(id);
    if (!prompt) return res.status(404).json({ success: false, message: 'Not found' });
    
    prompt.status = 'rejected';
    prompt.rejectionReason = reason;
    await prompt.save();
    
    res.json({ success: true, message: 'Rejected successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const triggerGeneration = async (req: Request, res: Response) => {
  try {
    // Non-blocking trigger
    runPromptGeneration().catch(e => console.error('[AdminTrigger] Prompt generation error:', e));
    res.json({ success: true, message: 'Generation started in background' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
