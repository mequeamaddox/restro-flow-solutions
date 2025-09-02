import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `restroflowsoftware.firebaseapp.com`,
  projectId: 'restroflowsoftware',
  storageBucket: `restroflowsoftware.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Debug: Log Firebase configuration (without sensitive data)
console.log('Firebase Config Status:', {
  hasApiKey: !!firebaseConfig.apiKey,
  hasProjectId: !!firebaseConfig.projectId,
  hasAppId: !!firebaseConfig.appId,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  envProjectId: import.meta.env.VITE_FIREBASE_PROJECT_ID
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Use production Firebase (no emulator) for better mobile compatibility
// The system is now configured to use your actual Firebase project

export default app;