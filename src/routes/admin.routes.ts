import express, { Request, Response, NextFunction } from 'express';
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

    if (!user) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }

    // STRICT ADMIN CHECK - Only allow this specific email
    if (user.email !== 'skjainoddin39854@gmail.com') {
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

// GET /api/admin/users
// Fetch all users and calculate statistics
router.get('/users', isAdmin, async (req: Request, res: Response) => {
  try {
    // 1. Get all users (newest first)
    const users = await User.find({}).sort({ createdAt: -1 });

    // 2. Calculate stats
    const totalUsers = users.length;
    
    // Calculate new users (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const newUsers = users.filter((u: any) => new Date(u.createdAt) > sevenDaysAgo).length;
    
    // Calculate users joined today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const usersToday = users.filter((u: any) => new Date(u.createdAt) >= today).length;

    // Send response
    res.json({
      success: true,
      stats: {
        totalUsers,
        newUsers, // last 7 days
        usersToday
      },
      users: users.map((u: any) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        plan: u.plan,
        credits: u.credits,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      }))
    });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
