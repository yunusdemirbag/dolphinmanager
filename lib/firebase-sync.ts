import { collection, doc, setDoc, updateDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { adminDb, initializeAdminApp } from './firebase-admin';

export interface EtsyStore {
  shop_id: number;
  shop_name: string;
  user_id: string;
  access_token?: string;
  refresh_token?: string;
  connected_at: Date;
  last_sync_at: Date;
  is_active: boolean;
  total_products?: number;
  active_listings?: number;
  monthly_sales?: string;
}

export interface ProductDraft {
  id: string;
  user_id: string;
  shop_id: number;
  title: string;
  description: string;
  tags: string[];
  images: string[];
  variations: Array<{
    size: string;
    pattern: string;
    price: number;
    is_active: boolean;
  }>;
  category_id?: number;
  shop_section_id?: number;
  shipping_profile_id?: number;
  is_personalized: boolean;
  processing_min: number;
  processing_max: number;
  created_at: Date;
  updated_at: Date;
  status: 'draft' | 'uploading' | 'published' | 'error';
}

export interface ShippingProfile {
  shipping_profile_id: number;
  title: string;
  min_processing_days: number;
  max_processing_days: number;
  shop_id: number;
}

export interface ShopSection {
  shop_section_id: number;
  title: string;
  shop_id: number;
}

export interface TaxonomyNode {
  id: number;
  name: string;
  path: string[];
  level: number;
}

// Collections
const STORES_COLLECTION = 'etsy_stores';
const PRODUCT_DRAFTS_COLLECTION = 'product_drafts';
const SHIPPING_PROFILES_COLLECTION = 'shipping_profiles';
const SHOP_SECTIONS_COLLECTION = 'shop_sections';
const TAXONOMY_NODES_COLLECTION = 'taxonomy_nodes';

/**
 * Sync Etsy store data to Firebase
 */
export async function syncEtsyStoreToFirebase(storeData: {
  shop_id: number;
  shop_name: string;
  user_id: string;
  access_token?: string;
  refresh_token?: string;
}): Promise<void> {
  try {
    const storeRef = doc(db, STORES_COLLECTION, storeData.shop_id.toString());
    
    const storeDoc: EtsyStore = {
      shop_id: storeData.shop_id,
      shop_name: storeData.shop_name,
      user_id: storeData.user_id,
      access_token: storeData.access_token,
      refresh_token: storeData.refresh_token,
      connected_at: new Date(),
      last_sync_at: new Date(),
      is_active: true
    };

    await setDoc(storeRef, {
      ...storeDoc,
      connected_at: serverTimestamp(),
      last_sync_at: serverTimestamp()
    }, { merge: true });

    console.log('Store synced to Firebase:', storeData.shop_id);
  } catch (error) {
    console.error('Error syncing store to Firebase:', error);
    throw error;
  }
}

/**
 * Get connected Etsy store from Firebase
 */
export async function getConnectedStoreFromFirebase(userId: string): Promise<EtsyStore | null> {
  try {
    const storesQuery = query(
      collection(db, STORES_COLLECTION),
      where('user_id', '==', userId),
      where('is_active', '==', true)
    );

    const querySnapshot = await getDocs(storesQuery);
    
    if (querySnapshot.empty) {
      return null;
    }

    const storeDoc = querySnapshot.docs[0];
    return {
      ...storeDoc.data(),
      connected_at: storeDoc.data().connected_at?.toDate() || new Date(),
      last_sync_at: storeDoc.data().last_sync_at?.toDate() || new Date()
    } as EtsyStore;
  } catch (error) {
    console.error('Error getting connected store from Firebase:', error);
    throw error;
  }
}

/**
 * Sync shipping profiles to Firebase
 */
export async function syncShippingProfilesToFirebase(shopId: number, profiles: ShippingProfile[]): Promise<void> {
  try {
    const batch = [];
    
    for (const profile of profiles) {
      const profileRef = doc(db, SHIPPING_PROFILES_COLLECTION, `${shopId}_${profile.shipping_profile_id}`);
      batch.push(setDoc(profileRef, {
        ...profile,
        shop_id: shopId,
        updated_at: serverTimestamp()
      }));
    }

    await Promise.all(batch);
    console.log(`Synced ${profiles.length} shipping profiles to Firebase for shop ${shopId}`);
  } catch (error) {
    console.error('Error syncing shipping profiles to Firebase:', error);
    throw error;
  }
}

/**
 * Get shipping profiles from Firebase
 */
export async function getShippingProfilesFromFirebase(shopId: number): Promise<ShippingProfile[]> {
  try {
    const profilesQuery = query(
      collection(db, SHIPPING_PROFILES_COLLECTION),
      where('shop_id', '==', shopId)
    );

    const querySnapshot = await getDocs(profilesQuery);
    return querySnapshot.docs.map(doc => doc.data() as ShippingProfile);
  } catch (error) {
    console.error('Error getting shipping profiles from Firebase:', error);
    throw error;
  }
}

/**
 * Sync shop sections to Firebase
 */
export async function syncShopSectionsToFirebase(shopId: number, sections: ShopSection[]): Promise<void> {
  try {
    const batch = [];
    
    for (const section of sections) {
      const sectionRef = doc(db, SHOP_SECTIONS_COLLECTION, `${shopId}_${section.shop_section_id}`);
      batch.push(setDoc(sectionRef, {
        ...section,
        shop_id: shopId,
        updated_at: serverTimestamp()
      }));
    }

    await Promise.all(batch);
    console.log(`Synced ${sections.length} shop sections to Firebase for shop ${shopId}`);
  } catch (error) {
    console.error('Error syncing shop sections to Firebase:', error);
    throw error;
  }
}

/**
 * Get shop sections from Firebase
 */
export async function getShopSectionsFromFirebase(shopId: number): Promise<ShopSection[]> {
  try {
    const sectionsQuery = query(
      collection(db, SHOP_SECTIONS_COLLECTION),
      where('shop_id', '==', shopId)
    );

    const querySnapshot = await getDocs(sectionsQuery);
    return querySnapshot.docs.map(doc => doc.data() as ShopSection);
  } catch (error) {
    console.error('Error getting shop sections from Firebase:', error);
    throw error;
  }
}

/**
 * Sync taxonomy nodes to Firebase (global data)
 */
export async function syncTaxonomyNodesToFirebase(nodes: TaxonomyNode[]): Promise<void> {
  try {
    const batch = [];
    
    for (const node of nodes) {
      const nodeRef = doc(db, TAXONOMY_NODES_COLLECTION, node.id.toString());
      batch.push(setDoc(nodeRef, {
        ...node,
        updated_at: serverTimestamp()
      }));
    }

    await Promise.all(batch);
    console.log(`Synced ${nodes.length} taxonomy nodes to Firebase`);
  } catch (error) {
    console.error('Error syncing taxonomy nodes to Firebase:', error);
    throw error;
  }
}

/**
 * Get taxonomy nodes from Firebase
 */
export async function getTaxonomyNodesFromFirebase(): Promise<TaxonomyNode[]> {
  try {
    const querySnapshot = await getDocs(collection(db, TAXONOMY_NODES_COLLECTION));
    return querySnapshot.docs.map(doc => doc.data() as TaxonomyNode);
  } catch (error) {
    console.error('Error getting taxonomy nodes from Firebase:', error);
    throw error;
  }
}

/**
 * Save product draft to Firebase
 */
export async function saveProductDraftToFirebase(draft: Omit<ProductDraft, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
  try {
    const draftRef = doc(collection(db, PRODUCT_DRAFTS_COLLECTION));
    
    const draftDoc: ProductDraft = {
      ...draft,
      id: draftRef.id,
      created_at: new Date(),
      updated_at: new Date()
    };

    await setDoc(draftRef, {
      ...draftDoc,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });

    console.log('Product draft saved to Firebase:', draftRef.id);
    return draftRef.id;
  } catch (error) {
    console.error('Error saving product draft to Firebase:', error);
    throw error;
  }
}

/**
 * Get product drafts from Firebase
 */
export async function getProductDraftsFromFirebase(userId: string, shopId?: number): Promise<ProductDraft[]> {
  try {
    let draftsQuery = query(
      collection(db, PRODUCT_DRAFTS_COLLECTION),
      where('user_id', '==', userId)
    );

    if (shopId) {
      draftsQuery = query(draftsQuery, where('shop_id', '==', shopId));
    }

    const querySnapshot = await getDocs(draftsQuery);
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      created_at: doc.data().created_at?.toDate() || new Date(),
      updated_at: doc.data().updated_at?.toDate() || new Date()
    })) as ProductDraft[];
  } catch (error) {
    console.error('Error getting product drafts from Firebase:', error);
    throw error;
  }
}

/**
 * Update product draft in Firebase
 */
export async function updateProductDraftInFirebase(draftId: string, updates: Partial<ProductDraft>): Promise<void> {
  try {
    const draftRef = doc(db, PRODUCT_DRAFTS_COLLECTION, draftId);
    
    await updateDoc(draftRef, {
      ...updates,
      updated_at: serverTimestamp()
    });

    console.log('Product draft updated in Firebase:', draftId);
  } catch (error) {
    console.error('Error updating product draft in Firebase:', error);
    throw error;
  }
}

/**
 * Delete product draft from Firebase
 */
export async function deleteProductDraftFromFirebase(draftId: string): Promise<void> {
  try {
    const draftRef = doc(db, PRODUCT_DRAFTS_COLLECTION, draftId);
    await updateDoc(draftRef, {
      status: 'deleted',
      updated_at: serverTimestamp()
    });

    console.log('Product draft deleted from Firebase:', draftId);
  } catch (error) {
    console.error('Error deleting product draft from Firebase:', error);
    throw error;
  }
}

// --- ADMIN-SIDE (SERVER) FUNCTIONS ---

/**
 * Syncs a batch of products to Firebase for a specific user using the Admin SDK.
 */
export async function syncProductsToFirebaseAdmin(userId: string, products: any[]): Promise<void> {
  initializeAdminApp();
  if (!adminDb) throw new Error('Firebase Admin not initialized');
  if (!products || !Array.isArray(products) || products.length === 0) return;
  
  console.log(`🔄 Veritabanına ${products.length} ürün yazılıyor (Kullanıcı: ${userId})...`);

  // Ürünleri ana 'products' koleksiyonuna yazıyoruz.
  const productsCollection = adminDb.collection('products');
  
  const chunkSize = 499;

  for (let i = 0; i < products.length; i += chunkSize) {
    const chunk = products.slice(i, i + chunkSize);
    const batch = adminDb.batch();

    chunk.forEach(product => {
      // Belge ID'si olarak ürünün ID'sini kullanıyoruz.
      const docRef = productsCollection.doc(String(product.listing_id));
      
      // --- KESİN ÇÖZÜM BURADA ---
      // Gelen 'product' nesnesi zaten zenginleştirilmiş ve 'images' alanını içeriyor.
      // Bu nesneyi olduğu gibi alıp, sadece 'userId' ve 'synced_at' alanlarını ekliyoruz.
      const productDataToSave = {
        ...product,
        // Ensure arrays are always arrays for safe .length access later
        tags: Array.isArray(product.tags) ? product.tags : [],
        images: Array.isArray(product.images) ? product.images : [],
        variations: Array.isArray(product.variations) ? product.variations : [],
        userId: userId, // Ürünün kime ait olduğunu belirtmek için
        synced_at: new Date() // Senkronizasyon zamanı
      };
      // --- KESİN ÇÖZÜM SONU ---
      
      batch.set(docRef, productDataToSave, { merge: true });
    });
    
    console.log(`Yazma işlemi: Parça ${Math.floor(i / chunkSize) + 1} / ${Math.ceil(products.length / chunkSize)} işleniyor...`);
    await batch.commit();
  }

  console.log(`✅ ${products.length} ürün Firebase'e başarıyla senkronize edildi.`);
}

/**
 * Counts the total products for a user in Firebase using the Admin SDK.
 */
export async function countProductsInFirebaseAdmin(userId: string): Promise<number> {
  initializeAdminApp();
  if (!adminDb) {
    console.error('Firebase Admin not initialized. Cannot count products.');
    return 0;
  }
  if (!userId) {
    console.error("Error: countProductsInFirebaseAdmin called with empty userId.");
    return 0;
  }
  
  // Ana 'products' koleksiyonunu kullanıyoruz ve 'userId' ile filtreliyoruz
  const productsCollRef = adminDb.collection('products').where('userId', '==', userId);
  const snapshot = await productsCollRef.count().get();
  return snapshot.data().count;
}

/**
 * Gets paginated products for a user from Firebase using the Admin SDK.
 * Uses a listing_id as a cursor for pagination.
 */
export async function getProductsFromFirebaseAdmin(
  userId: string,
  pageSize: number = 12,
  startAfterListingId: number | null = null,
  shopId?: string | null
) {
  try {
    initializeAdminApp();
    if (!adminDb) {
      console.error("Firebase Admin DB not initialized");
      return { products: [], nextCursor: null };
    }

    console.log(`🔍 Ürünler getiriliyor - userId: ${userId}, shopId: ${shopId}, pageSize: ${pageSize}`);

    // Ana 'products' koleksiyonunu kullanıyoruz ve 'userId' ile filtreliyoruz
    let query = adminDb.collection('products')
      .where('userId', '==', userId);
    
    // ShopId varsa o mağazanın ürünlerini getir
    if (shopId) {
      const shopIdNumber = parseInt(shopId);
      console.log(`🏪 ShopId filtresi ekleniyor: ${shopId} -> ${shopIdNumber}`);
      if (isNaN(shopIdNumber)) {
        throw new Error(`Geçersiz shopId formatı: ${shopId}`);
      }
      query = query.where('shop_id', '==', shopIdNumber);
    }
    
    query = query.orderBy('listing_id', 'desc').limit(pageSize);

    if (startAfterListingId) {
      console.log(`📄 Cursor ile başlangıç: ${startAfterListingId}`);
      query = query.startAfter(startAfterListingId);
    }

    const snapshot = await query.get();
    console.log(`📦 ${snapshot.docs.length} ürün bulundu`);

  const products = (snapshot.docs || []).map(doc => {
    const data = doc.data();

    const serializableData = {
      ...data,
      // Ensure arrays are always arrays
      tags: Array.isArray(data.tags) ? data.tags : [],
      images: Array.isArray(data.images) ? data.images : [],
      variations: Array.isArray(data.variations) ? data.variations : [],
      // Handle dates
      synced_at: data.synced_at?.toDate ? data.synced_at.toDate().toISOString() : null,
      created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : null,
      updated_at: data.updated_at?.toDate ? data.updated_at.toDate().toISOString() : null,
    };

    return {
      id: doc.id,
      ...serializableData,
    };
  });

    const lastDoc = (snapshot.docs && snapshot.docs.length > 0) ? snapshot.docs[snapshot.docs.length - 1] : null;
    const nextCursor = lastDoc ? lastDoc.data().listing_id : null;

    console.log(`✅ Ürünler hazırlandı - nextCursor: ${nextCursor}`);
    return { products, nextCursor };
  } catch (error) {
    console.error('❌ getProductsFromFirebaseAdmin hatası:', error);
    console.error('❌ Hata detayları:', {
      userId,
      shopId,
      pageSize,
      startAfterListingId,
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
    throw error; // Re-throw error so API endpoint can handle it
  }
}

export async function getConnectedStoreFromFirebaseAdmin(userId: string): Promise<EtsyStore | null> {
  initializeAdminApp();
  if (!adminDb) {
    console.error("Firebase Admin DB not initialized");
    return null;
  }
  
  try {
    if (!userId || userId.trim() === '') {
      console.error("Geçersiz userId: Boş veya null değer.");
      return null;
    }

    console.log(`🔍 ${userId} kullanıcısı için mağaza bilgileri alınıyor...`);
    const storesQuery = adminDb.collection('etsy_stores')
      .where('user_id', '==', userId)
      .where('is_active', '==', true)
      .limit(1);

    const querySnapshot = await storesQuery.get();

    if (querySnapshot.empty) {
      console.error('No active Etsy store connected for this user.');
      return null;
    }

    const storeDoc = querySnapshot.docs[0];
    const storeData = storeDoc.data() as EtsyStore;
    
    // Firebase Timestamp'leri JavaScript Date'e çevir
    if (storeData.connected_at && typeof (storeData.connected_at as any).toDate === 'function') {
        storeData.connected_at = (storeData.connected_at as any).toDate();
    }
    if (storeData.last_sync_at && typeof (storeData.last_sync_at as any).toDate === 'function') {
        storeData.last_sync_at = (storeData.last_sync_at as any).toDate();
    }
    if ((storeData as any).last_token_refresh && typeof ((storeData as any).last_token_refresh as any).toDate === 'function') {
        (storeData as any).last_token_refresh = ((storeData as any).last_token_refresh as any).toDate();
    }

    return storeData;

  } catch (error) {
    console.error('Error fetching connected store from Firebase Admin:', error);
    return null;
  }
}

/**
 * Get shipping profiles from Firebase using Admin SDK
 */
export async function getShippingProfilesFromFirebaseAdmin(shopId: number): Promise<ShippingProfile[]> {
  initializeAdminApp();
  if (!adminDb) {
    console.error("Firebase Admin DB not initialized");
    return [];
  }

  try {
    const profilesSnapshot = await adminDb
      .collection(SHIPPING_PROFILES_COLLECTION)
      .where('shop_id', '==', shopId)
      .get();

    return profilesSnapshot.docs.map(doc => doc.data() as ShippingProfile);
  } catch (error) {
    console.error('Error getting shipping profiles from Firebase Admin:', error);
    return [];
  }
}

/**
 * Get shop sections from Firebase using Admin SDK
 */
export async function getShopSectionsFromFirebaseAdmin(shopId: number): Promise<ShopSection[]> {
  initializeAdminApp();
  if (!adminDb) {
    console.error("Firebase Admin DB not initialized");
    return [];
  }

  try {
    const sectionsSnapshot = await adminDb
      .collection(SHOP_SECTIONS_COLLECTION)
      .where('shop_id', '==', shopId)
      .get();

    return sectionsSnapshot.docs.map(doc => doc.data() as ShopSection);
  } catch (error) {
    console.error('Error getting shop sections from Firebase Admin:', error);
    return [];
  }
}

/**
 * Sync shipping profiles to Firebase using Admin SDK
 */
export async function syncShippingProfilesToFirebaseAdmin(shopId: number, profiles: ShippingProfile[]): Promise<void> {
  initializeAdminApp();
  if (!adminDb) {
    console.error("Firebase Admin DB not initialized");
    return;
  }

  try {
    const batch = adminDb.batch();
    
    for (const profile of profiles) {
      const profileRef = adminDb.collection(SHIPPING_PROFILES_COLLECTION).doc(`${shopId}_${profile.shipping_profile_id}`);
      batch.set(profileRef, {
        ...profile,
        shop_id: shopId,
        synced_at: new Date()
      });
    }
    
    await batch.commit();
    console.log(`✅ Synced ${profiles.length} shipping profiles to Firebase for shop ${shopId}`);
  } catch (error) {
    console.error('Error syncing shipping profiles to Firebase Admin:', error);
    throw error;
  }
}

/**
 * Sync shop sections to Firebase using Admin SDK
 */
export async function syncShopSectionsToFirebaseAdmin(shopId: number, sections: ShopSection[]): Promise<void> {
  initializeAdminApp();
  if (!adminDb) {
    console.error("Firebase Admin DB not initialized");
    return;
  }

  try {
    const batch = adminDb.batch();
    
    for (const section of sections) {
      const sectionRef = adminDb.collection(SHOP_SECTIONS_COLLECTION).doc(`${shopId}_${section.shop_section_id}`);
      batch.set(sectionRef, {
        ...section,
        shop_id: shopId,
        synced_at: new Date()
      });
    }
    
    await batch.commit();
    console.log(`✅ Synced ${sections.length} shop sections to Firebase for shop ${shopId}`);
  } catch (error) {
    console.error('Error syncing shop sections to Firebase Admin:', error);
    throw error;
  }
}