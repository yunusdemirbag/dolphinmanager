import * as admin from 'firebase-admin';

// Firebase Admin SDK yapılandırması
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : null;

// Firebase Admin SDK başlatma
if (!admin.apps.length) {
  try {
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
      console.log('✅ Firebase Admin başlatıldı (tam yapılandırma ile)');
    } else {
      // Eğer service account bilgisi yoksa, credential olmadan başlat
      admin.initializeApp({
        // Geliştirme ortamında credential olmadan çalışabilir
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
      console.log('⚠️ Firebase Admin başlatıldı (credential olmadan - sadece geliştirme ortamı için)');
    }
  } catch (error) {
    console.error('❌ Firebase Admin başlatma hatası:', error);
  }
}

export const auth = admin.auth();
export const db = admin.firestore();
export const storage = admin.storage();

export default admin; 