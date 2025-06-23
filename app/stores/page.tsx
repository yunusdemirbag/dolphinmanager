'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store, Link as LinkIcon, RefreshCw, Unlink } from "lucide-react";

export default function StoresPage() {
  const [connectedStore, setConnectedStore] = useState<{shop_name: string} | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

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
    // Mağaza bağlantısını kesme
    setConnectedStore(null);
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
                  <CardTitle className="text-xl">{connectedStore.shop_name}</CardTitle>
                  <CardDescription>Etsy Mağazası</CardDescription>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleRefreshToken}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Token Yenile
                </Button>
                <Button variant="destructive" onClick={handleDisconnect}>
                  <Unlink className="w-4 h-4 mr-2" />
                  Bağlantıyı Kes
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