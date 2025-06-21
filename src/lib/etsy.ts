// Bu dosya, etsy-api.ts'den gerekli fonksiyonları export ediyor
import { 
  getEtsyStores as getEtsyStoresFromApi,
  EtsyStore,
  toggleCachedDataOnlyMode,
  getShopSections
} from './etsy-api';

// Etsy API'den mağaza bilgilerini getir
export async function getEtsyStores(userId: string, skipCache = false): Promise<EtsyStore[]> {
  return getEtsyStoresFromApi(userId, skipCache);
}

// Sadece önbellek kullanımını kontrol eden değişken
export let shouldUseOnlyCachedData = false;

// Sadece önbellek kullanımını değiştiren fonksiyon
export function setShouldUseOnlyCachedData(value: boolean): void {
  shouldUseOnlyCachedData = value;
  toggleCachedDataOnlyMode(value);
}

// Diğer gerekli fonksiyonları buradan re-export edebilirsiniz
export * from './etsy-api'; 