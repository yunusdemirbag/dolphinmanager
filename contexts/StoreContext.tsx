'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Store } from '@/types/store';

interface StoreContextType {
  // Aktif mağaza
  activeStore: Store | null;
  
  // Tüm mağazalar
  allStores: Store[];
  
  // Mağaza değiştirme (tek tuşla!)
  switchStore: (store: Store) => Promise<void>;
  
  // Mağaza kaldırma
  disconnectStore: (store: Store) => Promise<void>;
  
  // Mağaza yeniden bağlama
  reconnectStore: (store: Store) => Promise<void>;
  
  // Yükleme durumu
  isLoading: boolean;
  switchingStoreId: string | null;
  
  // Mağaza yenileme
  refreshStores: () => Promise<void>;
  
  // Analytics refresh
  refreshAllAnalytics: () => Promise<void>;
  
  // Hızlı erişim
  hasMultipleStores: boolean;
  
  // Error handling
  error: string | null;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

interface StoreProviderProps {
  children: ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  const [activeStore, setActiveStore] = useState<Store | null>(null);
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [switchingStoreId, setSwitchingStoreId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mağazaları yükle
  const loadStores = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔄 Mağazalar yükleniyor...');
      
      const response = await fetch('/api/store/list');
      const data = await response.json();
      
      if (data.success) {
        // Sadece bağlı mağazaları al
        const connectedStores = data.stores.filter((s: Store) => s.is_connected !== false);
        console.log(`🏪 Context'te mağaza durumu:`, {
          toplam: data.stores.length,
          bağlı: connectedStores.length,
          mağazalar: connectedStores.map(s => `${s.shop_name} (${s.is_connected ? 'bağlı' : 'kesildi'})`)
        });
        setAllStores(connectedStores);
        
        // Aktif mağazayı bul
        const activeStoreFromApi = connectedStores.find((s: Store) => s.is_active);
        if (activeStoreFromApi) {
          setActiveStore(activeStoreFromApi);
          localStorage.setItem('activeStoreId', activeStoreFromApi.id);
          console.log('✅ Aktif mağaza:', activeStoreFromApi.shop_name);
        } else if (connectedStores.length > 0) {
          // Aktif mağaza yoksa ilkini aktif yap
          const firstStore = connectedStores[0];
          setActiveStore(firstStore);
          localStorage.setItem('activeStoreId', firstStore.id);
          console.log('🔄 İlk mağaza aktif yapıldı:', firstStore.shop_name);
        } else {
          setActiveStore(null);
          localStorage.removeItem('activeStoreId');
        }
      } else {
        setError(data.error || 'Mağaza listesi alınamadı');
        console.error('❌ Mağaza listesi alınamadı:', data.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      setError(errorMessage);
      console.error('❌ Mağaza yükleme hatası:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mağaza değiştir (GERÇEK GEÇİŞ!)
  const switchStore = async (store: Store) => {
    try {
      setSwitchingStoreId(store.id);
      setError(null);
      
      console.log(`🔄 Mağaza değiştiriliyor: ${store.shop_name}`);
      
      // Backend'e mağaza geçişi bildir
      const response = await fetch('/api/etsy/stores/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          shopId: store.id,
          userId: 'local-user-123'
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Local state güncelle
        setActiveStore(store);
        setAllStores(prev => prev.map(s => ({
          ...s,
          is_active: s.id === store.id
        })));
        localStorage.setItem('activeStoreId', store.id);
        
        console.log(`✅ ${store.shop_name} mağazasına geçildi`);
        
        // Tüm sayfalardaki veriyi yenile
        await refreshAllData();
      } else {
        throw new Error(result.error || 'Mağaza geçişi başarısız');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Mağaza geçişi hatası';
      setError(errorMessage);
      console.error('❌ Mağaza geçiş hatası:', error);
    } finally {
      setSwitchingStoreId(null);
    }
  };

  // Mağaza kaldır (Soft Delete)
  const disconnectStore = async (store: Store) => {
    try {
      setError(null);
      
      console.log(`🔌 Mağaza kaldırılıyor: ${store.shop_name}`);
      
      const response = await fetch('/api/store/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          shopId: store.id,
          userId: store.user_id,
          reason: 'user_request'
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ ${store.shop_name} mağazası kaldırıldı`);
        
        // Mağaza listesini güncelle
        await loadStores();
        
        // Eğer yeni aktif mağaza varsa ona geç
        if (result.newActiveStore) {
          setActiveStore(result.newActiveStore);
          localStorage.setItem('activeStoreId', result.newActiveStore.id);
        }
      } else {
        throw new Error(result.error || 'Mağaza kaldırılamadı');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Mağaza kaldırma hatası';
      setError(errorMessage);
      console.error('❌ Mağaza kaldırma hatası:', error);
      throw error;
    }
  };

  // Mağaza yeniden bağla
  const reconnectStore = async (store: Store) => {
    try {
      setError(null);
      
      console.log(`🔌 Mağaza yeniden bağlanıyor: ${store.shop_name}`);
      
      const response = await fetch('/api/store/reconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          shopId: store.id,
          userId: store.user_id,
          makeActive: true
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ ${store.shop_name} mağazası yeniden bağlandı`);
        
        // Mağaza listesini güncelle
        await loadStores();
      } else {
        if (result.requiresOAuth) {
          // OAuth gerekiyorsa kullanıcıyı yönlendir
          window.location.href = '/api/etsy/auth';
          return;
        }
        throw new Error(result.error || 'Mağaza yeniden bağlanamadı');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Mağaza yeniden bağlama hatası';
      setError(errorMessage);
      console.error('❌ Mağaza yeniden bağlama hatası:', error);
      throw error;
    }
  };

  // Tüm veriyi yenile (mağaza geçişinde)
  const refreshAllData = async () => {
    try {
      console.log('🔄 Tüm veriler yenileniyor...');
      
      // Analytics'leri yenile
      if (activeStore) {
        await fetch('/api/store/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shopId: activeStore.id })
        });
      }
      
      console.log('✅ Veriler yenilendi');
    } catch (error) {
      console.warn('⚠️ Veri yenileme hatası:', error);
    }
  };

  // Tüm analytics yenile
  const refreshAllAnalytics = async () => {
    try {
      console.log('📊 Tüm analytics yenileniyor...');
      
      await Promise.all(
        allStores.map(store => 
          fetch('/api/store/analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shopId: store.id })
          })
        )
      );
      
      console.log('✅ Analytics yenilendi');
    } catch (error) {
      console.warn('⚠️ Analytics yenileme hatası:', error);
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
    disconnectStore,
    reconnectStore,
    isLoading,
    switchingStoreId,
    refreshStores,
    refreshAllAnalytics,
    hasMultipleStores: allStores.length > 1,
    error,
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