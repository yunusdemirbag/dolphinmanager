import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store } from '@/types/store';
import { ShopAnalytics } from '@/types/analytics';
import { useStoreAnalytics } from '@/hooks/useStoreAnalytics';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CompactMetrics } from '@/components/MetricsGrid';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Store as StoreIcon, Trash2, RefreshCw, CheckCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import Image from 'next/image';

interface StoreCardProps {
  store: Store;
  onStoreSwitch: (store: Store) => Promise<void>;
  onStoreDisconnect: (store: Store) => Promise<void>;
  isLoading?: string | null;
}

export function StoreCard({ store, onStoreSwitch, onStoreDisconnect, isLoading }: StoreCardProps) {
  const { analytics, isLoading: analyticsLoading, refreshAnalytics } = useStoreAnalytics(store.id);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const router = useRouter();

  const handleStoreSwitch = async () => {
    if (store.is_active || isLoading || isSwitching) return;
    
    setIsSwitching(true);
    try {
      await onStoreSwitch(store);
      // Başarılı geçiş sonrası ürünler sayfasına yönlendir
      setTimeout(() => {
        router.push('/products');
      }, 1000);
    } catch (error) {
      console.error('Mağaza geçiş hatası:', error);
    } finally {
      setIsSwitching(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await onStoreDisconnect(store);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const getStatusBadge = () => {
    // Mağaza bağlantısı kontrolü
    const isDisconnected = store.is_connected === false || store.disconnected_at;
    const hasNoToken = store.hasValidToken === false;
    
    if (isDisconnected) {
      return <Badge variant="secondary">Bağlantı Kesildi</Badge>;
    }
    if (hasNoToken) {
      return <Badge variant="destructive">Token Hatası</Badge>;
    }
    if (store.is_active) {
      return <Badge variant="default" className="bg-green-500">Aktif</Badge>;
    }
    return <Badge variant="outline">Bağlı</Badge>;
  };

  const getActionButtons = () => {
    const isDisconnected = store.is_connected === false || store.disconnected_at;
    const hasNoToken = store.hasValidToken === false;
    
    if (isDisconnected || hasNoToken) {
      return (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {/* TODO: Reconnect logic */}}
            className="flex-1"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Yeniden Bağla
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-red-600 hover:bg-red-50"
                disabled={isDisconnecting}
              >
                {isDisconnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Mağaza Bağlantısını Kes</AlertDialogTitle>
                <AlertDialogDescription>
                  <strong>{store.shop_name}</strong> mağazasının bağlantısını kaldırmak istediğinizden emin misiniz?
                  <br /><br />
                  Bu işlem sadece API token'larını silecek. Ürünler ve analytics verileriniz Firebase'de korunacak.
                  <br />
                  Tekrar bağlandığınızda verilerinizden devam edebilirsiniz.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-gray-100 hover:bg-gray-200 text-gray-800">İptal</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDisconnect}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Bağlantıyı Kes
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    }

    if (store.is_active) {
      return (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" disabled>
            <CheckCircle className="w-4 h-4 mr-1" />
            Aktif Mağaza
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-red-600 hover:bg-red-50"
                disabled={isDisconnecting}
              >
                {isDisconnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Aktif Mağaza Bağlantısını Kes</AlertDialogTitle>
                <AlertDialogDescription>
                  <strong>{store.shop_name}</strong> aktif mağazanızın bağlantısını kesmek istediğinizden emin misiniz? 
                  <br /><br />
                  Bu işlem sadece API token'larını silecek. Ürünler ve analytics verileriniz Firebase'de korunacak. 
                  Tekrar bağlandığınızda verilerinizden devam edebilirsiniz.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-gray-100 hover:bg-gray-200 text-gray-800">İptal</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDisconnect}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Bağlantıyı Kes
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    }

    // Passive store
    return (
      <div className="flex gap-2">
        <Button
          onClick={handleStoreSwitch}
          disabled={isSwitching || isLoading === store.id || hasNoToken}
          className="flex-1 group transition-all duration-300 hover:scale-105 bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:shadow-xl"
          size="sm"
        >
          {isSwitching || isLoading === store.id ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {isSwitching ? 'Ürünler Yükleniyor...' : 'Geçiş Yapılıyor...'}
            </>
          ) : (
            <>
              Bu Mağazaya Geç
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-red-600 hover:bg-red-50"
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mağaza Bağlantısını Kes</AlertDialogTitle>
              <AlertDialogDescription>
                <strong>{store.shop_name}</strong> mağazasının bağlantısını kesmek istediğinizden emin misiniz?
                <br /><br />
                Bu işlem sadece API token'larını silecek. Ürünler ve analytics verileriniz Firebase'de korunacak. 
                Tekrar bağlandığınızda verilerinizden devam edebilirsiniz.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDisconnect}
                className="bg-red-600 hover:bg-red-700"
              >
                Bağlantıyı Kes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  };

  return (
    <Card className={`p-6 space-y-4 transition-all duration-200 hover:shadow-md ${
      store.is_active ? 'ring-2 ring-green-500 bg-green-50' : ''
    }`}>
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          {store.shop_icon_url ? (
            <div className="relative w-12 h-12 rounded-full overflow-hidden">
              <Image 
                src={store.shop_icon_url} 
                alt={store.shop_name}
                width={48}
                height={48}
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center">
              <span className="text-xl font-bold text-white">
                {store.shop_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          
          <div>
            <h3 className="text-lg font-semibold">{store.shop_name}</h3>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge()}
              {!store.hasValidToken && (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700">Performans Metrikleri</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshAnalytics}
            disabled={analyticsLoading}
            className="h-6 px-2 text-xs"
          >
            <RefreshCw className={`w-3 h-3 ${analyticsLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        <CompactMetrics 
          analytics={analytics} 
          isLoading={analyticsLoading}
        />
      </div>

      {/* Footer Info */}
      <div className="space-y-2 text-sm text-gray-600 border-t pt-3">
        <div className="flex justify-between">
          <span>Son Senkronizasyon:</span>
          <span>{new Date(store.last_sync_at).toLocaleDateString('tr-TR')}</span>
        </div>
        {store.disconnected_at && (
          <div className="flex justify-between text-red-600">
            <span>Bağlantı Kesildi:</span>
            <span>{new Date(store.disconnected_at).toLocaleDateString('tr-TR')}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-2">
        {getActionButtons()}
      </div>
    </Card>
  );
}