import * as admin from 'firebase-admin';

// Firebase Admin SDK yapılandırması
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : null;

// Açıkça projectId belirle - yunusfirebase-25 kullan
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'yunusfirebase-25';

// Firebase Admin SDK başlatma
if (!admin.apps.length) {
  try {
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
        projectId: projectId
      });
      console.log('✅ Firebase Admin başlatıldı (tam yapılandırma ile)');
    } else {
      // Eğer service account bilgisi yoksa, emülatör modunda başlat
      admin.initializeApp({
        projectId: projectId
      });
      console.log('⚠️ Firebase Admin başlatıldı (emülatör modu - sadece geliştirme ortamı için)');
    }
  } catch (error) {
    console.error('❌ Firebase Admin başlatma hatası:', error);
  }
}

export const auth = admin.auth();
export const db = admin.firestore();
export const storage = admin.storage();

export default admin; 