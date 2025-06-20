import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, setDoc, addDoc } from "firebase/firestore";
import { cookies } from "next/headers";

// Önbellek için tip tanımlamaları
interface EtsyToken {
  expires_at: string;
  created_at: string;
  access_token_length: number;
  access_token_prefix: string;
  token_type: string;
  access_token?: string;
}

interface EtsyStore {
  shop_id: number;
  shop_name: string;
  user_id: number;
  title: string;
  [key: string]: any;
}

interface ConnectionCache {
  token: EtsyToken | null;
  userId: string | null;
  etsyUserId: string | null;
  stores: EtsyStore[] | null;
  lastFetched: number;
}

// Önbellek nesnesi
let connectionCache: ConnectionCache | null = null;
const CACHE_TTL = 1000 * 60 * 5; // 5 dakika önbellek süresi

// Token'ın geçerli olup olmadığını kontrol eden yardımcı fonksiyon
export function isTokenExpired(token: EtsyToken): boolean {
  if (!token || !token.expires_at) return true;
  const expiryDate = new Date(token.expires_at);
  return expiryDate <= new Date();
}

// Etsy mağaza bilgilerini getir
async function getEtsyStores(userId: string, token: EtsyToken): Promise<EtsyStore[]> {
  console.log('🔍 Etsy mağaza bilgileri alınıyor...');
  
  try {
    // Önce veritabanından mağaza bilgilerini kontrol et
    const storesQuery = query(
      collection(db, 'etsy_stores'),
      where('user_id', '==', userId)
    );
    
    const storesSnapshot = await getDocs(storesQuery);
    
    if (!storesSnapshot.empty) {
      const stores = storesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EtsyStore[];
      
      console.log(`✅ Veritabanında ${stores.length} mağaza bulundu`);
      return stores;
    }
    
    // Veritabanında mağaza yoksa Etsy API'den çek
    console.log('🔄 Mağaza bulunamadı, Etsy API\'den çekiliyor...');
    
    if (!token || !token.access_token) {
      console.error('❌ Geçerli Etsy token bulunamadı');
      return [];
    }
    
    // Etsy API'den kullanıcı bilgilerini çek
    const etsyUserResponse = await fetch('https://openapi.etsy.com/v3/application/users/me', {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'x-api-key': process.env.ETSY_API_KEY || '',
      }
    });
    
    if (!etsyUserResponse.ok) {
      console.error(`❌ Etsy API kullanıcı bilgisi hatası: ${etsyUserResponse.status}`);
      return [];
    }
    
    const etsyUser = await etsyUserResponse.json();
    const etsyUserId = etsyUser.user_id;
    
    // Etsy API'den mağaza bilgilerini çek
    const shopsResponse = await fetch(`https://openapi.etsy.com/v3/application/users/${etsyUserId}/shops`, {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'x-api-key': process.env.ETSY_API_KEY || '',
      }
    });
    
    if (!shopsResponse.ok) {
      console.error(`❌ Etsy API mağaza bilgisi hatası: ${shopsResponse.status}`);
      return [];
    }
    
    const shopsData = await shopsResponse.json();
    
    if (!shopsData.shops || shopsData.shops.length === 0) {
      console.error('❌ Etsy hesabında mağaza bulunamadı');
      return [];
    }
    
    console.log(`✅ Etsy API'den ${shopsData.shops.length} mağaza çekildi`);
    
    // Mağaza bilgilerini veritabanına kaydet
    const storesToSave = shopsData.shops.map((shop: any) => ({
      user_id: userId,
      shop_id: shop.shop_id,
      shop_name: shop.shop_name,
      title: shop.title,
      etsy_user_id: etsyUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    
    try {
      // Firestore'a mağaza bilgilerini kaydet
      const batch = [];
      for (const store of storesToSave) {
        const storeRef = doc(collection(db, 'etsy_stores'));
        batch.push(setDoc(storeRef, store));
      }
      
      await Promise.all(batch);
      console.log('✅ Mağaza bilgileri veritabanına kaydedildi');
    } catch (saveError) {
      console.error('❌ Mağaza bilgileri veritabanına kaydedilemedi:', saveError);
    }
    
    return storesToSave;
    
  } catch (error) {
    console.error('❌ Mağaza bilgileri alınırken hata:', error);
    return [];
  }
}

// Bağlantı bilgilerini döndüren ana fonksiyon
export async function getConnection(userId: string, forceRefresh = false) {
  console.log("🔄 getConnection çağrıldı");
  
  // Önbellek geçerliyse ve yenileme zorlanmıyorsa önbellekten döndür
  if (
    connectionCache && 
    connectionCache.userId === userId && 
    connectionCache.token && 
    !isTokenExpired(connectionCache.token) &&
    connectionCache.stores && 
    connectionCache.stores.length > 0 &&
    Date.now() - connectionCache.lastFetched < CACHE_TTL &&
    !forceRefresh
  ) {
    console.log("✅ Önbellekten bağlantı bilgileri kullanılıyor");
    return connectionCache;
  }

  console.log("🔄 Bağlantı bilgileri yenileniyor...");
  
  // Token bilgisini al
  try {
    const tokensQuery = query(
      collection(db, "etsy_tokens"),
      where("user_id", "==", userId),
      orderBy("created_at", "desc"),
      limit(1)
    );
    
    const tokensSnapshot = await getDocs(tokensQuery);
    
    const token = !tokensSnapshot.empty 
      ? { id: tokensSnapshot.docs[0].id, ...tokensSnapshot.docs[0].data() } as EtsyToken
      : null;
  
    if (!token) {
      console.error("❌ Etsy token bulunamadı");
      // Token yoksa boş önbellek döndür
      connectionCache = {
        token: null,
        userId,
        etsyUserId: null,
        stores: null,
        lastFetched: Date.now()
      };
      return connectionCache;
    }
    
    if (isTokenExpired(token)) {
      console.error("❌ Etsy token süresi dolmuş");
      // Token süresi dolmuşsa boş önbellek döndür
      connectionCache = {
        token,
        userId,
        etsyUserId: null,
        stores: null,
        lastFetched: Date.now()
      };
      return connectionCache;
    }
  
  try {
    // Etsy User ID'yi al
    const userResponse = await fetch("https://openapi.etsy.com/v3/application/users/me", {
      headers: {
        "Authorization": `Bearer ${token.access_token}`,
        "x-api-key": process.env.ETSY_API_KEY || "",
      },
    });
    
    if (!userResponse.ok) {
      throw new Error(`Etsy API kullanıcı bilgisi hatası: ${userResponse.status}`);
    }
    
    const userData = await userResponse.json();
    const etsyUserId = userData.user_id;
    
    // Yeni getEtsyStores fonksiyonunu kullan
    const stores = await getEtsyStores(userId, token);
    
    if (!stores || stores.length === 0) {
      console.warn("⚠️ Etsy mağazası bulunamadı:", {
        userId,
        token: {
          id: token.id,
          user_id: token.user_id,
          access_token: token.access_token ? `${token.access_token.substring(0, 10)}...` : undefined,
          refresh_token: token.refresh_token ? `${token.refresh_token.substring(0, 10)}...` : undefined,
          expires_at: token.expires_at,
          created_at: token.created_at,
          updated_at: token.updated_at,
          token_type: token.token_type
        }
      });
    }
    
    // Önbelleği güncelle
    connectionCache = {
      token,
      userId,
      etsyUserId,
      stores,
      lastFetched: Date.now()
    };
    
    return connectionCache;
    
  } catch (error) {
    console.error("❌ Etsy bağlantı hatası:", error);
    
    // Hata durumunda en azından token'ı içeren bir önbellek döndür
    connectionCache = {
      token,
      userId,
      etsyUserId: null,
      stores: null,
      lastFetched: Date.now()
    };
    
    return connectionCache;
  }
  
  } catch (error) {
    console.error("❌ Token bilgisi alınamadı:", error);
    return {
      token: null,
      userId,
      etsyUserId: null,
      stores: null,
      lastFetched: Date.now()
    };
  }
}

// Önbelleği temizleme fonksiyonu
export function clearConnectionCache() {
  connectionCache = null;
  console.log("🧹 Bağlantı önbelleği temizlendi");
} 