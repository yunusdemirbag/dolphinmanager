import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let adminDb: FirebaseFirestore.Firestore | null = null;

// Firebase admin sadece server-side'da çalıştır
if (typeof window === 'undefined') {
  try {
    const firebaseAdminConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID || '',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
    };

    // Firebase admin yapılandırmasını kontrol et
    const hasValidConfig = firebaseAdminConfig.projectId && 
                         firebaseAdminConfig.clientEmail && 
                         firebaseAdminConfig.privateKey &&
                         firebaseAdminConfig.privateKey.includes('BEGIN PRIVATE KEY');

    if (!getApps().length && hasValidConfig) {
      try {
        initializeApp({
          credential: cert(firebaseAdminConfig),
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
        adminDb = getFirestore();
        console.log('Firebase admin initialized successfully');
      } catch (error) {
        console.error('Firebase admin initialization error:', error);
        adminDb = null;
      }
    } else {
      console.log('Firebase admin config incomplete');
      adminDb = null;
    }
  } catch (error) {
    console.error('Firebase admin setup error:', error);
    adminDb = null;
  }
}

export { adminDb, getApps };