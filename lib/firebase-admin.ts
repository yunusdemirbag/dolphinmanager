import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

// Geliştirme ortamında olup olmadığımızı kontrol et
const isDevelopment = process.env.NODE_ENV === 'development';

let app: App | undefined;

// Initialize Firebase Admin SDK
if (!getApps().length) {
  try {
    // Geliştirme ortamında basit yapılandırma kullan
    if (isDevelopment) {
      console.log('⚠️ Geliştirme ortamında Firebase Admin başlatılıyor');
      // Geliştirme ortamında da gerçek Firebase kullan
      const serviceAccount = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }

      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
      console.log('✅ Firebase Admin başlatıldı (geliştirme ortamında gerçek yapılandırma ile)');
    } else {
      // Üretim ortamında da NEXT_PUBLIC_ vars kullan (tutarlılık için)
      const serviceAccount = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }

      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
      console.log('✅ Firebase Admin başlatıldı (NEXT_PUBLIC vars ile)');
    }
  } catch (error) {
    console.error('❌ Firebase Admin başlatma hatası:', error);
  }
} else {
  app = getApps()[0]
}

// Uygulama başlatılamadıysa hata fırlat
if (!app) {
  throw new Error('Firebase Admin SDK başlatılamadı');
}

// Initialize services
const auth = getAuth(app)
const db = getFirestore(app)

export { auth, db }
export default app