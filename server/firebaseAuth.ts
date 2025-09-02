import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { storage } from './storage';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  
  // Use the service account credentials directly (exactly as provided in JSON)
  const privateKey = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDMusOJonKa9Kua\nAjLwRi9D1zvtX4BJiF0KjGErNZwpz7EMrAeTK/gLdKfGSW9MwHtx2YwUgfaksCwJ\n2m9kYOtWbKp4GifHEOKKTyooI2I0L9fC8q4sbtwT446ReNqTf3N2M7nI0HbXlMZM\nZWECmcwB13l23WgLIyhmPcGj+FSM+5OmAJwFWiCzihQaE5yJKTklaZ8xAnAS/8J5\nNw7D7oZmXy+Y6UEvn3VZ7lFire+trV7dIMeeFKDfRp8BQydS1JMe9qme/xT6UemX\nrtjOJtcW9GtYlwucAjXwMok2hq+CqUaIWgxa83YzdNKOWbkf20VYMl9A6Ki22Cxk\n7oCfmICTAgMBAAECggEAEmBPLdr1c4AzqPK6lMOP+YRnviI81xzU0R4RmLnKpxwb\n1bnZQjYHoSua5Zrw0RBT5D+1KaASveyMP2QqbHWgmhTN5lLesCkNVIHPlGO8rFeB\nA+AZjyZyPZzGzrrsz6F4gSsaaXKAwE/7zp6o6v1YCPBI2Ej+TkWdGjQ/3dJr8G15\nPXI4LZKDLJdQUW7HDBO/AufaovQ8fAoGUweJNJrxZx3pQwZAgOFWtZUMf0GtlP9d\nNxAw0YvtnKJp03i/QIUeEfwv2CAbNoe6W1Eug/7n4Knep43d/+lPS7umbhcKulAK\nhffwJgJJfOZZGHdt+P7XNLqngB1+ZS4C35eXblbVUQ==\n-----END PRIVATE KEY-----\n";

  const clientEmail = 'firebase-adminsdk-fbsvc@restroflowsoftware.iam.gserviceaccount.com';
  
  try {
    initializeApp({
      credential: cert({
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: privateKey,
      }),
      projectId: projectId,
    });
    console.log('Firebase Admin SDK initialized with service account credentials');
  } catch (error) {
    console.error('Failed to initialize Firebase with service account:', error);
    // Fallback to default credentials
    initializeApp({
      projectId: projectId,
    });
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