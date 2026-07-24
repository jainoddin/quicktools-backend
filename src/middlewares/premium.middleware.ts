import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';
import { JWT_SECRET } from '../config/env';

export interface PremiumRequest extends Request {
  user?: any;
  usingTrial?: boolean;
  creditsNeeded?: number;
}

export const requirePremiumCredits = (creditsNeeded: number = 5) => {
  return async (req: PremiumRequest, res: Response, next: NextFunction) => {
    try {
      // 1. Verify Authentication
      const token = req.cookies?.token;
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'You need to be logged in to use premium tools.',
          errorType: 'AUTH_REQUIRED'
        });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET) as any;
      } catch (err) {
        return res.status(401).json({
          success: false,
          message: 'Invalid session. Please log in again.',
          errorType: 'AUTH_REQUIRED'
        });
      }

      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found.',
          errorType: 'AUTH_REQUIRED'
        });
      }

      // 2. Check 3-Day Free Trial
      const threeDaysInMillis = 3 * 24 * 60 * 60 * 1000;
      const isTrialActive = user.createdAt ? (Date.now() - new Date(user.createdAt).getTime()) <= threeDaysInMillis : false;

      if (isTrialActive) {
        const today = new Date().toISOString().split('T')[0];
        const lastGenDate = user.lastGenerationDate ? new Date(user.lastGenerationDate).toISOString().split('T')[0] : '';
        
        if (today !== lastGenDate) {
          user.freeGenerationsCount = 0;
          user.lastGenerationDate = new Date();
        }

        if (user.freeGenerationsCount < 5) {
          user.freeGenerationsCount += 1;
          await user.save();
          
          req.user = user;
          req.usingTrial = true;
          req.creditsNeeded = creditsNeeded;
          return next();
        }
      }

      // 3. Not in trial or exceeded daily free limit -> Deduct real credits
      if (user.credits < creditsNeeded) {
        return res.status(403).json({ 
          success: false, 
          message: 'Not enough credits. Please upgrade or buy more.',
          errorType: 'INSUFFICIENT_CREDITS'
        });
      }
      
      user.credits -= creditsNeeded;
      await user.save();
      
      req.user = user;
      req.usingTrial = false;
      req.creditsNeeded = creditsNeeded;
      next();
    } catch (error) {
      console.error('Premium middleware error:', error);
      res.status(500).json({ success: false, message: 'Internal server error validating credits' });
    }
  };
};
