import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';

// We don't need to declare global Express.Request.user because @types/passport already defines it.

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
