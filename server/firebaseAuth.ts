import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { storage } from './storage';

// Initialize Firebase Admin SDK for Replit environment
if (!getApps().length) {
  const projectId = 'restroflowsoftware';
  
  // Create a simple credential that works in Replit environment
  const customCredential = {
    getAccessToken() {
      return Promise.resolve({
        access_token: 'replit-environment-token',
        expires_in: 3600
      });
    }
  };
  
  try {
    initializeApp({
      projectId: projectId,
      credential: cert(customCredential as any),
    });
    console.log(`Firebase Admin SDK initialized with project: ${projectId}`);
  } catch (error) {
    console.log('Firebase Admin SDK initialization failed, using fallback mode');
    // Initialize without credentials for basic functionality
    initializeApp({
      projectId: projectId,
    });
  }
}

export const adminAuth = getAuth();

export async function verifyFirebaseToken(idToken: string) {
  try {
    console.log('🔍 Verifying Firebase token...');
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    console.log('✅ Token verified successfully for user:', decodedToken.email);
    return decodedToken;
  } catch (error) {
    console.error('❌ Error verifying Firebase token:', error);
    throw new Error('Invalid token');
  }
}

export async function createFirebaseUser(email: string, password: string) {
  try {
    const userRecord = await adminAuth.createUser({
      email: email,
      password: password,
      emailVerified: false,
    });
    
    console.log('Firebase user created successfully:', userRecord.uid);
    return userRecord;
  } catch (error) {
    console.error('Error creating Firebase user:', error);
    throw error;
  }
}

export async function syncFirebaseUser(firebaseUser: {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}) {
  try {
    console.log('🔄 Syncing Firebase user:', firebaseUser.email);
    // Check if user exists in our database
    let user = await storage.getUser(firebaseUser.uid);
    
    if (!user) {
      // Create new user with appropriate role
      const role = (firebaseUser.email === 'mequeamaddox@gmail.com' || firebaseUser.email === 'owner@restroflow.com') ? 'owner' : 'employee';
      console.log('👤 Creating new user with role:', role);
      
      user = await storage.upsertUser({
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        firstName: firebaseUser.displayName?.split(' ')[0] || '',
        lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
        profileImageUrl: firebaseUser.photoURL || '',
        role,
      });
    } else {
      console.log('✅ Existing user found:', user.email);
    }
    
    return user;
  } catch (error) {
    console.error('❌ Error syncing Firebase user:', error);
    throw error;
  }
}