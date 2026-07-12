import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';
import { ToolUsage } from '../models/toolUsage.model';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only_please_change';

// Helper middleware to authenticate
const authenticate = async (req: Request, res: Response, next: any) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    (req as any).user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// GET /api/user/usage
router.get('/usage', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Get history
    const history = await ToolUsage.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(50); // Get latest 50

    // Determine timeframe boundaries
    const timeframe = req.query.timeframe as string || 'month';
    const startDate = new Date();
    const endDate = new Date();
    
    if (timeframe === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === 'yesterday') {
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
    } else if (timeframe === 'week') {
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else { // month
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    }

    const usageAgg = await ToolUsage.aggregate([
      { 
        $match: { 
          userId: user._id,
          createdAt: { $gte: startDate, $lt: endDate }
        } 
      },
      {
        $group: {
          _id: null,
          totalCreditsUsed: { $sum: '$creditsUsed' }
        }
      }
    ]);

    const creditsUsedThisPeriod = usageAgg.length > 0 ? usageAgg[0].totalCreditsUsed : 0;
    
    // We can define total credits per plan
    const maxCredits = user.plan === 'business' ? 100000 : user.plan === 'pro' ? 10000 : 50;

    res.json({
      success: true,
      data: {
        credits: user.credits,
        creditsUsedThisPeriod, // This will be used in UI based on selected timeframe
        maxCredits,
        plan: user.plan,
        history
      }
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/user/favorites
router.get('/favorites', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    res.json({ success: true, data: user.favoriteImages || [] });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/user/favorites
router.post('/favorites', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { image } = req.body;
    
    if (!image || !image.id) {
      return res.status(400).json({ success: false, message: 'Invalid image data' });
    }

    const exists = user.favoriteImages.find((img: any) => img.id === image.id);
    
    if (exists) {
      // Remove from favorites
      user.favoriteImages = user.favoriteImages.filter((img: any) => img.id !== image.id);
    } else {
      // Add to favorites
      user.favoriteImages.push(image);
    }

    await user.save();
    res.json({ success: true, data: user.favoriteImages });
  } catch (error) {
    console.error('Error updating favorites:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/user/usage
router.delete('/usage', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ success: false, message: 'Invalid IDs provided' });
    }

    // Delete from ToolUsage where userId matches and _id is in the list
    await ToolUsage.deleteMany({
      userId: user._id,
      _id: { $in: ids }
    });

    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting usage:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
