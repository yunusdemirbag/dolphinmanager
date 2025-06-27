'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Store } from '@/types/store';
import Image from 'next/image';

interface StoreClientPageProps {
  initialStores: Store[];
}

export function StoreClientPage({ initialStores }: StoreClientPageProps) {
  const [stores, setStores] = useState<Store[]>(initialStores);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [isUpdatingIcons, setIsUpdatingIcons] = useState(false);
  const { toast } = useToast();

  const handleStoreSwitch = async (shopId: string) => {
    try {
      setIsLoading(shopId);

      const response = await fetch('/api/etsy/stores/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shopId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Mağaza geçişi başarısız');
      }

      // Mağaza listesini güncelle
      setStores(prevStores =>
        prevStores.map(store => ({
          ...store,
          is_active: store.id === shopId
        }))
      );

      toast({
        title: 'Başarılı',
        description: 'Mağaza geçişi tamamlandı',
      });
    } catch (error: any) {
      toast({
        title: 'Hata',
        description: error.message || 'Mağaza geçişi sırasında bir hata oluştu',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleConnect = () => {
    // Etsy OAuth başlatma URL'sini oluştur
    const state = Math.random().toString(36).substring(7);
    const scope = 'listings_r listings_w';
    const redirectUri = process.env.NEXT_PUBLIC_ETSY_REDIRECT_URI;
    const clientId = process.env.NEXT_PUBLIC_ETSY_CLIENT_ID;

    const url = new URL('https://www.etsy.com/oauth/connect');
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('client_id', clientId!);
    url.searchParams.append('redirect_uri', redirectUri!);
    url.searchParams.append('scope', scope);
    url.searchParams.append('state', state);

    // Yeni pencerede aç
    window.location.href = url.toString();
  };

  const updateStoreIcons = async () => {
    try {
      setIsUpdatingIcons(true);
      
      const response = await fetch('/api/etsy/stores/update-icons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Mağaza ikonları güncellenemedi');
      }

      // Başarılı ikon güncellemeleri için mağaza listesini güncelle
      if (data.updatedStores && data.updatedStores.length > 0) {
        setStores(prevStores => 
          prevStores.map(store => {
            const updated = data.updatedStores.find((u: any) => u.id === store.id);
            if (updated) {
              return {
                ...store,
                shop_icon_url: updated.shop_icon_url
              };
            }
            return store;
          })
        );
      }

      toast({
        title: 'Başarılı',
        description: data.message || 'Mağaza ikonları güncellendi',
      });
    } catch (error: any) {
      toast({
        title: 'Hata',
        description: error.message || 'Mağaza ikonları güncellenirken bir hata oluştu',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingIcons(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-black">Mağazalar</h1>
          <p className="text-gray-600">Etsy mağazalarınızı yönetin</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={updateStoreIcons} 
            disabled={isUpdatingIcons || stores.length === 0}
          >
            {isUpdatingIcons ? 'Güncelleniyor...' : 'İkonları Güncelle'}
          </Button>
          <Button onClick={handleConnect}>
            Yeni Mağaza Bağla
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stores.map((store) => (
          <Card key={store.id} className="p-6 space-y-4">
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
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-xl font-bold text-gray-500">
                      {store.shop_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold">{store.shop_name}</h3>
                  <div className="space-x-2 mt-2">
                    {store.is_active && (
                      <Badge variant="default">Aktif</Badge>
                    )}
                    {!store.hasValidToken && (
                      <Badge variant="destructive">Token Hatası</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              {store.total_products !== undefined && (
                <p>Toplam Ürün: {store.total_products}</p>
              )}
              <p>Son Senkronizasyon: {new Date(store.last_sync_at).toLocaleString('tr-TR')}</p>
            </div>

            <div className="pt-4">
              {!store.is_active ? (
                <Button
                  onClick={() => handleStoreSwitch(store.id)}
                  disabled={isLoading === store.id || !store.hasValidToken}
                  className="w-full"
                >
                  {isLoading === store.id ? 'Geçiş Yapılıyor...' : 'Bu Mağazaya Geç'}
                </Button>
              ) : (
                <Button variant="outline" className="w-full" disabled>
                  Aktif Mağaza
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {stores.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Henüz bağlı mağaza yok</h3>
          <p className="mt-2 text-sm text-gray-600">
            Etsy mağazanızı bağlamak için yukarıdaki butonu kullanın
          </p>
        </div>
      )}
    </div>
  );
} 