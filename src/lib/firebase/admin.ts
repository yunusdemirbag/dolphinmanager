import admin from 'firebase-admin';

// Eğer uygulama zaten başlatılmışsa, tekrar başlatma.
// Bu, sunucusuz ortamlarda performansı artırır.
if (!admin.apps.length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const adminAuth = admin.auth();
const db = admin.firestore();

export { adminAuth, db };

export const storage = admin.storage;

export default admin; 