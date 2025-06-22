import * as admin from 'firebase-admin';

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

export function initFirebaseAdminApp() {
    if (admin.apps.length > 0) {
        return admin.app();
    }

    try {
        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } catch (error) {
        console.error("Firebase admin initialization error:", error);
        throw error;
    }
}

export const auth = admin.auth;
export const db = admin.firestore;
export const storage = admin.storage;

export default admin; 