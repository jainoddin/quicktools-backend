import { Router, Request, Response } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/user.model';
import { FRONTEND_URL, JWT_SECRET } from '../config/env';

const router = Router();

// Helper function to generate JWT
const generateToken = (user: IUser) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' } // Token expires in 7 days
  );
};

const setAuthCookiesAndRedirect = (res: Response, user: IUser) => {
  const token = generateToken(user);

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  const userData = JSON.stringify({
    id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
  });
  res.cookie('user_data', encodeURIComponent(userData), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.redirect(`${FRONTEND_URL}/dashboard`);
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
    setAuthCookiesAndRedirect(res, req.user as IUser);
  }
);

// ==========================================
// 2b. GitHub OAuth
// ==========================================
router.get(
  '/github',
  passport.authenticate('github', {
    scope: ['user:email'],
    session: false,
  })
);

router.get(
  '/github/callback',
  passport.authenticate('github', {
    session: false,
    failureRedirect: `${FRONTEND_URL}/login?error=auth_failed`,
  }),
  (req: Request, res: Response) => {
    setAuthCookiesAndRedirect(res, req.user as IUser);
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

    // Block deactivated accounts until they re-login (which reactivates within 15 days)
    if (user.deactivatedAt) {
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
      return res.status(401).json({
        authenticated: false,
        message: 'Account deactivated. Log in again within 15 days to reactivate.',
        deactivated: true,
      });
    }

    res.json({
      authenticated: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        bio: user.bio || '',
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
    if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const { name, bio, avatar } = req.body;
    if (typeof name === 'string' && name.trim()) {
      user.name = name.trim();
    }
    if (typeof bio === 'string') {
      user.bio = bio.slice(0, 100);
    }
    if (typeof avatar === 'string' && avatar.startsWith('data:image/')) {
      // Cap ~1.5MB base64 payload
      if (avatar.length > 2_000_000) {
        return res.status(400).json({ success: false, message: 'Image too large. Please use a smaller photo.' });
      }
      user.avatar = avatar;
      user.customAvatar = true;
    }
    await user.save();

    // Keep optimistic UI cookie in sync
    const userData = JSON.stringify({
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio || '',
      plan: user.plan || 'free',
    });
    res.cookie('user_data', encodeURIComponent(userData), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio || '',
        plan: user.plan || 'free',
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
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

// ==========================================
// 7. Deactivate Account (15-day grace period)
// ==========================================
router.post('/deactivate-account', async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const { confirmation } = req.body;
    if (confirmation !== 'DEACTIVATE' && confirmation !== 'DELETE') {
      return res.status(400).json({
        success: false,
        message: 'Please type DEACTIVATE to confirm',
      });
    }

    user.deactivatedAt = new Date();
    await user.save();

    // Log the user out
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

    res.json({
      success: true,
      message:
        'Account deactivated. Log in again within 15 days to reactivate. After 15 days your account will be permanently deleted.',
    });
  } catch (error) {
    console.error('Error deactivating account:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
