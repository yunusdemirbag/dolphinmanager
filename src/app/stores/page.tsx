'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import EtsyConnection from '@/components/etsy-connection';
import { useSearchParams } from 'next/navigation';

interface EtsyStore {
  shop_id: number;
  shop_name: string;
  title: string;
  url: string;
  image_url_760x100?: string;
}

export default function StoresPage() {
  const { user, loading: authLoading } = useAuth();
  const [stores, setStores] = useState<EtsyStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    // URL parametrelerini kontrol et
    const urlError = searchParams?.get('error');
    const urlSuccess = searchParams?.get('success');
    
    if (urlError) {
      setError(decodeURIComponent(urlError));
    }
    
    if (urlSuccess) {
      // Başarılı bağlantı durumunda sayfayı yenile
      fetchStores();
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchStores();
    }
  }, [user, authLoading]);

  const fetchStores = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching Etsy stores...');
      const token = await user.getIdToken();
      
      const response = await fetch('/api/etsy/stores', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      console.log('Stores API response:', data);
      
      if (data.error) {
        if (data.code === 'NO_STORES') {
          console.log('No stores found for user');
          setStores([]);
        } else {
          throw new Error(data.error);
        }
      } else if (data.stores) {
        setStores(data.stores);
      }
    } catch (err) {
      console.error('Error fetching stores:', err);
      setError(err instanceof Error ? err.message : 'Mağaza bilgileri alınamadı');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
          Bu sayfayı görüntülemek için giriş yapmalısınız.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Etsy Mağazalarım</h1>
      
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : stores.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((store) => (
            <div key={store.shop_id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              {store.image_url_760x100 ? (
                <div className="h-24 bg-gray-100 relative">
                  <img 
                    src={store.image_url_760x100} 
                    alt={`${store.shop_name} banner`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-24 bg-gradient-to-r from-orange-100 to-orange-200 flex items-center justify-center">
                  <h3 className="text-xl font-medium text-orange-800">{store.shop_name}</h3>
                </div>
              )}
              
              <div className="p-4">
                <h3 className="font-semibold text-lg">{store.title || store.shop_name}</h3>
                <p className="text-sm text-gray-500 mb-4">Shop ID: {store.shop_id}</p>
                
                <a 
                  href={store.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Etsy'de Görüntüle
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="max-w-md mx-auto">
          <EtsyConnection />
        </div>
      )}
    </div>
  );
}