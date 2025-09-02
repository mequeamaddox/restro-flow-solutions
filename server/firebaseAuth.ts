import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { storage } from './storage';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !privateKey || !clientEmail) {
    console.log('Firebase credentials not available, initializing with project ID only');
    initializeApp({
      projectId: projectId || 'restroflowsoftware',
    });
  } else {
    try {
      // Properly format the private key
      const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
      
      initializeApp({
        credential: cert({
          projectId: projectId,
          clientEmail: clientEmail,
          privateKey: formattedPrivateKey,
        }),
        projectId: projectId,
      });
      console.log('Firebase Admin SDK initialized with service account credentials');
    } catch (error) {
      console.error('Failed to initialize Firebase with service account:', error);
      // Fallback to project ID only
      initializeApp({
        projectId: projectId,
      });
    }
  }
}

export const adminAuth = getAuth();

export async function verifyFirebaseToken(idToken: string) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
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
    // Check if user exists in our database
    let user = await storage.getUser(firebaseUser.uid);
    
    if (!user) {
      // Create new user with appropriate role
      const role = firebaseUser.email === 'mequeamaddox@gmail.com' ? 'owner' : 'employee';
      
      user = await storage.upsertUser({
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        firstName: firebaseUser.displayName?.split(' ')[0] || '',
        lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
        profileImageUrl: firebaseUser.photoURL || '',
        role,
      });
    }
    
    return user;
  } catch (error) {
    console.error('Error syncing Firebase user:', error);
    throw error;
  }
}