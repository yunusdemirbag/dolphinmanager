import admin from 'firebase-admin';

// Eğer uygulama zaten başlatılmışsa, tekrar başlatma.
// Bu, sunucusuz ortamlarda performansı artırır.
if (!admin.apps.length) {
  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    // Service account bilgilerini kontrol et
    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      console.error('❌ HATA: Firebase Admin SDK için gerekli ortam değişkenleri eksik');
      
      // Development ortamında emulator mode kullan
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Development modunda Firebase emulator kullanılıyor');
        admin.initializeApp({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      } else {
        throw new Error('Firebase Admin SDK için gerekli ortam değişkenleri eksik.');
      }
    } else {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase Admin başlatıldı');
    }
  } catch (error) {
    console.error('❌ Firebase Admin başlatma hatası:', error);
  }
}

const adminAuth = admin.auth();
const db = admin.firestore();

export { adminAuth, db };

// Auth modülünü doğrudan export et
export const auth = admin.auth();

export const storage = admin.storage;

export default admin; 