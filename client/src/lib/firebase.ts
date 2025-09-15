import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "restroflowsoftware.firebaseapp.com",
  projectId: "restroflowsoftware",
  storageBucket: "restroflowsoftware.firebasestorage.app",
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Debug: Log Firebase configuration (without sensitive data)
console.log('Firebase Config Status:', {
  hasApiKey: !!firebaseConfig.apiKey,
  hasProjectId: !!firebaseConfig.projectId,
  hasAppId: !!firebaseConfig.appId,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  envProjectId: "restroflowsoftware (FIXED)"
});

// Initialize Firebase using singleton pattern to prevent race conditions
import { getApps } from "firebase/app";

// Use singleton pattern - reuse existing app or create new one
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Use production Firebase (no emulator) for better mobile compatibility
// The system is now configured to use your actual Firebase project

// Test function to verify Firebase authentication with exact credentials
export const testFirebaseAuth = async () => {
  try {
    console.log('🧪 FIREBASE AUTH TEST STARTING...');
    
    // Test with the exact credentials
    const testEmail = 'mequeamaddox@gmail.com';
    const testPassword = 'Temp1234!';
    
    console.log('🔧 Firebase Configuration Test:');
    console.log('   - API Key exists:', !!firebaseConfig.apiKey);
    console.log('   - API Key length:', firebaseConfig.apiKey?.length || 0);
    console.log('   - Auth Domain:', firebaseConfig.authDomain);
    console.log('   - Project ID:', firebaseConfig.projectId);
    console.log('   - App ID exists:', !!firebaseConfig.appId);
    
    // Import signInWithEmailAndPassword here to avoid circular imports
    const { signInWithEmailAndPassword } = await import("firebase/auth");
    
    console.log('🔑 Attempting test authentication...');
    console.log('📧 Test email:', `"${testEmail}"`);
    console.log('🔐 Test password length:', testPassword.length);
    console.log('🔐 Test password first/last chars:', testPassword[0] + '...' + testPassword.slice(-1));
    
    const userCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);
    
    console.log('✅ FIREBASE AUTH TEST SUCCESSFUL!');
    console.log('👤 User UID:', userCredential.user.uid);
    console.log('📧 User Email:', userCredential.user.email);
    console.log('✅ Email verified:', userCredential.user.emailVerified);
    
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    console.error('❌ FIREBASE AUTH TEST FAILED:');
    console.error('   - Error code:', error.code);
    console.error('   - Error message:', error.message);
    console.error('   - Full error:', error);
    
    return { success: false, error: error };
  }
};

// Call the test function on module load for immediate feedback
if (typeof window !== 'undefined') {
  // Add to window for manual testing
  (window as any).testFirebaseAuth = testFirebaseAuth;
  
  // Run automatic test after a short delay
  setTimeout(() => {
    console.log('🚀 Running automatic Firebase auth test...');
    testFirebaseAuth();
  }, 2000);
}

export default app;