import { Router, Request, Response } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/user.model';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only_please_change';
// The frontend URL to redirect to after successful login
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

// Helper function to generate JWT
const generateToken = (user: IUser) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' } // Token expires in 7 days
  );
};

// ==========================================
// 1. Initiate Google OAuth Flow
// ==========================================
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false, // We use JWT, not session cookies
  })
);

// ==========================================
// 2. Google OAuth Callback
// ==========================================
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=auth_failed` }),
  (req: Request, res: Response) => {
    // If authentication is successful, req.user will be populated
    const user = req.user as IUser;

    // Generate JWT
    const token = generateToken(user);

    // Set JWT in an httpOnly secure cookie
    res.cookie('token', token, {
      httpOnly: true, // Prevents client-side JS from reading the cookie
      secure: process.env.NODE_ENV === 'production', // Use secure cookies (HTTPS only) in production
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-site cookies in prod if needed, 'lax' for local dev
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    });

    // Set non-httpOnly cookie for optimistic UI rendering on the frontend
    const userData = JSON.stringify({
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar
    });
    res.cookie('user_data', encodeURIComponent(userData), {
      httpOnly: false, // Must be accessible via JS document.cookie
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Redirect user to the frontend dashboard page
    res.redirect(`${FRONTEND_URL}/dashboard`);
  }
);

// ==========================================
// 3. Get Current Authenticated User (for Frontend state)
// ==========================================
router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ authenticated: false, message: 'No token found' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Optionally fetch fresh user data from DB, or just return decoded token payload
    // To keep it fast, we can just return what we need, but getting DB state ensures user wasn't deleted
    // To keep it fast, we can just return what we need, but getting DB state ensures user wasn't deleted
    const user = await User.findById(decoded.id).select('-googleId');

    if (!user) {
      return res.status(401).json({ authenticated: false, message: 'User not found' });
    }

    res.json({
      authenticated: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        savedTools: user.savedTools || [],
        savedBlogs: user.savedBlogs || [],
        savedArticles: user.savedArticles || [],
        savedNews: user.savedNews || [],
        credits: user.credits || 0,
        plan: user.plan || 'free',
      }
    });

  } catch (error) {
    // Token might be expired or invalid
    res.status(401).json({ authenticated: false, message: 'Invalid token' });
  }
});

// ==========================================
// 4. Logout
// ==========================================
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  res.clearCookie('user_data', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  res.json({ message: 'Logged out successfully' });
});

// ==========================================
// 5. Update Profile (name, bio)
// ==========================================
router.put('/profile', async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, bio } = req.body;
    if (name) user.name = name;
    if (bio !== undefined) (user as any).bio = bio;
    await user.save();

    res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ==========================================
// 6. Toggle Star for a Tool
// ==========================================
router.put('/tools/:slug/star', async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const { slug } = req.params;
    if (!slug) return res.status(400).json({ success: false, message: 'Tool slug is required' });

    const savedTools = user.savedTools || [];
    const index = savedTools.indexOf(slug);

    if (index > -1) {
      // Remove from saved tools
      savedTools.splice(index, 1);
    } else {
      // Add to saved tools
      savedTools.push(slug);
    }

    user.savedTools = savedTools;
    await user.save();

    res.json({ success: true, savedTools: user.savedTools });
  } catch (error) {
    console.error('Error toggling star:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
