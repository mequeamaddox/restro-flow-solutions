import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCJ0kNSDxogO-XvbCnSAxHWzg0gcJFK6zA",
  authDomain: "restroflowsoftware.firebaseapp.com",
  projectId: "restroflowsoftware",
  storageBucket: "restroflowsoftware.appspot.com",
  messagingSenderId: "924139270468",
  appId: "1:924139270468:web:bcb1101e22319c4985e711",
};

// Debug: Log Firebase configuration (without sensitive data)
console.log('Firebase Config Status:', {
  hasApiKey: !!firebaseConfig.apiKey,
  hasProjectId: !!firebaseConfig.projectId,
  hasAppId: !!firebaseConfig.appId,
  authDomain: firebaseConfig.authDomain,
  storageBucket: firebaseConfig.storageBucket,
  projectId: firebaseConfig.projectId,
  envProjectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  envVarValues: {
    VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  }
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