'use client';

import { useStore } from '@/contexts/StoreContext';
import { StoreCard } from '@/components/StoreCard';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Store } from '@/types/store';
import { Plus, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';

interface StoreClientPageProps {
  initialStores: Store[];
}

export function StoreClientPage({ initialStores }: StoreClientPageProps) {
  const { 
    allStores, 
    switchingStoreId, 
    switchStore,
    isLoading, 
    refreshStores, 
    disconnectStore,
    refreshAllAnalytics,
    error 
  } = useStore();
  const { toast } = useToast();

  // Mağaza geçişi
  const handleStoreSwitch = async (store: Store) => {
    try {
      await switchStore(store);
      toast({
        title: 'Başarılı',
        description: `${store.shop_name} mağazasına geçildi`,
      });
    } catch (error: any) {
      toast({
        title: 'Hata',
        description: error.message || 'Mağaza geçişi sırasında bir hata oluştu',
        variant: 'destructive',
      });
    }
  };

  // Mağaza kaldırma
  const handleStoreDisconnect = async (store: Store) => {
    try {
      await disconnectStore(store);
      toast({
        title: 'Başarılı',
        description: `${store.shop_name} mağazası kaldırıldı`,
      });
    } catch (error: any) {
      toast({
        title: 'Hata',
        description: error.message || 'Mağaza kaldırma sırasında bir hata oluştu',
        variant: 'destructive',
      });
    }
  };

  // Yeni mağaza bağlama
  const handleConnect = async () => {
    try {
      const response = await fetch('/api/etsy/connect');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'OAuth URL oluşturulamadı');
      }
      
      window.location.href = data.url;
    } catch (error: any) {
      toast({
        title: 'Hata',
        description: error.message || 'Etsy bağlantısı başlatılamadı',
        variant: 'destructive',
      });
    }
  };

  // Analytics yenileme
  const handleRefreshAnalytics = async () => {
    try {
      await refreshAllAnalytics();
      toast({
        title: 'Başarılı',
        description: 'Tüm mağaza analytics\'leri güncellendi',
      });
    } catch (error: any) {
      toast({
        title: 'Uyarı',
        description: 'Analytics güncellenirken bazı hatalar oluştu',
        variant: 'destructive',
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-black">Mağazalar</h1>
            <p className="text-gray-600">Etsy mağazalarınızı yönetin</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-96 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-black">Mağazalar</h1>
          <p className="text-gray-600">
            {allStores.length > 0 
              ? `${allStores.length} mağaza bağlı - Performans metriklerini görüntüleyin`
              : 'Etsy mağazalarınızı bağlayın ve yönetin'
            }
          </p>
        </div>
        
        <div className="flex gap-3">
          {allStores.length > 0 && (
            <>
              <Button 
                variant="outline" 
                onClick={handleRefreshAnalytics}
                disabled={isLoading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Analytics Yenile
              </Button>
              
              <Button 
                variant="outline" 
                onClick={refreshStores}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Mağazaları Yenile
              </Button>
            </>
          )}
          
          <Button onClick={handleConnect} disabled={isLoading}>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Mağaza Bağla
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <div>
            <p className="text-red-800 font-medium">Hata oluştu</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshStores}
            className="ml-auto"
          >
            Tekrar Dene
          </Button>
        </div>
      )}

      {/* Store Cards Grid */}
      {allStores.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {allStores.map((store) => (
            <StoreCard
              key={store.id}
              store={store}
              onStoreSwitch={handleStoreSwitch}
              onStoreDisconnect={handleStoreDisconnect}
              isLoading={switchingStoreId}
            />
          ))}
        </div>
      ) : (
        // Empty State
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-12 h-12 text-orange-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Henüz bağlı mağaza yok
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Etsy mağazanızı bağlayarak ürünlerinizi yönetmeye, analytics verilerini görüntülemeye ve daha fazlasını yapmaya başlayın.
          </p>
          <Button onClick={handleConnect} size="lg">
            <Plus className="w-5 h-5 mr-2" />
            İlk Mağazanızı Bağlayın
          </Button>
        </div>
      )}
    </div>
  );
}