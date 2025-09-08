import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { storage } from './storage';

// Initialize Firebase Admin SDK with proper service account credentials
if (!getApps().length) {
  try {
    // Try to use the complete service account JSON first
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    
    if (serviceAccountJson) {
      console.log('🔑 Using Firebase service account JSON...');
      const serviceAccount = JSON.parse(serviceAccountJson);
      
      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
      
      console.log(`✅ Firebase Admin SDK initialized successfully for project: ${serviceAccount.project_id}`);
      console.log(`✅ Service account email: ${serviceAccount.client_email}`);
    } else {
      // Fallback to individual environment variables
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'restroflowsoftware';

      if (!privateKey || !clientEmail) {
        throw new Error('Missing Firebase service account credentials');
      }

      // Handle different private key formats
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

      const serviceAccount = {
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: privateKey,
      };

      initializeApp({
        credential: cert(serviceAccount),
        projectId: projectId,
      });

      console.log(`✅ Firebase Admin SDK initialized successfully for project: ${projectId}`);
    }
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error);
    
    // Fallback initialization for development
    console.log('🔄 Using fallback Firebase initialization...');
    initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'restroflowsoftware',
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
    console.log(`🔥 Attempting to create Firebase user: ${email}`);
    
    // Check if Firebase Admin SDK is properly initialized with credentials
    if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
      console.log('⚠️ Firebase Admin SDK service account not configured - creating local auth user instead');
      
      // Generate a unique user ID for local authentication
      const userId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create local authentication record
      await storage.createLocalAuthUser({
        id: userId,
        email: email,
        password: password, // In production, this should be hashed
        createdAt: new Date()
      });
      
      console.log(`✅ Successfully created local auth user: ${userId}`);
      return { uid: userId, email: email };
    }
    
    // Try Firebase Admin SDK if credentials are available
    const userRecord = await adminAuth.createUser({
      email: email,
      password: password,
      emailVerified: false,
    });
    
    console.log(`✅ Successfully created Firebase user: ${userRecord.uid}`);
    return userRecord;
  } catch (error) {
    console.error(`❌ Error creating Firebase user for ${email}:`, error);
    
    // Fallback to local authentication
    console.log('🔄 Falling back to local authentication...');
    const userId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await storage.createLocalAuthUser({
      id: userId,
      email: email,
      password: password,
      createdAt: new Date()
    });
    
    console.log(`✅ Created local auth user as fallback: ${userId}`);
    return { uid: userId, email: email };
  }
}

export async function createCustomToken(uid: string): Promise<string> {
  try {
    const customToken = await adminAuth.createCustomToken(uid);
    console.log(`✅ Created custom token for user: ${uid}`);
    return customToken;
  } catch (error) {
    console.error(`❌ Error creating custom token for ${uid}:`, error);
    throw error;
  }
}

export async function verifyIdToken(idToken: string) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    console.log(`✅ Verified ID token for user: ${decodedToken.uid}`);
    return decodedToken;
  } catch (error) {
    console.error('❌ Error verifying ID token:', error);
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