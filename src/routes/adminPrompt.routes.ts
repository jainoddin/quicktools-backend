import express, { Request, Response, NextFunction } from 'express';
import { getDrafts, approvePrompt, rejectPrompt, triggerGeneration } from '../controllers/promptAdmin.controller';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';
import { JWT_SECRET } from '../config/env';

const router = express.Router();

// Middleware to verify admin access
const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.token;
  if (!token) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.id);

    if (!user || user.email !== 'skjainoddin39854@gmail.com') {
      res.status(403).json({ success: false, message: 'Forbidden: Admin access only' });
      return;
    }

    (req as any).user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
    return;
  }
};

// Protect all admin prompt routes
router.use(isAdmin as any);

router.get('/drafts', getDrafts);
router.post('/trigger-generation', triggerGeneration);
router.post('/:id/approve', approvePrompt);
router.post('/:id/reject', rejectPrompt);

export default router;
