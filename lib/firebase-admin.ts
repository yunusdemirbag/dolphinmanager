import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore, Timestamp } from 'firebase-admin/firestore';
import { Store } from '@/types/store';

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

    const formattedPrivateKey = privateKey.includes('\\n') 
      ? privateKey.replace(/\\n/g, '\n') 
      : privateKey;

    const firebaseAdminConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: formattedPrivateKey,
    };

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

if (typeof window === 'undefined') {
  initializeAdminApp();
}

export { adminDb };

// Kullanıcının tüm mağazalarını getir
export async function getAllUserStores(userId: string, includeDisconnected: boolean = false) {
  try {
    initializeAdminApp();
    
    if (!adminDb) {
      throw new Error('Firebase Admin başlatılamadı');
    }

    const query = adminDb
      .collection('etsy_stores')
      .where('user_id', '==', userId);

    const storesSnapshot = await query.get();

    console.log(`🔍 Firebase'den toplam ${storesSnapshot.docs.length} mağaza bulundu`);
    storesSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. ${data.shop_name} (ID: ${data.shop_id})`, {
        is_connected: data.is_connected,
        is_active: data.is_active,
        disconnected_at: data.disconnected_at ? 'VAR' : 'YOK'
      });
    });
    
    const allStores = await Promise.all(storesSnapshot.docs.map(async (doc) => {
      const storeData = doc.data();
      
      
      // API anahtarlarını kontrol et
      const apiKeysDoc = await adminDb!
        .collection('etsy_api_keys')
        .doc(doc.id)
        .get();

      // Timestamp'leri Date objesine çevir
      const connected_at = storeData.connected_at instanceof Timestamp 
        ? storeData.connected_at.toDate() 
        : new Date(storeData.connected_at);

      const last_sync_at = storeData.last_sync_at instanceof Timestamp 
        ? storeData.last_sync_at.toDate() 
        : new Date(storeData.last_sync_at);

      const last_token_refresh = storeData.last_token_refresh instanceof Timestamp 
        ? storeData.last_token_refresh.toDate() 
        : storeData.last_token_refresh 
          ? new Date(storeData.last_token_refresh) 
          : null;

      const last_activated_at = storeData.last_activated_at instanceof Timestamp 
        ? storeData.last_activated_at.toDate() 
        : storeData.last_activated_at 
          ? new Date(storeData.last_activated_at) 
          : null;

      // Mağaza ikonunu ekleyin
      const shop_icon_url = storeData.shop_icon_url || null;

      // Serialize edilebilir obje oluştur
      return {
        id: doc.id,
        user_id: storeData.user_id,
        shop_id: storeData.shop_id,
        shop_name: storeData.shop_name,
        etsy_user_id: storeData.etsy_user_id,
        connected_at,
        last_sync_at,
        last_token_refresh,
        last_activated_at,
        is_active: storeData.is_active,
        is_connected: storeData.is_connected !== false && !storeData.disconnected_at, // Default true for backward compatibility
        shop_icon_url,
        hasValidToken: apiKeysDoc.exists,
        total_products: storeData.total_products || 0,
        disconnected_at: storeData.disconnected_at ? 
          (storeData.disconnected_at instanceof Timestamp ? 
            storeData.disconnected_at.toDate() : 
            new Date(storeData.disconnected_at)) : null,
        disconnect_reason: storeData.disconnect_reason || null
      } as Store;
    }));

    // Bağlantısı kesilen mağazaları filtrele
    const stores = includeDisconnected 
      ? allStores 
      : allStores.filter(store => {
          // Sadece açıkça false olan veya disconnected_at tarihi olan mağazaları filtrele
          const isConnected = store.is_connected !== false && !store.disconnected_at;
          return isConnected;
        });

    // JavaScript tarafında sırala
    return stores.sort((a, b) => {
      const dateA = new Date(a.connected_at);
      const dateB = new Date(b.connected_at);
      return dateB.getTime() - dateA.getTime();
    });
  } catch (error) {
    console.error('Mağaza listesi alınırken hata:', error);
    return [];
  }
}

// Bağlı Etsy mağaza bilgisini getir (tek mağaza - eski sistem için)
export async function getConnectedStoreFromFirebaseAdmin(userId?: string) {
  try {
    initializeAdminApp();
    
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }

    const targetUserId = userId || 'local-user-123';
    
    const storesSnapshot = await adminDb
      .collection('etsy_stores')
      .where('user_id', '==', targetUserId)
      .where('is_active', '==', true)
      .get();

    if (storesSnapshot.empty) {
      return null;
    }

    const storeDoc = storesSnapshot.docs[0];
    const storeData = storeDoc.data();

    // Timestamp'leri Date objesine çevir
    const connected_at = storeData.connected_at instanceof Timestamp 
      ? storeData.connected_at.toDate() 
      : new Date(storeData.connected_at);

    const last_sync_at = storeData.last_sync_at instanceof Timestamp 
      ? storeData.last_sync_at.toDate() 
      : new Date(storeData.last_sync_at);

    const last_token_refresh = storeData.last_token_refresh instanceof Timestamp 
      ? storeData.last_token_refresh.toDate() 
      : storeData.last_token_refresh 
        ? new Date(storeData.last_token_refresh) 
        : null;

    const last_activated_at = storeData.last_activated_at instanceof Timestamp 
      ? storeData.last_activated_at.toDate() 
      : storeData.last_activated_at 
        ? new Date(storeData.last_activated_at) 
        : null;

    // Serialize edilebilir obje oluştur
    return {
      id: storeDoc.id,
      user_id: storeData.user_id,
      shop_id: storeData.shop_id,
      shop_name: storeData.shop_name,
      etsy_user_id: storeData.etsy_user_id,
      connected_at,
      last_sync_at,
      last_token_refresh,
      last_activated_at,
      is_active: storeData.is_active,
      shop_icon_url: storeData.shop_icon_url || null,
      hasValidToken: true, // Aktif mağaza olduğu için token geçerli kabul edilir
      total_products: storeData.total_products || 0
    } as Store;
  } catch (error) {
    console.error('Store bilgisi alınırken hata:', error);
    return null;
  }
}

// Çoklu mağaza API için - yeni sistem
export async function getConnectedStoresFromFirebaseAdmin(userId?: string) {
  try {
    initializeAdminApp();
    
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }

    const targetUserId = userId || 'local-user-123';
    
    // Kullanıcının tüm aktif mağazalarını bul (orderBy kaldırıldı)
    const storesSnapshot = await adminDb
      .collection('etsy_stores')
      .where('user_id', '==', targetUserId)
      .where('is_active', '==', true)
      .get();

    if (storesSnapshot.empty) {
      return [];
    }

    return storesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Mağaza listesi alınırken hata:', error);
    return [];
  }
}

// Aktif mağazayı değiştir
export async function switchActiveStore(userId: string, newActiveShopId: string) {
  try {
    initializeAdminApp();
    
    if (!adminDb) {
      throw new Error('Firebase Admin başlatılamadı');
    }

    // Mağazanın kullanıcıya ait olduğunu kontrol et
    const storeDoc = await adminDb
      .collection('etsy_stores')
      .doc(newActiveShopId)
      .get();

    if (!storeDoc.exists) {
      throw new Error('Mağaza bulunamadı');
    }

    const storeData = storeDoc.data();
    if (storeData?.user_id !== userId) {
      throw new Error('Bu mağaza üzerinde yetkiniz yok');
    }

    const batch = adminDb.batch();

    // Önce tüm mağazaları pasif yap
    const storesSnapshot = await adminDb
      .collection('etsy_stores')
      .where('user_id', '==', userId)
      .get();

    storesSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { is_active: false });
    });

    // Seçilen mağazayı aktif yap
    batch.update(storeDoc.ref, { 
      is_active: true,
      last_activated_at: new Date()
    });

    await batch.commit();
    return {
      success: true,
      store: {
        id: storeDoc.id,
        ...storeData
      }
    };
  } catch (error: any) {
    console.error('Mağaza geçişi sırasında hata:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Mağaza bağlantısını kontrol et
export async function checkStoreConnection(shopId: string) {
  try {
    initializeAdminApp();
    
    if (!adminDb) {
      throw new Error('Firebase Admin başlatılamadı');
    }

    const [storeDoc, apiKeysDoc] = await Promise.all([
      adminDb.collection('etsy_stores').doc(shopId).get(),
      adminDb.collection('etsy_api_keys').doc(shopId).get()
    ]);

    if (!storeDoc.exists || !apiKeysDoc.exists) {
      return {
        exists: false,
        isValid: false
      };
    }

    const apiKeys = apiKeysDoc.data();
    const expiresAt = apiKeys?.expires_at?.toDate();
    const isValid = expiresAt ? expiresAt > new Date() : false;

    return {
      exists: true,
      isValid,
      expiresAt
    };
  } catch (error) {
    console.error('Mağaza bağlantısı kontrol edilirken hata:', error);
    return {
      exists: false,
      isValid: false,
      error: 'Bağlantı kontrolü başarısız'
    };
  }
}