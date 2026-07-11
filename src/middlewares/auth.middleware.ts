import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only_please_change';

// Extend Express Request to include a user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const verifyAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Get token from cookies
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided in cookies.' });
    }

    // 2. Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // 3. Attach user info to request
    req.user = decoded;

    // 4. Continue to next middleware or route handler
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};
