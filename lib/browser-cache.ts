/**
 * Tarayıcı tabanlı önbellek sistemi
 * 
 * Bu modül, tarayıcı tarafında çalışan bir önbellek sistemi sağlar.
 * Büyük veri setlerini localStorage ve IndexedDB kullanarak saklar.
 * Özellikle ürün listesi gibi büyük veri setlerini önbelleğe almak için kullanılır.
 */

// Önbellek anahtarı oluşturma
const createCacheKey = (shopId: string, prefix: string = 'products') => {
  return `${prefix}_${shopId}`;
};

// IndexedDB desteğini kontrol et
const isIndexedDBSupported = () => {
  return typeof window !== 'undefined' && 'indexedDB' in window;
};

// localStorage desteğini kontrol et
const isLocalStorageSupported = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const testKey = '__test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};

/**
 * IndexedDB veritabanını aç
 */
const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBSupported()) {
      reject(new Error('IndexedDB desteklenmiyor'));
      return;
    }

    const request = indexedDB.open('DolphinManagerCache', 1);

    request.onerror = (event) => {
      console.error('IndexedDB açılırken hata:', event);
      reject(new Error('IndexedDB açılamadı'));
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Ürünler için object store oluştur
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'key' });
      }
      
      // Metadata için object store oluştur
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };
  });
};

/**
 * IndexedDB'ye veri kaydet
 */
const saveToIndexedDB = async (storeName: string, key: string, data: any): Promise<void> => {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.put({
        key,
        data,
        timestamp: Date.now()
      });
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event) => {
        console.error(`IndexedDB ${storeName} kaydetme hatası:`, event);
        reject(new Error('Veri kaydedilemedi'));
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('IndexedDB kaydetme hatası:', error);
    throw error;
  }
};

/**
 * IndexedDB'den veri yükle
 */
const loadFromIndexedDB = async (storeName: string, key: string): Promise<any> => {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = (event) => {
        console.error(`IndexedDB ${storeName} yükleme hatası:`, event);
        reject(new Error('Veri yüklenemedi'));
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('IndexedDB yükleme hatası:', error);
    throw error;
  }
};

/**
 * localStorage'a veri kaydet (küçük veriler için)
 */
const saveToLocalStorage = (key: string, data: any): void => {
  try {
    if (!isLocalStorageSupported()) {
      throw new Error('localStorage desteklenmiyor');
    }
    
    const item = {
      data,
      timestamp: Date.now()
    };
    
    localStorage.setItem(key, JSON.stringify(item));
  } catch (error) {
    console.error('localStorage kaydetme hatası:', error);
    throw error;
  }
};

/**
 * localStorage'dan veri yükle (küçük veriler için)
 */
const loadFromLocalStorage = (key: string): any => {
  try {
    if (!isLocalStorageSupported()) {
      throw new Error('localStorage desteklenmiyor');
    }
    
    const item = localStorage.getItem(key);
    if (!item) {
      return null;
    }
    
    return JSON.parse(item).data;
  } catch (error) {
    console.error('localStorage yükleme hatası:', error);
    // Hatalı veriyi temizle
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // Yoksay
    }
    return null;
  }
};

/**
 * Önbelleğe veri kaydet
 * Büyük veriler için IndexedDB, küçük veriler için localStorage kullanır
 * 
 * @param shopId Mağaza ID'si
 * @param data Kaydedilecek veri
 * @param prefix Önbellek anahtarı öneki (varsayılan: 'products')
 */
export const saveToCache = async (shopId: string, data: any, prefix: string = 'products'): Promise<void> => {
  const key = createCacheKey(shopId, prefix);
  
  try {
    // Veri boyutunu kontrol et
    const dataSize = JSON.stringify(data).length;
    
    // 5MB'dan büyük veriler için IndexedDB kullan
    if (dataSize > 5 * 1024 * 1024) {
      if (isIndexedDBSupported()) {
        await saveToIndexedDB('products', key, data);
        
        // Metadata'yı localStorage'a kaydet
        if (isLocalStorageSupported()) {
          saveToLocalStorage(`${key}_meta`, {
            size: dataSize,
            count: Array.isArray(data) ? data.length : 1,
            timestamp: Date.now(),
            storage: 'indexeddb'
          });
        }
        
        console.log(`✅ ${data.length || 1} öğe IndexedDB'ye kaydedildi (${(dataSize / 1024 / 1024).toFixed(2)}MB)`);
        return;
      }
    }
    
    // Küçük veriler veya IndexedDB desteklenmiyorsa localStorage kullan
    if (isLocalStorageSupported()) {
      saveToLocalStorage(key, data);
      console.log(`✅ ${data.length || 1} öğe localStorage'a kaydedildi (${(dataSize / 1024).toFixed(2)}KB)`);
      return;
    }
    
    throw new Error('Önbellek desteği bulunamadı');
  } catch (error) {
    console.error('Önbelleğe kaydetme hatası:', error);
    throw error;
  }
};

/**
 * Önbellekten veri yükle
 * 
 * @param shopId Mağaza ID'si
 * @param maxAge Maksimum önbellek yaşı (milisaniye)
 * @param prefix Önbellek anahtarı öneki (varsayılan: 'products')
 * @returns Önbellekteki veri veya null
 */
export const loadFromCache = async (shopId: string, maxAge: number = 3600000, prefix: string = 'products'): Promise<any> => {
  const key = createCacheKey(shopId, prefix);
  
  try {
    // Önce metadata'yı kontrol et
    let metadata = null;
    if (isLocalStorageSupported()) {
      metadata = loadFromLocalStorage(`${key}_meta`);
    }
    
    // IndexedDB'de saklanan büyük veri varsa
    if (metadata && metadata.storage === 'indexeddb' && isIndexedDBSupported()) {
      // Önbellek yaşını kontrol et
      if (Date.now() - metadata.timestamp > maxAge) {
        console.log('⚠️ Önbellek süresi doldu, yeni veri yükleniyor...');
        return null;
      }
      
      const data = await loadFromIndexedDB('products', key);
      if (data) {
        console.log(`✅ ${data.length || 1} öğe IndexedDB'den yüklendi (${(metadata.size / 1024 / 1024).toFixed(2)}MB)`);
        return data;
      }
    }
    
    // localStorage'dan yüklemeyi dene
    if (isLocalStorageSupported()) {
      const item = localStorage.getItem(key);
      if (item) {
        try {
          const parsed = JSON.parse(item);
          
          // Önbellek yaşını kontrol et
          if (Date.now() - parsed.timestamp > maxAge) {
            console.log('⚠️ Önbellek süresi doldu, yeni veri yükleniyor...');
            return null;
          }
          
          console.log(`✅ ${parsed.data.length || 1} öğe localStorage'dan yüklendi`);
          return parsed.data;
        } catch (e) {
          console.error('localStorage veri ayrıştırma hatası:', e);
          localStorage.removeItem(key);
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Önbellekten yükleme hatası:', error);
    return null;
  }
};

/**
 * Önbelleği temizle
 * 
 * @param shopId Mağaza ID'si (belirtilmezse tüm önbellek temizlenir)
 * @param prefix Önbellek anahtarı öneki (varsayılan: 'products')
 */
export const clearCache = async (shopId?: string, prefix: string = 'products'): Promise<void> => {
  try {
    // Belirli bir mağaza için önbelleği temizle
    if (shopId) {
      const key = createCacheKey(shopId, prefix);
      
      // localStorage'dan temizle
      if (isLocalStorageSupported()) {
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}_meta`);
      }
      
      // IndexedDB'den temizle
      if (isIndexedDBSupported()) {
        try {
          const db = await openDatabase();
          const transaction = db.transaction('products', 'readwrite');
          const store = transaction.objectStore('products');
          
          store.delete(key);
          
          transaction.oncomplete = () => {
            db.close();
          };
        } catch (e) {
          console.error('IndexedDB temizleme hatası:', e);
        }
      }
      
      console.log(`✅ ${shopId} mağazası için önbellek temizlendi`);
      return;
    }
    
    // Tüm önbelleği temizle
    if (isLocalStorageSupported()) {
      // localStorage'dan products_ ile başlayan tüm anahtarları temizle
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`${prefix}_`)) {
          localStorage.removeItem(key);
        }
      });
    }
    
    // IndexedDB'yi temizle
    if (isIndexedDBSupported()) {
      try {
        const db = await openDatabase();
        const transaction = db.transaction('products', 'readwrite');
        const store = transaction.objectStore('products');
        
        store.clear();
        
        transaction.oncomplete = () => {
          db.close();
        };
      } catch (e) {
        console.error('IndexedDB temizleme hatası:', e);
      }
    }
    
    console.log('✅ Tüm önbellek temizlendi');
  } catch (error) {
    console.error('Önbellek temizleme hatası:', error);
    throw error;
  }
};

/**
 * Önbellek durumunu kontrol et
 * 
 * @param shopId Mağaza ID'si
 * @param prefix Önbellek anahtarı öneki (varsayılan: 'products')
 * @returns Önbellek durumu
 */
export const getCacheStatus = async (shopId: string, prefix: string = 'products'): Promise<{
  exists: boolean;
  storage: 'indexeddb' | 'localstorage' | null;
  size: number;
  count: number;
  timestamp: number;
  age: number;
}> => {
  const key = createCacheKey(shopId, prefix);
  const defaultStatus = {
    exists: false,
    storage: null as 'indexeddb' | 'localstorage' | null,
    size: 0,
    count: 0,
    timestamp: 0,
    age: 0
  };
  
  try {
    // Önce metadata'yı kontrol et
    if (isLocalStorageSupported()) {
      const metadata = loadFromLocalStorage(`${key}_meta`);
      if (metadata) {
        return {
          exists: true,
          storage: 'indexeddb',
          size: metadata.size || 0,
          count: metadata.count || 0,
          timestamp: metadata.timestamp || 0,
          age: Date.now() - (metadata.timestamp || 0)
        };
      }
      
      // localStorage'dan kontrol et
      const item = localStorage.getItem(key);
      if (item) {
        try {
          const parsed = JSON.parse(item);
          const data = parsed.data;
          const size = item.length;
          
          return {
            exists: true,
            storage: 'localstorage',
            size,
            count: Array.isArray(data) ? data.length : 1,
            timestamp: parsed.timestamp || 0,
            age: Date.now() - (parsed.timestamp || 0)
          };
        } catch (e) {
          console.error('localStorage veri ayrıştırma hatası:', e);
        }
      }
    }
    
    // IndexedDB'den kontrol et
    if (isIndexedDBSupported()) {
      try {
        const data = await loadFromIndexedDB('products', key);
        if (data) {
          const size = JSON.stringify(data).length;
          
          return {
            exists: true,
            storage: 'indexeddb',
            size,
            count: Array.isArray(data) ? data.length : 1,
            timestamp: Date.now(), // Gerçek timestamp bilinmiyor
            age: 0 // Gerçek yaş bilinmiyor
          };
        }
      } catch (e) {
        console.error('IndexedDB kontrol hatası:', e);
      }
    }
    
    return defaultStatus;
  } catch (error) {
    console.error('Önbellek durumu kontrol hatası:', error);
    return defaultStatus;
  }
};