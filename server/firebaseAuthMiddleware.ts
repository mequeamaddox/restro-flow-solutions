import { Request, Response, NextFunction, RequestHandler } from 'express';
import { verifyFirebaseToken, syncFirebaseUser, adminAuth } from './firebaseAuth';
import { storage } from './storage';

// Extend Express Request interface to include authentication data
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
      };
      firebaseUser?: {
        uid: string;
        email: string;
        name?: string;
      };
    }
  }
}

// Type for authenticated requests
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  firebaseUser: {
    uid: string;
    email: string;
    name?: string;
  };
}

// Simple in-memory invitation system
interface Invitation {
  id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted';
  createdBy: string;
  createdAt: Date;
}

// In-memory store for invitations
const invitations = new Map<string, Invitation>();

// Helper function to check if user is authenticated
export function getAuthenticatedUser(req: any) {
  if (!req.user) {
    throw new Error('User not authenticated');
  }
  return req.user;
}

// Helper functions for invitation management
export function createInvitation(email: string, role: string, createdBy: string): Invitation {
  const invitation: Invitation = {
    id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email: email.toLowerCase(),
    role,
    status: 'pending',
    createdBy,
    createdAt: new Date()
  };
  invitations.set(invitation.id, invitation);
  return invitation;
}

export function getInvitationByEmail(email: string): Invitation | undefined {
  return Array.from(invitations.values()).find(inv => 
    inv.email === email.toLowerCase() && inv.status === 'pending'
  );
}

export function acceptInvitation(invitationId: string): void {
  const invitation = invitations.get(invitationId);
  if (invitation) {
    invitation.status = 'accepted';
  }
}

export function getAllInvitations(): Invitation[] {
  return Array.from(invitations.values());
}

/**
 * Firebase authentication middleware that supports both Bearer tokens and session cookies
 * Verifies Firebase ID tokens or session cookies and loads user data from database
 */
export async function requireFirebaseAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    let decodedToken;
    
    // Try session cookie first (preferred for browser requests)
    const sessionCookie = req.cookies?.__session;
    if (sessionCookie) {
      try {
        console.log('🍪 Verifying session cookie for protected route');
        decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
        console.log('✅ Session cookie verified for user:', decodedToken.uid);
      } catch (error) {
        console.log('❌ Session cookie verification failed:', error.message);
        // Fall through to try Bearer token
      }
    }

    // If session cookie failed or not present, try Bearer token
    if (!decodedToken) {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          message: 'Unauthorized', 
          error: 'No valid authentication found (Bearer token or session cookie)' 
        });
      }

      const idToken = authHeader.substring(7);
      if (!idToken) {
        return res.status(401).json({ 
          message: 'Unauthorized', 
          error: 'No Firebase ID token provided' 
        });
      }

      // Verify Firebase ID token
      try {
        decodedToken = await verifyFirebaseToken(idToken);
        console.log('✅ Bearer token verified for user:', decodedToken.uid);
      } catch (error) {
        console.error('❌ Firebase token verification failed:', error);
        return res.status(401).json({ 
          message: 'Unauthorized', 
          error: 'Invalid Firebase ID token' 
        });
      }
    }

    // Set Firebase user info on request
    req.firebaseUser = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      name: decodedToken.name
    };

    // Load user data from database by email (not UID)
    let user = await storage.getUserByEmail(decodedToken.email || '');
    
    // If user doesn't exist in our database, check if they're invited
    if (!user) {
      console.log('🔍 User not found in database, checking for employee/invitation:', decodedToken.email);
      
      // Check if this email exists as an employee (invited user)
      const employees = await storage.getEmployees();
      const invitedEmployee = employees.find(emp => 
        emp.email?.toLowerCase() === decodedToken.email?.toLowerCase()
      );
      
      if (!invitedEmployee) {
        console.log('❌ User not invited:', decodedToken.email);
        return res.status(403).json({ 
          message: 'Not invited', 
          error: 'This user has not been invited to access the system' 
        });
      }

      // Sync Firebase user and create user record
      console.log('✅ Creating user record for invited employee:', decodedToken.email);
      user = await syncFirebaseUser({
        uid: decodedToken.uid,
        email: decodedToken.email || null,
        displayName: decodedToken.name || null,
        photoURL: null
      });
    }

    // Check if user is active
    if (!user) {
      return res.status(403).json({ 
        message: 'Access denied', 
        error: 'User account not found or inactive' 
      });
    }

    // Set user data on request for use in route handlers
    req.user = {
      id: user.id,
      email: user.email || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role || 'employee'
    };

    console.log('✅ Firebase authentication successful for:', user.email, 'role:', user.role);
    next();

  } catch (error) {
    console.error('❌ Firebase auth middleware error:', error);
    res.status(500).json({ 
      message: 'Authentication error', 
      error: 'Internal server error during authentication' 
    });
  }
}

/**
 * Optional Firebase authentication middleware that supports both Bearer tokens and session cookies
 * (for public endpoints that can work with or without auth)
 */
export async function optionalFirebaseAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    let decodedToken;
    
    // Try session cookie first
    const sessionCookie = req.cookies?.__session;
    if (sessionCookie) {
      try {
        decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
      } catch (error) {
        // Fall through to try Bearer token
      }
    }

    // If session cookie failed or not present, try Bearer token
    if (!decodedToken) {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // No auth, continue without authentication
        return next();
      }

      const idToken = authHeader.substring(7);
      if (!idToken) {
        return next();
      }

      try {
        decodedToken = await verifyFirebaseToken(idToken);
      } catch (error) {
        // Authentication failed, but continue without auth for optional endpoints
        console.log('ℹ️ Optional Firebase auth failed, continuing without authentication');
        return next();
      }
    }

    // Load user data if we have a valid token
    if (decodedToken) {
      try {
        const user = await storage.getUserByEmail(decodedToken.email || '');
        
        if (user) {
          req.firebaseUser = {
            uid: decodedToken.uid,
            email: decodedToken.email || '',
            name: decodedToken.name
          };
          req.user = {
            id: user.id,
            email: user.email || '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            role: user.role || 'employee'
          };
        }
      } catch (error) {
        console.log('ℹ️ Failed to load user data in optional auth, continuing without user data');
      }
    }

    next();
  } catch (error) {
    console.error('❌ Optional Firebase auth middleware error:', error);
    next(); // Continue even on error for optional auth
  }
}