'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { EtsyStore } from '@/lib/firebase-sync';

interface StoreContextType {
  // Aktif mağaza
  activeStore: EtsyStore | null;
  
  // Tüm mağazalar
  allStores: EtsyStore[];
  
  // Mağaza değiştirme (tek tuşla!)
  switchStore: (store: EtsyStore) => Promise<void>;
  
  // Yükleme durumu
  isLoading: boolean;
  
  // Mağaza yenileme
  refreshStores: () => Promise<void>;
  
  // Hızlı erişim
  hasMultipleStores: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

interface StoreProviderProps {
  children: ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  const [activeStore, setActiveStore] = useState<EtsyStore | null>(null);
  const [allStores, setAllStores] = useState<EtsyStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mağazaları yükle
  const loadStores = async () => {
    try {
      setIsLoading(true);
      
      console.log('🔄 Mağazalar yükleniyor...');
      
      const response = await fetch('/api/store/list');
      const data = await response.json();
      
      if (data.success) {
        setAllStores(data.stores);
        console.log(`📋 ${data.stores.length} mağaza yüklendi`);
        
        // LocalStorage'dan aktif mağaza ID'sini al
        const savedActiveStoreId = localStorage.getItem('activeStoreId');
        
        if (savedActiveStoreId) {
          const savedStore = data.stores.find((s: EtsyStore) => s.shop_id.toString() === savedActiveStoreId);
          if (savedStore) {
            setActiveStore(savedStore);
            console.log('✅ Kayıtlı aktif mağaza:', savedStore.shop_name);
          } else if (data.stores.length > 0) {
            // Kayıtlı mağaza bulunamadıysa ilkini seç
            setActiveStore(data.stores[0]);
            localStorage.setItem('activeStoreId', data.stores[0].shop_id.toString());
            console.log('🔄 İlk mağaza aktif yapıldı:', data.stores[0].shop_name);
          }
        } else if (data.stores.length > 0) {
          // Hiç kayıt yoksa ilkini seç
          setActiveStore(data.stores[0]);
          localStorage.setItem('activeStoreId', data.stores[0].shop_id.toString());
          console.log('🎯 İlk kez mağaza seçildi:', data.stores[0].shop_name);
        }
      } else {
        console.error('❌ Mağaza listesi alınamadı:', data.error);
      }
    } catch (error) {
      console.error('❌ Mağaza yükleme hatası:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mağaza değiştir (TEK TUŞLA!)
  const switchStore = async (store: EtsyStore) => {
    try {
      console.log(`🔄 Mağaza değiştiriliyor: ${store.shop_name}`);
      
      // Önce UI'ı güncelle (hızlı görünüm için)
      setActiveStore(store);
      localStorage.setItem('activeStoreId', store.shop_id.toString());
      
      // API'ye bildir
      const response = await fetch('/api/store/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          shopId: store.shop_id.toString(),
          userId: 'local-user-123'
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ ${store.shop_name} mağazasına geçildi`);
        
        // Sayfayı yenile (temiz başlangıç için)
        window.location.reload();
      } else {
        console.error('❌ Mağaza geçiş hatası:', result.error);
      }
    } catch (error) {
      console.error('❌ Mağaza geçiş hatası:', error);
    }
  };

  // Mağazaları yenile
  const refreshStores = async () => {
    await loadStores();
  };

  // Component mount olduğunda mağazaları yükle
  useEffect(() => {
    loadStores();
  }, []);

  const value: StoreContextType = {
    activeStore,
    allStores,
    switchStore,
    isLoading,
    refreshStores,
    hasMultipleStores: allStores.length > 1,
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

// Hook to use store context
export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}

// Utility hook to get active store ID
export function useActiveStoreId(): string | null {
  const { activeStore } = useStore();
  return activeStore?.shop_id?.toString() || null;
}