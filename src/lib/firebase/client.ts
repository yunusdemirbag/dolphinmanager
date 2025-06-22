import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCM42wi9QEaHcyttZCNP6fKNHCaMxYg9E0",
  authDomain: "yunusfirebase-25.firebaseapp.com",
  projectId: "yunusfirebase-25",
  storageBucket: "yunusfirebase-25.firebasestorage.app",
  messagingSenderId: "573177015738",
  appId: "1:573177015738:web:7c9fc7c56d778a01a58183",
  measurementId: "G-Y1JLGNBKQW"
};

// Initialize Firebase
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Analytics only in browser environment
export const analytics = typeof window !== 'undefined' 
  ? (async () => {
      const isAnalyticsSupported = await isSupported();
      return isAnalyticsSupported ? getAnalytics(app) : null;
    })() 
  : null;

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Connect to emulators in development
if (process.env.NODE_ENV === 'development') {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
}

export default app 