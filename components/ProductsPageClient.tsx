'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package, Clock, Play, Pause, Settings as SettingsIcon, Image, Loader2 } from "lucide-react";
import ProductFormModal from "@/components/ProductFormModal";

// Assuming these interfaces are defined somewhere accessible, e.g., in a types file.
// For now, let's define them here.
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

interface ProductsPageClientProps {
    initialProducts: any[];
    initialNextCursor: string | null;
    userId: string;
}

export function ProductsPageClient({ initialProducts, initialNextCursor, userId }: ProductsPageClientProps) {
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
  const [products, setProducts] = useState<any[]>(initialProducts);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [hasMoreProducts, setHasMoreProducts] = useState(!!initialNextCursor);

  const fetchMoreProducts = useCallback(async () => {
    if (!nextCursor || isLoadingProducts) return;
    
    setIsLoadingProducts(true);
    try {
      // This is a new API route we'll need to create to specifically handle pagination
      const response = await fetch(`/api/products/paginate?user_id=${userId}&cursor=${nextCursor}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(prev => [...prev, ...data.products]);
        setNextCursor(data.nextCursor);
        setHasMoreProducts(!!data.nextCursor);
      } else {
        console.error("Failed to fetch more products");
        setHasMoreProducts(false);
      }
    } catch (error) {
      console.error("Error fetching more products:", error);
      setHasMoreProducts(false);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [nextCursor, isLoadingProducts, userId]);


  // Placeholder for queue fetching logic
  const fetchQueue = async () => { console.log("Fetching queue..."); };
  const toggleQueue = async () => { console.log("Toggling queue..."); };

  useEffect(() => {
    if (activeTab === 'queue') {
      fetchQueue();
    }
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (queueInterval) clearInterval(queueInterval);
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
      
      {products.length === 0 ? (
        <Card className="p-4">
          <div className="text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Henüz ürün bulunamadı</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map(product => (
              <Card key={product.listing_id || product.id} className="overflow-hidden">
                <div className="aspect-square relative bg-gray-100">
                  {product.images && product.images.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={product.images[0]?.url_570xN || product.images[0]?.url_fullxfull} 
                      alt={product.title}
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        console.error("Resim yüklenirken hata:", e);
                        // Hata durumunda yedek resim göster
                        e.currentTarget.src = "/placeholder-image.svg";
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Image className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-medium truncate">{product.title}</h3>
                  <div className="flex items-center justify-between text-sm text-gray-500 mt-2">
                    <span>{product.quantity} Adet</span>
                    <span className="font-semibold">
                      {product.price && typeof product.price === 'number' 
                        ? `${product.price.toFixed(2)} ${product.currency_code || 'USD'}` 
                        : product.price?.amount 
                          ? `${(product.price.amount / product.price.divisor).toFixed(2)} ${product.price?.currency_code}` 
                          : 'N/A'
                      }
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {hasMoreProducts && (
            <div className="text-center mt-6">
              <Button onClick={fetchMoreProducts} disabled={isLoadingProducts}>
                {isLoadingProducts ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Yükleniyor...</>
                ) : 'Daha Fazla Yükle'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderQueue = () => <div>Kuyruk özelliği yakında...</div>;
  const renderAutoAdd = () => <div>Otomatik ekleme özelliği yakında...</div>;

  return (
    <>
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

      <div className="mt-6">
        {activeTab === 'products' && renderProducts()}
        {activeTab === 'queue' && renderQueue()}
        {activeTab === 'auto-add' && renderAutoAdd()}
      </div>

      <ProductFormModal 
        isOpen={isProductFormOpen} 
        onClose={() => setIsProductFormOpen(false)} 
      />
    </>
  );
} 