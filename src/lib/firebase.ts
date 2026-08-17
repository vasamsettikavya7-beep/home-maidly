import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSy_dummy_api_key_for_static_nextjs_builds",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "home-maidly.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "home-maidly",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "home-maidly.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "507924625136",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:507924625136:web:a13d4f3c91861668bb3435",
};

// Initialize Firebase client-side only (avoiding SSR build errors)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Enable fallback language (e.g. English) for SMS
auth.useDeviceLanguage();

export { app, auth };
