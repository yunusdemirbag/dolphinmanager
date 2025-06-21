import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

// Firebase proje kimliğini doğru şekilde ayarla
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'yunusfirebase-25';

// Ortam değişkenlerini kontrol et ve logla
console.log('🔍 Firebase Admin SDK yapılandırması kontrol ediliyor:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- FIREBASE_PROJECT_ID:', projectId);
console.log('- FIREBASE_CLIENT_EMAIL mevcut mu:', !!process.env.FIREBASE_CLIENT_EMAIL);
console.log('- FIREBASE_PRIVATE_KEY mevcut mu:', !!process.env.FIREBASE_PRIVATE_KEY);

let app: App | undefined;

// Initialize Firebase Admin SDK
if (!getApps().length) {
  try {
    const serviceAccount = {
      projectId: projectId,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }
    
    // Service account bilgilerini kontrol et
    if (!serviceAccount.clientEmail || !serviceAccount.privateKey) {
      console.error('❌ HATA: Firebase Admin SDK için gerekli ortam değişkenleri eksik:');
      if (!serviceAccount.clientEmail) console.error('- FIREBASE_CLIENT_EMAIL eksik');
      if (!serviceAccount.privateKey) console.error('- FIREBASE_PRIVATE_KEY eksik');
      
      // Development ortamında emulator mode kullan
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Development modunda Firebase emulator kullanılıyor');
        app = initializeApp({
          projectId: projectId,
        });
      } else {
        throw new Error('Firebase Admin SDK için gerekli ortam değişkenleri eksik. FIREBASE_CLIENT_EMAIL ve FIREBASE_PRIVATE_KEY ayarlanmalıdır.');
      }
    } else {
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: projectId,
      });
      console.log('✅ Firebase Admin başlatıldı');
    }
  } catch (error) {
    console.error('❌ Firebase Admin başlatma hatası:', error);
    throw error;
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