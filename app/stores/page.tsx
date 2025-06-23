'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store, Link as LinkIcon, RefreshCw, Unlink, Loader2 } from "lucide-react";

export default function StoresPage() {
  const [connectedStore, setConnectedStore] = useState<{shopName: string, shopId: string} | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // URL'den success parametresini kontrol et
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    
    if (success === 'connected') {
      // Bağlantı başarılı mesajı göster
      setTimeout(() => {
        window.history.replaceState({}, '', '/stores');
      }, 3000);
    }
    
    // Firebase'den mağaza bilgisini kontrol et
    checkConnectedStore();
  }, []);

  const checkConnectedStore = async () => {
    try {
      // Etsy mağaza bilgisini Firebase'den kontrol et
      const response = await fetch('/api/etsy/status');
      if (response.ok) {
        const data = await response.json();
        if (data.isConnected) {
          setConnectedStore({
            shopName: data.shopName,
            shopId: data.shopId
          });
        }
      }
    } catch (error) {
      console.error('Mağaza bilgisi kontrol edilemedi:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectEtsy = async () => {
    setIsConnecting(true);
    try {
      window.location.href = '/api/etsy/auth';
    } catch (error) {
      console.error('Etsy bağlantı hatası:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connectedStore) return;
    
    setIsDisconnecting(true);
    try {
      const response = await fetch('/api/etsy/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shop_id: connectedStore.shopId }),
      });

      if (response.ok) {
        setConnectedStore(null);
      } else {
        console.error('Failed to disconnect the store.');
        // Burada kullanıcıya bir hata mesajı gösterebilirsiniz.
      }
    } catch (error) {
      console.error('Error disconnecting store:', error);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleRefreshToken = async () => {
    // Token yenileme
    console.log('Token yenileniyor...');
  };

  if (connectedStore) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-black">Mağazalar</h1>
          <p className="text-gray-600">Bağlı Etsy mağazanızı yönetin</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Store className="w-8 h-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">{connectedStore.shopName}</CardTitle>
                  <CardDescription>Etsy Mağazası</CardDescription>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleRefreshToken}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Token Yenile
                </Button>
                <Button variant="destructive" onClick={handleDisconnect} disabled={isDisconnecting}>
                  {isDisconnecting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Unlink className="w-4 h-4 mr-2" />
                  )}
                  {isDisconnecting ? 'Kesiliyor...' : 'Bağlantıyı Kes'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-black">156</div>
                <div className="text-sm text-gray-600">Toplam Ürün</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-black">42</div>
                <div className="text-sm text-gray-600">Aktif Listing</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-black">$1,234</div>
                <div className="text-sm text-gray-600">Bu Ay Satış</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-black">Mağazalar</h1>
          <p className="text-gray-600">Mağaza durumu kontrol ediliyor...</p>
        </div>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-black">Mağazalar</h1>
        <p className="text-gray-600">Etsy mağazanızı bağlayın ve yönetmeye başlayın</p>
      </div>

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
            <Button 
              className="w-full" 
              onClick={handleConnectEtsy}
              disabled={isConnecting}
            >
              <LinkIcon className="w-4 h-4 mr-2" />
              {isConnecting ? 'Bağlanıyor...' : 'Etsy ile Bağlan'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}