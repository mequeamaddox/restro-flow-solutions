import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

// JWT secret - in production, this should be a proper secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-here';
const JWT_EXPIRES_IN = '15m'; // Access token expires in 15 minutes
const REFRESH_TOKEN_EXPIRES_IN = '30d'; // Refresh token expires in 30 days

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
}

export function generateTokens(user: { id: string; email: string; role: string }) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  // Generate access token (short-lived)
  const accessToken = jwt.sign(
    { ...payload, type: 'access' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  // Generate refresh token (long-lived)  
  const refreshToken = jwt.sign(
    { ...payload, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60, // 15 minutes in seconds
  };
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// Middleware for protecting routes with JWT
export function requireJWT(req: any, res: Response, next: NextFunction) {
  try {
    // Check for token in Authorization header or session
    let token = null;
    
    // Try Authorization header first (mobile apps)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // Fall back to session for web (existing behavior)
    if (!token && req.session?.user) {
      return next(); // Allow session-based auth
    }

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.type !== 'access') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Attach user info to request
    req.jwtUser = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    console.error('JWT middleware error:', error);
    res.status(401).json({ message: 'Authentication failed' });
  }
}

// Get user from either JWT or session
export function getCurrentUser(req: any) {
  if (req.jwtUser) {
    return req.jwtUser;
  }
  if (req.session?.user) {
    return req.session.user;
  }
  if (req.user) {
    return req.user;
  }
  return null;
}