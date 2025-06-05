'use client';

import useSWR from 'swr';
import { useState } from 'react';

// Arayüzde kullanılacak mağaza verisinin tip tanımı
interface ConnectedStore {
  id: string; // etsy_stores tablosundaki ID
  shop_id: number;
  shop_name: string;
  is_token_valid: boolean;
  token_expires_at: string;
  sync_enabled: boolean;
}

// SWR için standart fetcher fonksiyonu
const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    const error = new Error('Veri çekme işlemi başarısız oldu.');
    throw error;
  }
  return res.json();
});

export default function TokenManager() {
  const { data: stores, error, isLoading, mutate } = useSWR<ConnectedStore[]>('/api/etsy/connections', fetcher);
  const [processingStoreId, setProcessingStoreId] = useState<string | null>(null);

  // Bağlantıyı kesme fonksiyonu
  const handleDisconnect = async (storeId: string, shopName: string) => {
    if (!confirm(`'${shopName}' adlı mağazanın bağlantısını kesmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) return;
    setProcessingStoreId(storeId);
    try {
      const response = await fetch(`/api/etsy/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId }),
      });
      if (!response.ok) {
        throw new Error('Bağlantı kesilemedi.');
      }
      mutate();
      alert(`'${shopName}' mağaza bağlantısı başarıyla kesildi.`);
    } catch (err) {
      console.error(err);
      alert('Bir hata oluştu ve bağlantı kesilemedi.');
    } finally {
      setProcessingStoreId(null);
    }
  };

  // Yeniden bağlanma fonksiyonu
  const handleReconnect = (storeId: string) => {
    setProcessingStoreId(storeId);
    window.location.href = `/api/auth/etsy/connect?reconnect_store_id=${storeId}`;
  };

  // Senkronizasyon ayarını değiştirme fonksiyonu
  const handleToggleSync = async (storeId: string, currentSyncState: boolean) => {
    setProcessingStoreId(storeId);
    try {
      await fetch(`/api/etsy/toggle-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, syncEnabled: !currentSyncState }),
      });
      mutate();
    } catch (err) {
      console.error(err);
      alert('Senkronizasyon ayarı değiştirilemedi.');
    } finally {
      setProcessingStoreId(null);
    }
  };

  const renderContent = () => {
    if (isLoading) return <div className="p-6 text-center text-gray-400 animate-pulse">Bağlı mağazalar yükleniyor...</div>;
    if (error) return <div className="p-6 text-center text-red-400">Hata: Mağazalar yüklenemedi. Lütfen sayfayı yenileyin.</div>;
    if (!stores || stores.length === 0) {
      return (
        <div className="p-8 bg-gray-800 rounded-lg text-center border-2 border-dashed border-gray-700">
          <h4 className="text-lg font-semibold text-white">Hoş Geldiniz!</h4>
          <p className="mt-2 text-gray-400">Henüz bağlı bir Etsy mağazanız yok. Başlamak için ilk mağazanızı bağlayın.</p>
          <a href="/api/auth/etsy/connect" className="mt-4 inline-block px-6 py-2.5 bg-green-600 hover:bg-green-700 rounded-md text-white font-semibold transition-transform hover:scale-105">
            Yeni Mağaza Bağla
          </a>
        </div>
      );
    }
    return (
      <ul className="divide-y divide-gray-700">
        {stores.map((store) => {
          const isProcessing = processingStoreId === store.id;
          return (
            <li key={store.id} className={`p-4 transition-colors ${isProcessing ? 'bg-gray-700/80 opacity-50' : 'hover:bg-gray-700/50'}`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                <div className="mb-4 sm:mb-0">
                  <p className="font-semibold text-white text-lg">{store.shop_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`h-2 w-2 rounded-full ${store.is_token_valid ? 'bg-green-400' : 'bg-red-400'}`}></span>
                    <p className="text-sm text-gray-400">
                      {store.is_token_valid ? 'Bağlı' : 'Bağlantı Sorunu'}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Token Geçerliliği: {new Date(store.token_expires_at).toLocaleString('tr-TR')}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button 
                    onClick={() => handleToggleSync(store.id, store.sync_enabled)}
                    disabled={isProcessing}
                    className={`px-3 py-1 text-sm rounded transition-colors disabled:opacity-50 ${store.sync_enabled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-500'}`}
                  >
                    {store.sync_enabled ? 'Sync: Açık' : 'Sync: Kapalı'}
                  </button>
                  {!store.is_token_valid && (
                    <button onClick={() => handleReconnect(store.id)} disabled={isProcessing} className="px-3 py-1 text-sm bg-yellow-600 hover:bg-yellow-700 rounded disabled:opacity-50">Yeniden Bağlan</button>
                  )}
                  <button onClick={() => handleDisconnect(store.id, store.shop_name)} disabled={isProcessing} className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded disabled:opacity-50">Bağlantıyı Kes</button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="p-4 flex justify-between items-center border-b border-gray-700">
        <h3 className="text-lg font-semibold">Bağlı Mağazalar</h3>
        {stores && stores.length > 0 && (
           <a href="/api/auth/etsy/connect" className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 rounded-md text-white font-semibold">+ Yeni Bağla</a>
        )}
      </div>
      {renderContent()}
    </div>
  );
} 