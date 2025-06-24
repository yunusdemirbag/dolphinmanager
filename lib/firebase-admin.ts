import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminDb: Firestore | null = null;

export function initializeAdminApp() {
  // If already initialized, just ensure adminDb is set
  if (getApps().length > 0) {
    if (!adminDb) {
      adminDb = getFirestore();
    }
    return;
  }

  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    if (!privateKey) {
      console.error('Firebase Private Key bulunamadı!');
      return;
    }

    // Private key'in doğru formatta olduğundan emin ol
    const formattedPrivateKey = privateKey.includes('\\n') 
      ? privateKey.replace(/\\n/g, '\n') 
      : privateKey;

    const firebaseAdminConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: formattedPrivateKey,
    };

    // Config kontrolü
    console.log('Firebase Admin Config kontrol ediliyor:');
    console.log('- Project ID:', firebaseAdminConfig.projectId ? '✅ Mevcut' : '❌ Eksik');
    console.log('- Client Email:', firebaseAdminConfig.clientEmail ? '✅ Mevcut' : '❌ Eksik');
    console.log('- Private Key:', firebaseAdminConfig.privateKey?.startsWith('-----BEGIN PRIVATE KEY-----') ? '✅ Doğru format' : '❌ Hatalı format');

    if (
      firebaseAdminConfig.projectId &&
      firebaseAdminConfig.clientEmail &&
      firebaseAdminConfig.privateKey &&
      firebaseAdminConfig.privateKey.includes('BEGIN PRIVATE KEY')
    ) {
      initializeApp({
        credential: cert(firebaseAdminConfig),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
      adminDb = getFirestore();
      console.log('Firebase admin initialized successfully');
    } else {
      console.error('Firebase admin config incomplete or invalid. Initialization skipped.');
      console.error('Lütfen .env.local dosyanızda FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL ve FIREBASE_PROJECT_ID değerlerinin doğru olduğundan emin olun.');
    }
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
    adminDb = null;
  }
}

// Initialize on first load in a server environment.
if (typeof window === 'undefined') {
  initializeAdminApp();
}

export { adminDb };

// Bağlı Etsy mağaza bilgisini getir
export async function getConnectedStoreFromFirebaseAdmin() {
  try {
    initializeAdminApp();
    
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }

    const userId = 'local-user-123'; // Bu gerçek auth context'den gelecek
    
    // Aktif mağazayı bul
    const storesSnapshot = await adminDb
      .collection('etsy_stores')
      .where('user_id', '==', userId)
      .where('is_active', '==', true)
      .get();

    if (storesSnapshot.empty) {
      return null;
    }

    const storeDoc = storesSnapshot.docs[0];
    return {
      id: storeDoc.id,
      ...storeDoc.data()
    };
  } catch (error) {
    console.error('Store bilgisi alınırken hata:', error);
    return null;
  }
}