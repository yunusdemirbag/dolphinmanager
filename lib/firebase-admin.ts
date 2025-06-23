import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let adminDb: FirebaseFirestore.Firestore | null = null;

// Firebase admin sadece server-side'da çalıştır
if (typeof window === 'undefined') {
  const firebaseAdminConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
  };

  if (!getApps().length && firebaseAdminConfig.projectId) {
    try {
      initializeApp({
        credential: cert(firebaseAdminConfig),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
      adminDb = getFirestore();
    } catch (error) {
      console.error('Firebase admin initialization error:', error);
    }
  }
}

export { adminDb, getApps };