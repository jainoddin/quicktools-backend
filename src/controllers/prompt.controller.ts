import { Request, Response } from 'express';
import { Prompt } from '../models/Prompt';
import { PromptFavorite } from '../models/PromptFavorite';
import { PromptInteraction } from '../models/PromptInteraction';
import { generateCustomPrompt } from '../services/promptGenerator';
import mongoose from 'mongoose';

export const getPrompts = async (req: Request, res: Response) => {
  try {
    const { category, model, q, sort = 'recent' } = req.query;
    const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit || '20'), 10) || 20));
    const query: any = { status: 'published' };
    
    if (category && category !== 'All') {
      query.category = { $regex: new RegExp(`^${String(category).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
    }

    if (model) {
      query.models = { $regex: new RegExp(`^${model}$`, 'i') };
    }
    if (q && String(q).trim()) {
      const escaped = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
        { tags: { $regex: escaped, $options: 'i' } },
      ];
    }
    
    let sortObj: any = { publishedAt: -1, createdAt: -1, _id: -1 };
    if (sort === 'trending') {
      // Simplified trending: sort by copies/uses/favorites sum
      sortObj = { copies: -1, favorites: -1, createdAt: -1, _id: -1 };
    }
    
    const prompts = await Prompt.find(query)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit);
      
    const total = await Prompt.countDocuments(query);
    
    res.json({ success: true, data: prompts, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getPromptBySlug = async (req: Request, res: Response) => {
  try {
    const prompt = await Prompt.findOne({ slug: req.params.slug, status: 'published' });
    if (!prompt) return res.status(404).json({ success: false, message: 'Prompt not found' });
    
    res.json({ success: true, data: prompt });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const trackAction = async (req: Request, res: Response) => {
  try {
    const { action } = req.body; // 'view', 'copy', 'use'
    const promptId = req.params.id;
    if (!['view', 'copy', 'use'].includes(action)) return res.status(400).json({ success: false, message: 'Invalid action' });
    if (!mongoose.isValidObjectId(promptId)) return res.status(400).json({ success: false, message: 'Invalid prompt ID' });
    const currentPrompt = await Prompt.findOne({ _id: promptId, status: 'published' }).select('views copies uses favorites');
    if (!currentPrompt) return res.status(404).json({ success: false, message: 'Prompt not found' });
    
    const userId = (req as any).user?._id || (req as any).user?.id;
    const deduplicatedAction = action === 'view' || action === 'copy';

    if (userId && deduplicatedAction) {
      try {
        await PromptInteraction.create({ userId, promptId, action });
      } catch (error: any) {
        if (error?.code !== 11000) throw error;
        return res.json({
          success: true,
          deduplicated: true,
          data: { views: currentPrompt.views, copies: currentPrompt.copies, uses: currentPrompt.uses, favorites: currentPrompt.favorites },
        });
      }
    }

    const update: any = {};
    if (action === 'view') update.$inc = { views: 1 };
    if (action === 'copy') update.$inc = { copies: 1 };
    if (action === 'use') update.$inc = { uses: 1 };
    
    const prompt = await Prompt.findOneAndUpdate({ _id: promptId, status: 'published' }, update, { new: true }).select('views copies uses favorites');
    if (!prompt) return res.status(404).json({ success: false, message: 'Prompt not found' });
    res.json({ success: true, data: { views: prompt.views, copies: prompt.copies, uses: prompt.uses, favorites: prompt.favorites } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const toggleFavorite = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id || (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const prompt = await Prompt.findOne({ slug: req.params.slug, status: 'published' }).select('_id');
    if (!prompt) return res.status(404).json({ success: false, message: 'Prompt not found' });
    const promptId = prompt._id;
    
    const existing = await PromptFavorite.findOne({ userId, promptId });
    if (existing) {
      await PromptFavorite.findByIdAndDelete(existing._id);
      const updated = await Prompt.findByIdAndUpdate(promptId, [{ $set: { favorites: { $max: [0, { $subtract: [{ $ifNull: ['$favorites', 0] }, 1] }] } } }], { new: true }).select('favorites');
      res.json({ success: true, message: 'Removed from favorites', data: { isFavorite: false, favorites: Math.max(0, updated?.favorites || 0) } });
    } else {
      await PromptFavorite.create({ userId, promptId });
      const updated = await Prompt.findByIdAndUpdate(promptId, { $inc: { favorites: 1 } }, { new: true }).select('favorites');
      res.json({ success: true, message: 'Added to favorites', data: { isFavorite: true, favorites: updated?.favorites || 0 } });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getMyFavorites = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id || (req as any).user?.id;
    const favorites = await PromptFavorite.find({ userId }).sort({ createdAt: -1 }).populate({ path: 'promptId', match: { status: 'published' } });
    res.json({ success: true, data: favorites.map((item: any) => item.promptId).filter(Boolean) });
  } catch {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const generatePrompt = async (req: Request, res: Response) => {
  try {
    const { goal, model = 'ChatGPT', category = 'Productivity' } = req.body || {};
    if (!goal || String(goal).trim().length < 10) return res.status(400).json({ success: false, message: 'Describe your goal in at least 10 characters' });
    if (String(goal).length > 1000) return res.status(400).json({ success: false, message: 'Goal must be 1,000 characters or fewer' });
    const allowedModels = ['ChatGPT', 'Claude', 'Gemini'];
    const safeModel = allowedModels.includes(model) ? model : 'ChatGPT';
    const result = await generateCustomPrompt(String(goal), safeModel, String(category).slice(0, 50));
    if (!result) return res.status(502).json({ success: false, message: 'Generation failed. Please try again.' });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message || 'Generation failed' });
  }
};

import { PROMPT_COLLECTIONS } from '../config/promptCollections';

export const getStats = async (req: Request, res: Response) => {
  try {
    const [stats] = await Prompt.aggregate([
      { $match: { status: 'published' } },
      { $facet: {
        total: [{ $count: 'count' }],
        categories: [{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { _id: 1 } }],
        models: [{ $unwind: '$models' }, { $group: { _id: '$models', count: { $sum: 1 } } }, { $sort: { _id: 1 } }],
      } },
    ]);
    const publishedPrompts = stats?.total?.[0]?.count || 0;
    const categoryCounts = (stats?.categories || []).map((item: any) => ({ name: item._id, count: item.count }));
    const modelCounts = (stats?.models || []).map((item: any) => ({ name: item._id, count: item.count }));
    const categories = categoryCounts.length;
    const collections = PROMPT_COLLECTIONS.length;

    res.json({
      success: true,
      data: {
        prompts: publishedPrompts,
        publishedPrompts,
        categories,
        models: modelCounts.length,
        modelCounts,
        categoryCounts,
        collections
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
