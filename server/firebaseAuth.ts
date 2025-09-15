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
      console.log('📊 JSON length:', serviceAccountJson.length, 'characters');
      console.log('🔍 JSON preview (first 100 chars):', serviceAccountJson.substring(0, 100));
      console.log('🔍 JSON preview (last 50 chars):', serviceAccountJson.slice(-50));
      
      // Validate and clean the JSON string before parsing
      let cleanedJson = serviceAccountJson.trim();
      
      // Check if it's a valid JSON string format
      if (!cleanedJson.startsWith('{') || !cleanedJson.endsWith('}')) {
        console.error('❌ JSON validation failed:');
        console.error('   - Starts with "{":', cleanedJson.startsWith('{'));
        console.error('   - Ends with "}":', cleanedJson.endsWith('}'));
        console.error('   - First 20 characters:', cleanedJson.substring(0, 20));
        console.error('   - Last 20 characters:', cleanedJson.slice(-20));
        
        // The JSON is invalid, skip to individual environment variables
        console.log('🔄 Switching to individual environment variables due to invalid JSON format...');
        // Skip parsing and continue to fallback logic
      } else {
        // Try to parse with better error handling
        let serviceAccount;
        try {
          serviceAccount = JSON.parse(cleanedJson);
        } catch (parseError) {
          console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', parseError);
          console.error('❌ JSON starts with:', cleanedJson.substring(0, 50) + '...');
          console.log('🔄 Switching to individual environment variables due to parse error...');
          // Continue to fallback logic instead of throwing
        }
        
        // If we successfully parsed, validate and use it
        if (serviceAccount) {
          // Validate required fields
          if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
            console.error('❌ Missing required fields in service account JSON (project_id, client_email, private_key)');
            console.log('🔄 Switching to individual environment variables due to missing fields...');
          } else {
            try {
              initializeApp({
                credential: cert(serviceAccount),
                projectId: serviceAccount.project_id,
              });
              
              console.log(`✅ Firebase Admin SDK initialized successfully for project: ${serviceAccount.project_id}`);
              console.log(`✅ Service account email: ${serviceAccount.client_email}`);
              
              // Successfully initialized, set flag to skip fallback
              let firebaseInitialized = true;
            } catch (initError) {
              console.error('❌ Firebase Admin SDK initialization failed with service account JSON:', initError);
              console.log('🔄 Switching to individual environment variables due to initialization error...');
            }
          }
        }
      }
    }
    
    // Fallback to individual environment variables (either no JSON provided or invalid JSON)
    // Only attempt fallback if Firebase wasn't already initialized successfully
    if (getApps().length === 0) {
      console.log('🔄 Attempting individual environment variable configuration...');
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'restroflowsoftware';
      
      if (privateKey && clientEmail) {

      console.log('🔑 Using individual Firebase environment variables...');
      
      // Enhanced PEM formatting for Firebase private keys
      console.log('🔧 Fixing private key PEM formatting...');
      console.log('📊 Original key length:', privateKey.length);
      console.log('🔍 Key starts with:', privateKey.substring(0, 30));
      console.log('🔍 Key ends with:', privateKey.slice(-30));
      
      // Handle different private key formats
      if (privateKey.includes('\\n')) {
        console.log('🔄 Converting literal \\n to actual newlines...');
        privateKey = privateKey.replace(/\\n/g, '\n');
      }
      
      // Ensure proper PEM format
      if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
        console.log('🔧 Adding missing PEM header...');
        privateKey = '-----BEGIN PRIVATE KEY-----\n' + privateKey;
      }
      
      if (!privateKey.endsWith('-----END PRIVATE KEY-----')) {
        console.log('🔧 Adding missing PEM footer...');
        if (!privateKey.endsWith('\n')) {
          privateKey += '\n';
        }
        privateKey += '-----END PRIVATE KEY-----';
      }
      
      // Ensure proper line breaks in PEM body
      if (!privateKey.includes('\n') && privateKey.length > 100) {
        console.log('🔧 Adding line breaks to PEM body...');
        const header = '-----BEGIN PRIVATE KEY-----';
        const footer = '-----END PRIVATE KEY-----';
        let body = privateKey.replace(header, '').replace(footer, '').replace(/\s/g, '');
        
        // Split into 64-character lines (standard PEM format)
        const lines = [];
        for (let i = 0; i < body.length; i += 64) {
          lines.push(body.substr(i, 64));
        }
        
        privateKey = header + '\n' + lines.join('\n') + '\n' + footer;
      }
      
      console.log('✅ PEM formatting completed');
      console.log('📊 Final key length:', privateKey.length);
      console.log('🔍 Final key preview:', privateKey.substring(0, 50) + '...');

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
        console.log(`✅ Service account email: ${clientEmail}`);
      } else {
        console.warn('⚠️ Missing individual Firebase environment variables (FIREBASE_PRIVATE_KEY or FIREBASE_CLIENT_EMAIL)');
        throw new Error('Missing Firebase service account credentials');
      }
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
    console.error('❌ Admin SDK initialization status:', !!adminAuth);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    throw new Error('Invalid token');
  }
}

// Diagnostic function to check if user exists in Firebase project
export async function checkUserExistsInProject(email: string): Promise<{exists: boolean, uid?: string, project?: string}> {
  try {
    console.log(`🔍 Checking if user ${email} exists in Firebase project...`);
    
    // Get user by email using Firebase Admin SDK
    const userRecord = await adminAuth.getUserByEmail(email);
    
    console.log(`✅ User ${email} found in project:`, {
      uid: userRecord.uid,
      email: userRecord.email,
      disabled: userRecord.disabled,
      emailVerified: userRecord.emailVerified,
      creationTime: userRecord.metadata.creationTime
    });
    
    return {
      exists: true,
      uid: userRecord.uid,
      project: process.env.VITE_FIREBASE_PROJECT_ID || 'restroflowsoftware'
    };
  } catch (error) {
    console.log(`❌ User ${email} not found in project or error occurred:`, {
      errorCode: error.code,
      errorMessage: error.message,
      project: process.env.VITE_FIREBASE_PROJECT_ID || 'restroflowsoftware'
    });
    
    if (error.code === 'auth/user-not-found') {
      return {
        exists: false,
        project: process.env.VITE_FIREBASE_PROJECT_ID || 'restroflowsoftware'
      };
    }
    
    // If it's an Admin SDK error, return with error details
    return {
      exists: false,
      project: process.env.VITE_FIREBASE_PROJECT_ID || 'restroflowsoftware'
    };
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
      // Create new user with least-privileged role (employee) by default
      const role = 'employee';
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