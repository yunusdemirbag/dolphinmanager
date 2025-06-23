'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package, Clock, Play, Pause, Settings as SettingsIcon, Store, CheckCircle, AlertCircle } from "lucide-react";
import ProductFormModal from "@/components/ProductFormModal";

interface QueueItem {
  id: string;
  product_data: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

interface ConnectedStore {
  shop_id: number;
  shop_name: string;
  user_id: string;
  connected_at: Date;
  last_sync_at: Date;
  is_active: boolean;
}

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState('products');
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const [queueInterval, setQueueInterval] = useState<NodeJS.Timeout | null>(null);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats>({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0
  });
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [connectedStore, setConnectedStore] = useState<ConnectedStore | null>(null);
  const [isLoadingStore, setIsLoadingStore] = useState(true);
  const [currentDate] = useState<Date>(new Date());
  const [products, setProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Bağlı mağaza bilgilerini yükle
  const fetchConnectedStore = async () => {
    setIsLoadingStore(true);
    try {
      const mockUserId = 'local-user-123'; // In real app, get from auth
      const response = await fetch(`/api/store/firebase?user_id=${mockUserId}`);
      if (response.ok) {
        const data = await response.json();
        setConnectedStore({
          ...data.store,
          connected_at: new Date(data.store.connected_at),
          last_sync_at: new Date(data.store.last_sync_at)
        });
      } else {
        // Mağaza bağlantısı yoksa, mock mağaza verisi kullan
        setConnectedStore({
          shop_id: 12345678,
          shop_name: "CyberDecorArt",
          user_id: "1007541496",
          connected_at: new Date(),
          last_sync_at: new Date(),
          is_active: true
        });
      }
    } catch (error) {
      console.error('Mağaza bilgileri yüklenirken hata:', error);
      // Hata durumunda da mock mağaza verisi kullan
      setConnectedStore({
        shop_id: 12345678,
        shop_name: "CyberDecorArt",
        user_id: "1007541496",
        connected_at: new Date(),
        last_sync_at: new Date(),
        is_active: true
      });
    } finally {
      setIsLoadingStore(false);
    }
  };

  // Ürünleri yükle
  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try {
      // Mock API yerine gerçek API'yi kullan
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
        console.log('Alınan ürünler:', data.products?.length || 0);
      } else {
        const errorData = await response.json();
        console.error('Ürünler yüklenirken API hatası:', errorData);
        setProducts([]);
      }
    } catch (error) {
      console.error('Ürünler yüklenirken hata:', error);
      setProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Kuyruk verilerini yükle
  const fetchQueue = async () => {
    setIsLoadingQueue(true);
    try {
      const response = await fetch('/api/queue');
      if (response.ok) {
        const data = await response.json();
        setQueueItems(data.items || []);
        setQueueStats(data.stats || {
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0
        });
      }
    } catch (error) {
      console.error('Kuyruk yüklenirken hata:', error);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  useEffect(() => {
    fetchConnectedStore(); // Load store info on mount
    fetchProducts(); // Load products on mount
    
    if (activeTab === 'queue') {
      fetchQueue();
    }
  }, [activeTab]);

  // Queue worker'ı başlat/durdur
  const toggleQueue = async () => {
    if (isQueueRunning) {
      // Durdur
      if (queueInterval) {
        clearInterval(queueInterval);
        setQueueInterval(null);
      }
      setIsQueueRunning(false);
    } else {
      // Başlat
      setIsQueueRunning(true);
      const interval = setInterval(async () => {
        try {
          const response = await fetch('/api/queue/worker', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'start' })
          });
          
          const result = await response.json();
          console.log('Queue worker result:', result);
          
          // Kuyruk verilerini güncelle
          fetchQueue();
          
          // Kuyruktaki ürün yoksa dur
          if (!result.hasItems) {
            if (queueInterval) clearInterval(queueInterval);
            setIsQueueRunning(false);
            setQueueInterval(null);
          }
        } catch (error) {
          console.error('Queue worker error:', error);
        }
      }, 20000); // 20 saniyede bir çalıştır
      
      setQueueInterval(interval);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (queueInterval) {
        clearInterval(queueInterval);
      }
    };
  }, [queueInterval]);

  const tabs = [
    { id: 'products', label: 'Ürünler', icon: Package },
    { id: 'queue', label: 'Kuyruktaki Ürünler', icon: Clock },
    { id: 'auto-add', label: 'Otomatik Ürün Ekleme', icon: Plus },
  ];

  const renderProducts = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Ürünler</h2>
          <p className="text-gray-600">Etsy&apos;e yüklenmiş veya taslak ürünleriniz</p>
        </div>
        <Button onClick={() => setIsProductFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Yeni Ürün Ekle
        </Button>
      </div>
      
      {isLoadingProducts ? (
        <Card className="p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-2"></div>
            <p className="text-gray-600">Ürünler yükleniyor...</p>
          </div>
        </Card>
      ) : products.length === 0 ? (
        <Card className="p-4">
          <div className="text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Henüz ürün eklenmemiş</p>
            <p className="text-sm">İlk ürününüzü eklemek için yukarıdaki butona tıklayın</p>
          </div>
        </Card>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {products.map(product => (
            <Card key={product.listing_id} className="overflow-hidden">
              <div className="aspect-square relative bg-gray-100">
                {product.images && product.images.length > 0 && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={product.images[0]?.url_570xN || product.images[0]?.url_fullxfull} 
                    alt={product.title}
                    className="object-cover w-full h-full"
                  />
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-medium truncate">{product.title}</h3>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-600">
                    {product.state || 'active'}
                  </span>
                  <span className="font-semibold">
                    {product.price?.currency_code || '$'}{' '}
                    {product.price?.amount && product.price?.divisor 
                      ? (product.price.amount / product.price.divisor).toFixed(2) 
                      : '0.00'}
                  </span>
                </div>
                <div className="mt-4 flex justify-between">
                  <Button variant="outline" size="sm">
                    Düzenle
                  </Button>
                  <Button variant="outline" size="sm">
                    Kuyruğa Ekle
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderQueue = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Kuyruk Yönetimi</h2>
          <p className="text-gray-600">Etsy&apos;e yüklenmeyi bekleyen ürünler</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <SettingsIcon className="w-4 h-4 mr-2" />
            Ayarlar
          </Button>
          <Button 
            variant={isQueueRunning ? "destructive" : "default"}
            onClick={toggleQueue}
          >
            {isQueueRunning ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Durdur
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Başlat
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Kuyruk İstatistikleri */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{queueStats.pending}</div>
            <div className="text-sm text-gray-600">Beklemede</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{queueStats.processing}</div>
            <div className="text-sm text-gray-600">İşleniyor</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{queueStats.completed}</div>
            <div className="text-sm text-gray-600">Tamamlandı</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{queueStats.failed}</div>
            <div className="text-sm text-gray-600">Başarısız</div>
          </div>
        </Card>
      </div>

      {/* Kuyruk Listesi */}
      <div className="space-y-3">
        {isLoadingQueue ? (
          <Card className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-2"></div>
              <p className="text-gray-600">Kuyruk yükleniyor...</p>
            </div>
          </Card>
        ) : queueItems.length === 0 ? (
          <Card className="p-4">
            <div className="text-center text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Kuyrukta ürün bulunmuyor</p>
              <p className="text-sm">Ürün ekleme formundan &ldquo;Kuyruğa Ekle&rdquo; butonunu kullanın</p>
            </div>
          </Card>
        ) : (
          queueItems.map((item) => (
            <Card 
              key={item.id} 
              className={`p-4 ${
                item.status === 'processing' ? 'border-yellow-200 bg-yellow-50' :
                item.status === 'completed' ? 'border-green-200 bg-green-50' :
                item.status === 'failed' ? 'border-red-200 bg-red-50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                  <div>
                    <h3 className="font-medium">{item.product_data?.title || 'Başlıksız Ürün'}</h3>
                    <p className="text-sm text-gray-600">
                      Eklendi: {new Date(item.created_at).toLocaleString('tr-TR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    item.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                    item.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                    item.status === 'completed' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {item.status === 'pending' ? 'Beklemede' :
                     item.status === 'processing' ? 'İşleniyor' :
                     item.status === 'completed' ? 'Tamamlandı' : 'Başarısız'}
                  </span>
                  {item.status === 'processing' && (
                    <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <Button variant="outline" size="sm">
                    Önizle
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {isQueueRunning && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-800 font-medium">Kuyruk işleniyor... (1/4 ürün)</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderAutoAdd = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Otomatik Ürün Ekleme</h2>
        <p className="text-gray-600">Toplu olarak ürün ekleme sistemi</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Klasör Seçimi</CardTitle>
          <CardDescription>
            Görseller ve kaynaklar klasörlerini seçin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Görseller Klasörü</label>
            <Button variant="outline" className="w-full justify-start">
              Klasör Seç
            </Button>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Kaynaklar Klasörü</label>
            <Button variant="outline" className="w-full justify-start">
              Klasör Seç
            </Button>
          </div>
          <Button className="w-full" disabled>
            Otomatik Ürün Ekleme İşlemini Başlat
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-black">Ürünler</h1>
        <p className="text-gray-600">Ürünlerinizi yönetin ve Etsy&apos;e yükleyin</p>
      </div>

      {/* Store Connection Status */}
      <Card className={`${
        connectedStore ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'
      }`}>
        <CardContent className="p-4">
          {isLoadingStore ? (
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
              <span className="text-gray-600">Mağaza durumu kontrol ediliyor...</span>
            </div>
          ) : connectedStore ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <span className="font-medium text-green-800">
                    Etsy mağazası bağlı: {connectedStore.shop_name}
                  </span>
                  <p className="text-sm text-green-600">
                    Son senkronizasyon: {new Date(connectedStore.last_sync_at).toLocaleString('tr-TR')}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-green-600">ID: {connectedStore.shop_id}</span>
                <Button variant="outline" size="sm" onClick={fetchConnectedStore}>
                  Yenile
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <div>
                  <span className="font-medium text-orange-800">
                    Etsy mağazası bağlı değil
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={fetchConnectedStore}>
                  Kontrol Et
                </Button>
                <Button size="sm">
                  <Store className="w-4 h-4 mr-2" />
                  Mağaza Bağla
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div>
        {activeTab === 'products' && renderProducts()}
        {activeTab === 'queue' && renderQueue()}
        {activeTab === 'auto-add' && renderAutoAdd()}
      </div>

      <ProductFormModal 
        isOpen={isProductFormOpen} 
        onClose={() => setIsProductFormOpen(false)} 
      />
    </div>
  );
}