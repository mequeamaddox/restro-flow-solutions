import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { storage } from './storage';

// Initialize Firebase Admin SDK (simplified - no service account needed for basic auth)
if (!getApps().length) {
  const projectId = 'restroflowsoftware';
  
  initializeApp({
    projectId: projectId,
  });
  
  console.log(`Firebase Admin SDK initialized with project: ${projectId}`);
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
      const role = firebaseUser.email === 'mequeamaddox@gmail.com' ? 'owner' : 'employee';
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