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

export default app;