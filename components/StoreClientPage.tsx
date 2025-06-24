'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Store, Link as LinkIcon, RefreshCw, Unlink, Loader2 } from 'lucide-react';
import { EtsyStore } from '@/lib/firebase-sync';

interface StoreClientPageProps {
  store: (EtsyStore & { total_products?: number; active_listings?: number; monthly_sales?: string; }) | null;
}

export function StoreClientPage({ store }: StoreClientPageProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    // URL'den success parametresini kontrol et
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const refresh = urlParams.get('refresh');
    
    if (success === 'connected' && refresh === 'true') {
      // Bağlantı başarılı, sayfayı temiz URL ile yenile
      const timeoutId = setTimeout(() => {
        window.location.href = '/stores';
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, []);

  const handleConnectEtsy = async () => {
    setIsConnecting(true);
    window.location.href = '/api/etsy/auth';
  };

  const handleDisconnect = async () => {
    if (!store) return;
    
    setIsDisconnecting(true);
    try {
      const response = await fetch('/api/etsy/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          shop_id: store.shop_id,
          user_id: store.user_id
        }),
      });

      if (response.ok) {
        window.location.reload();
      } else {
        console.error('Failed to disconnect the store.');
        alert('Mağaza bağlantısı kesilemedi. Lütfen tekrar deneyin.');
      }
    } catch (error) {
      console.error('Error disconnecting store:', error);
      alert('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshToken = async () => {
    if (!store) return;
    
    setIsRefreshing(true);
    console.log('Token yenileniyor...');
    
    try {
      const response = await fetch('/api/etsy/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shop_id: store.shop_id,
          user_id: 'local-user-123'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('✅ Token başarıyla yenilendi!');
        console.log('Token yenilendi, yeni süre:', result.expires_at);
      } else {
        alert(`❌ Token yenilenemedi: ${result.error}`);
      }
    } catch (error) {
      console.error('Token yenileme hatası:', error);
      alert('❌ Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (store) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-orange-500 rounded-lg flex items-center justify-center">
                <Store className="w-8 h-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">{store.shop_name}</CardTitle>
                <CardDescription>Etsy Mağazası</CardDescription>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleRefreshToken} disabled={isRefreshing}>
                {isRefreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                {isRefreshing ? 'Yenileniyor...' : 'Token Yenile'}
              </Button>
              <Button variant="destructive" onClick={handleDisconnect} disabled={isDisconnecting}>
                {isDisconnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Unlink className="w-4 h-4 mr-2" />}
                {isDisconnecting ? 'Kesiliyor...' : 'Bağlantıyı Kes'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-black">{store.total_products || 0}</div>
              <div className="text-sm text-gray-600">Toplam Ürün</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-black">{store.active_listings || 0}</div>
              <div className="text-sm text-gray-600">Aktif Listing</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-black">${store.monthly_sales || '0.00'}</div>
              <div className="text-sm text-gray-600">Bu Ay Satış</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If no store is connected
  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-orange-500 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <CardTitle>Etsy Mağazası Bağlayın</CardTitle>
          <CardDescription>
            Etsy mağazanızı bağlayarak ürünlerinizi yönetmeye başlayın
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={handleConnectEtsy} disabled={isConnecting}>
            <LinkIcon className="w-4 h-4 mr-2" />
            {isConnecting ? 'Bağlanıyor...' : 'Etsy ile Bağlan'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 