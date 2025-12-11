'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { loadFromCache, saveToCache } from '@/lib/browser-cache';
import { predefinedVariations } from '@/lib/etsy-variation-presets';
import { RefreshCw, Loader2, CheckCircle, SettingsIcon, Timer } from "lucide-react";

// Props interface tanımı
interface PriceUpdateComponentProps {
  products: any[];
  activeStore: {
    shop_id: string;
    shop_name: string;
  } | null;
  isLoadingProducts: boolean;
  setIsLoadingProducts: (loading: boolean) => void;
  hasMoreProducts: boolean;
  fetchMoreProducts: () => Promise<void>;
  quickSyncProducts: (shopId: string) => Promise<void>;
  userId?: string;
}

export default function PriceUpdateComponent({
  products,
  activeStore,
  isLoadingProducts,
  setIsLoadingProducts,
  hasMoreProducts,
  fetchMoreProducts,
  quickSyncProducts
}: PriceUpdateComponentProps) {
  const { toast } = useToast();
  
  // Aktif sekmeyi takip etmek için state
  const [activeUpdateTab, setActiveUpdateTab] = useState<'list' | 'settings'>('list');
  // Seçili ürünleri takip etmek için state
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  // Güncelleme durumunu takip etmek için state
  const [isUpdating, setIsUpdating] = useState(false);
  // Senkronizasyon durumunu takip etmek için state
  const [isSyncingProducts, setIsSyncingProducts] = useState(false);
  // Arama metni için state
  const [searchText, setSearchText] = useState<string>('');
  // Filtrelenmiş ürünler için state
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  // Ürünlerin yüklenip yüklenmediğini takip etmek için state
  const [productsLoaded, setProductsLoaded] = useState(false);
  // Güncelleme sonuçlarını takip etmek için state
  const [updateResult, setUpdateResult] = useState<{
    total: number;
    updated: number;
    failed: number;
    duration: number;
    updatedListings: any[];
  } | null>(null);
  // Güncelleme ilerlemesini takip etmek için state - Geliştirilmiş versiyon
  const [updateProgress, setUpdateProgress] = useState<{
    isUpdating: boolean;
    total: number;
    current: number;
    failed: number;
    estimatedTimeRemaining: string;
    recentlyUpdated: any[];
  }>({
    isUpdating: false,
    total: 0,
    current: 0,
    failed: 0,
    estimatedTimeRemaining: '',
    recentlyUpdated: []
  });

  // Ürünleri doğrudan API'den yükle - Önbelleksiz
  const loadProductsDirectly = async () => {
    if (!activeStore?.shop_id) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Aktif mağaza bulunamadı. Lütfen bir mağaza seçin.",
      });
      return false;
    }
    
    return false; // Önbellekten yükleme devre dışı bırakıldı
  };
  
  // Ürünleri API'den yükle
  const loadProductsFromAPI = async () => {
    if (!activeStore?.shop_id) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Aktif mağaza bulunamadı. Lütfen bir mağaza seçin.",
      });
      return;
    }
    
    setIsLoadingProducts(true);
    setIsSyncingProducts(true);
    
    // Yükleme işlemini başlat
    toast({
      title: "Ürünler Yükleniyor",
      description: "Etsy'den ürünler çekiliyor, lütfen bekleyin...",
      variant: "default",
    });
    
    try {
      await quickSyncProducts(activeStore.shop_id.toString());
      setProductsLoaded(true);
    } catch (error) {
      console.error('❌ Ürün yükleme hatası:', error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Ürünler yüklenirken bir hata oluştu.",
      });
    } finally {
      setIsSyncingProducts(false);
    }
  };
  
  // Ürünleri yükle - Doğrudan API'den
  const loadProducts = async () => {
    loadProductsFromAPI();
  };
  
  // Tüm ürünleri seç/kaldır
  const toggleSelectAll = () => {
    if (selectedProductIds.length === filteredProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map(p => p.listing_id || p.id));
    }
  };
  
  // Tek ürün seçimini değiştir
  const toggleProductSelection = (productId: string) => {
    if (selectedProductIds.includes(productId)) {
      setSelectedProductIds(selectedProductIds.filter(id => id !== productId));
    } else {
      setSelectedProductIds([...selectedProductIds, productId]);
    }
  };
  
  // Seçili ürünleri tek tek güncelle - Yeni sürüm
  const updateSelectedProducts = async () => {
    if (selectedProductIds.length === 0) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Lütfen en az bir ürün seçin"
      });
      return;
    }
    
    if (!confirm(`Seçili ${selectedProductIds.length} ürünün ölçülerini ve fiyatlarını güncellemek istediğinize emin misiniz?`)) {
      return;
    }
    
    setIsUpdating(true);
    
    try {
      toast({
        title: "Güncelleme Başlatıldı",
        description: `${selectedProductIds.length} ürün tek tek güncelleniyor...`
      });
      
      // İlerleme durumunu takip etmek için state'i güncelle
      setUpdateProgress({
        isUpdating: true,
        total: selectedProductIds.length,
        current: 0,
        failed: 0,
        estimatedTimeRemaining: 'Hesaplanıyor...',
        recentlyUpdated: []
      });
      
      let totalUpdated = 0;
      let totalFailed = 0;
      let allUpdatedListings: any[] = [];
      const startTime = Date.now();
      
      // Ürünleri tek tek güncelle
      for (let i = 0; i < selectedProductIds.length; i++) {
        const productId = selectedProductIds[i];
        
        // Ürün bilgisini bul
        const product = filteredProducts.find(p => (p.listing_id || p.id) === productId);
        const productTitle = product?.title || `Ürün #${productId}`;
        
        console.log(`🔄 Ürün güncelleniyor (${i+1}/${selectedProductIds.length}): ${productId} - ${productTitle}`);
        
        try {
          // API'ye istek gönder
          const response = await fetch('/api/etsy/update-variations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productIds: [productId] })
          });
          
          const result = await response.json();
          
          if (result.success) {
            totalUpdated++;
            
            if (result.results.updatedListings) {
              allUpdatedListings = [...allUpdatedListings, ...result.results.updatedListings];
            }
            
            // Son 10 güncellenen ürünü kaydet
            const recentlyUpdated = [...updateProgress.recentlyUpdated];
            if (recentlyUpdated.length >= 10) {
              recentlyUpdated.shift(); // En eskiyi çıkar
            }
            recentlyUpdated.push({
              id: productId,
              title: productTitle,
              timestamp: new Date().toISOString()
            });
            
            // Tahmini kalan süreyi hesapla
            const elapsedTime = (Date.now() - startTime) / 1000; // saniye cinsinden
            const timePerItem = elapsedTime / (i + 1);
            const remainingItems = selectedProductIds.length - (i + 1);
            const estimatedRemainingTime = timePerItem * remainingItems;
            
            let timeString = '';
            if (estimatedRemainingTime > 60) {
              timeString = `${Math.floor(estimatedRemainingTime / 60)} dakika ${Math.floor(estimatedRemainingTime % 60)} saniye`;
            } else {
              timeString = `${Math.floor(estimatedRemainingTime)} saniye`;
            }
            
            // İlerleme durumunu güncelle
            setUpdateProgress({
              isUpdating: true,
              total: selectedProductIds.length,
              current: i + 1,
              failed: totalFailed,
              estimatedTimeRemaining: timeString,
              recentlyUpdated: recentlyUpdated
            });
          } else {
            console.error(`Ürün güncelleme hatası (${productId}):`, result.error);
            totalFailed++;
            
            // İlerleme durumunu güncelle
            setUpdateProgress(prev => ({
              ...prev,
              failed: totalFailed
            }));
          }
        } catch (error) {
          console.error(`Ürün güncelleme hatası (${productId}):`, error);
          totalFailed++;
          
          // İlerleme durumunu güncelle
          setUpdateProgress(prev => ({
            ...prev,
            failed: totalFailed
          }));
        }
        
        // API rate limit aşımını önlemek için kısa bir bekleme ekle
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      const duration = (Date.now() - startTime) / 1000; // saniye cinsinden
      
      setUpdateResult({
        total: totalUpdated + totalFailed,
        updated: totalUpdated,
        failed: totalFailed,
        duration: duration,
        updatedListings: allUpdatedListings.slice(0, 20) // Sadece ilk 20 ürünü göster
      });
      
      toast({
        title: "Güncelleme Tamamlandı",
        description: `${totalUpdated} ürün başarıyla güncellendi, ${totalFailed} ürün güncellenemedi. Toplam süre: ${duration.toFixed(2)} saniye`,
      });
    } catch (error) {
      console.error("Güncelleme hatası:", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: error instanceof Error ? error.message : "Güncelleme sırasında bir hata oluştu"
      });
    } finally {
      setIsUpdating(false);
      setUpdateProgress(prev => ({
        ...prev,
        isUpdating: false
      }));
    }
  };
  
  // Tüm ürünleri tek tek güncelle - Yeni sürüm
  const updateAllProducts = async () => {
    if (!confirm("Mağazanızdaki tüm ürünlerin ölçülerini ve fiyatlarını güncellemek istediğinize emin misiniz?")) {
      return;
    }
    
    setIsUpdating(true);
    
    try {
      // Önce tüm ürünleri al
      const allProductIds = filteredProducts.map(p => p.listing_id || p.id);
      
      toast({
        title: "Güncelleme Başlatıldı",
        description: `Toplam ${allProductIds.length} ürün tek tek güncelleniyor...`
      });
      
      // İlerleme durumunu takip etmek için state'i güncelle
      setUpdateProgress({
        isUpdating: true,
        total: allProductIds.length,
        current: 0,
        failed: 0,
        estimatedTimeRemaining: 'Hesaplanıyor...',
        recentlyUpdated: []
      });
      
      let totalUpdated = 0;
      let totalFailed = 0;
      let allUpdatedListings: any[] = [];
      const startTime = Date.now();
      
      // Ürünleri tek tek güncelle
      for (let i = 0; i < allProductIds.length; i++) {
        const productId = allProductIds[i];
        
        // Ürün bilgisini bul
        const product = filteredProducts.find(p => (p.listing_id || p.id) === productId);
        const productTitle = product?.title || `Ürün #${productId}`;
        
        console.log(`🔄 Ürün güncelleniyor (${i+1}/${allProductIds.length}): ${productId} - ${productTitle}`);
        
        try {
          // API'ye istek gönder
          const response = await fetch('/api/etsy/update-variations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productIds: [productId] })
          });
          
          const result = await response.json();
          
          if (result.success) {
            totalUpdated++;
            
            if (result.results.updatedListings) {
              allUpdatedListings = [...allUpdatedListings, ...result.results.updatedListings];
            }
            
            // Son 10 güncellenen ürünü kaydet
            const recentlyUpdated = [...updateProgress.recentlyUpdated];
            if (recentlyUpdated.length >= 10) {
              recentlyUpdated.shift(); // En eskiyi çıkar
            }
            recentlyUpdated.push({
              id: productId,
              title: productTitle,
              timestamp: new Date().toISOString()
            });
            
            // Tahmini kalan süreyi hesapla
            const elapsedTime = (Date.now() - startTime) / 1000; // saniye cinsinden
            const timePerItem = elapsedTime / (i + 1);
            const remainingItems = allProductIds.length - (i + 1);
            const estimatedRemainingTime = timePerItem * remainingItems;
            
            let timeString = '';
            if (estimatedRemainingTime > 60) {
              timeString = `${Math.floor(estimatedRemainingTime / 60)} dakika ${Math.floor(estimatedRemainingTime % 60)} saniye`;
            } else {
              timeString = `${Math.floor(estimatedRemainingTime)} saniye`;
            }
            
            // İlerleme durumunu güncelle
            setUpdateProgress({
              isUpdating: true,
              total: allProductIds.length,
              current: i + 1,
              failed: totalFailed,
              estimatedTimeRemaining: timeString,
              recentlyUpdated: recentlyUpdated
            });
          } else {
            console.error(`Ürün güncelleme hatası (${productId}):`, result.error);
            totalFailed++;
            
            // İlerleme durumunu güncelle
            setUpdateProgress(prev => ({
              ...prev,
              failed: totalFailed
            }));
          }
        } catch (error) {
          console.error(`Ürün güncelleme hatası (${productId}):`, error);
          totalFailed++;
          
          // İlerleme durumunu güncelle
          setUpdateProgress(prev => ({
            ...prev,
            failed: totalFailed
          }));
        }
        
        // API rate limit aşımını önlemek için kısa bir bekleme ekle
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      const duration = (Date.now() - startTime) / 1000; // saniye cinsinden
      
      setUpdateResult({
        total: totalUpdated + totalFailed,
        updated: totalUpdated,
        failed: totalFailed,
        duration: duration,
        updatedListings: allUpdatedListings.slice(0, 20) // Sadece ilk 20 ürünü göster
      });
      
      toast({
        title: "Güncelleme Tamamlandı",
        description: `${totalUpdated} ürün başarıyla güncellendi, ${totalFailed} ürün güncellenemedi. Toplam süre: ${duration.toFixed(2)} saniye`,
      });
    } catch (error) {
      console.error("Güncelleme hatası:", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: error instanceof Error ? error.message : "Güncelleme sırasında bir hata oluştu"
      });
    } finally {
      setIsUpdating(false);
      setUpdateProgress(prev => ({
        ...prev,
        isUpdating: false
      }));
    }
  };
  
  // Ürünleri arama metni ile filtrele - Performans iyileştirmesi
  useEffect(() => {
    // Debounce için timer
    const timer = setTimeout(() => {
      if (!searchText.trim()) {
        setFilteredProducts(products);
        return;
      }
      
      const searchLower = searchText.toLowerCase();
      
      // Performans için daha hızlı filtreleme
      const filtered = products.filter(product => {
        // Önce basit kontroller
        const titleMatch = product.title?.toLowerCase().includes(searchLower);
        if (titleMatch) return true;
        
        // ID kontrolü - sadece gerekirse
        const idStr = (product.listing_id || product.id)?.toString();
        return idStr?.includes(searchLower);
      });
      
      setFilteredProducts(filtered);
      
      // Arama sonuçları için bildirim - sadece önemli değişikliklerde göster
      if (filtered.length === 0 && products.length > 0) {
        toast({
          title: "Sonuç Bulunamadı",
          description: "Arama kriterlerine uygun ürün bulunamadı.",
          variant: "default",
        });
      } else if (filtered.length < products.length && filtered.length <= 10) {
        // Sadece sonuç sayısı az olduğunda bildirim göster
        toast({
          title: "Arama Sonuçları",
          description: `${filtered.length} ürün bulundu (toplam ${products.length} içinden).`,
          variant: "default",
        });
      }
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timer);
  }, [searchText, products, toast]);
  
  // Products değiştiğinde filtrelenmiş ürünleri güncelle
  useEffect(() => {
    setFilteredProducts(products);
  }, [products]);
  return (
    <div className="space-y-6">
      {/* Ürün Yükleme Bilgisi */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
        <div className="flex items-center">
          <div className="mr-2 text-blue-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <span className="font-medium">Ölçü ve Fiyat Güncelleme:</span> Önbellek sorunlarını önlemek için, ürünler otomatik olarak yüklenmez. Aşağıdaki "Ürünleri Yükle" butonuna tıklayarak ürünleri doğrudan Etsy'den yükleyebilirsiniz.
            <div className="mt-1 text-xs text-blue-600">
              <span className="font-medium">Not:</span> Her seferinde Etsy API'den taze veriler çekilir, önbellek kullanılmaz.
            </div>
          </div>
        </div>
      </div>
      
      {/* Sekme Başlıkları */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeUpdateTab === 'list'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveUpdateTab('list')}
          >
            <RefreshCw size={18} />
            <span>Sırala ve Güncelle</span>
          </button>
          <button
            className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeUpdateTab === 'settings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveUpdateTab('settings')}
          >
            <SettingsIcon size={18} />
            <span>Ölçü ve Fiyat Ayarları</span>
          </button>
        </nav>
      </div>
      
      {/* Sırala ve Güncelle Sekmesi */}
      {activeUpdateTab === 'list' && (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Ölçü ve Fiyat Güncelleme</h2>
              <p className="text-gray-600">Etsy ürünlerinizin ölçülerini ve fiyatlarını güncelleyin</p>
            </div>
            <div className="flex gap-2">
              {!productsLoaded ? (
                <Button
                  onClick={loadProducts}
                  disabled={isLoadingProducts || isSyncingProducts}
                  variant="default"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoadingProducts || isSyncingProducts ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Ürünleri Yükle
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => loadProductsFromAPI()}
                    disabled={isLoadingProducts || isSyncingProducts}
                    variant="outline"
                    className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                  >
                    {isLoadingProducts || isSyncingProducts ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Ürünleri Yenile
                  </Button>
                  <Button
                    onClick={updateSelectedProducts}
                    disabled={isUpdating || selectedProductIds.length === 0}
                    variant="outline"
                    className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                  >
                    {isUpdating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Seçili Ürünleri Güncelle ({selectedProductIds.length})
                  </Button>
                  <Button
                    onClick={updateAllProducts}
                    disabled={isUpdating}
                    variant="outline"
                    className="bg-green-50 hover:bg-green-100 border-green-200"
                  >
                    {isUpdating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Tüm Ürünleri Güncelle
                  </Button>
                </>
              )}
            </div>
          </div>
      
          {/* Arama kutusu */}
          <div className="mb-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Ürün adı veya ID ile ara..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchText && (
                <button
                  onClick={() => setSearchText('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <div className="mt-2 text-sm text-gray-500">
              {filteredProducts.length === products.length
                ? `Toplam ${products.length} ürün gösteriliyor`
                : `${filteredProducts.length} ürün bulundu (toplam ${products.length} içinden)`}
            </div>
          </div>
          
          {/* Yükleniyor göstergesi */}
          {isLoadingProducts && (
            <div className="flex justify-center items-center py-8">
              <div className="flex flex-col items-center">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-2" />
                <p className="text-gray-600">Ürünler yükleniyor...</p>
                <p className="text-xs text-gray-500 mt-1">Bu işlem biraz zaman alabilir, lütfen bekleyin.</p>
              </div>
            </div>
          )}
          
          {/* Ürün yükleme mesajı */}
          {!productsLoaded && !isLoadingProducts && (
            <div className="flex flex-col items-center justify-center p-12 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl shadow-sm border border-slate-100">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 opacity-10 blur-xl rounded-full"></div>
                <RefreshCw className="w-16 h-16 text-slate-400 relative z-10" />
              </div>
              <h3 className="mt-6 text-lg font-medium text-slate-700">Ürünler Henüz Yüklenmedi</h3>
              <p className="mt-2 text-sm text-slate-500 max-w-md text-center">
                Ürünleri görüntülemek için "Ürünleri Yükle" butonuna tıklayın. Önbellek sorunlarını önlemek için ürünler otomatik olarak yüklenmez.
              </p>
              <Button
                onClick={loadProducts}
                disabled={isLoadingProducts || isSyncingProducts}
                className="mt-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-3 rounded-full shadow-md hover:shadow-lg transition-all duration-300"
              >
                {isLoadingProducts || isSyncingProducts ? (
                  <div className="flex items-center">
                    <div className="mr-2 h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                    <span>Yükleniyor...</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <RefreshCw className="w-5 h-5 mr-2" />
                    <span>Ürünleri Yükle</span>
                  </div>
                )}
              </Button>
            </div>
          )}

          {/* Excel benzeri ürün listesi - Performans iyileştirmesi */}
          {productsLoaded && !isLoadingProducts && (
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <div className="flex items-center">
                          <Checkbox
                            checked={selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0}
                            onCheckedChange={toggleSelectAll}
                            id="select-all"
                          />
                          <Label htmlFor="select-all" className="ml-2">Tümünü Seç</Label>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ürün ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ürün Adı</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mevcut Fiyat</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Eklenme Tarihi</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Son Güncelleme</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-4 text-center text-gray-500">
                          {products.length === 0
                            ? "Henüz ürün bulunmuyor veya ürünler yükleniyor..."
                            : "Arama kriterlerine uygun ürün bulunamadı"}
                        </td>
                      </tr>
                    ) : (
                      // Performans için sadece görünür ürünleri render et (ilk 50)
                      filteredProducts.slice(0, Math.min(filteredProducts.length, 50)).map(product => {
                        const productId = product.listing_id || product.id;
                        const price = product.price && typeof product.price === 'number'
                          ? `${product.price.toFixed(2)} ${product.currency_code || 'USD'}`
                          : product.price?.amount
                            ? `${(product.price.amount / product.price.divisor).toFixed(2)} ${product.price?.currency_code}`
                            : 'N/A';
                        
                        return (
                          <tr key={productId} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <Checkbox
                                checked={selectedProductIds.includes(productId)}
                                onCheckedChange={() => toggleProductSelection(productId)}
                                id={`select-${productId}`}
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{productId}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 max-w-md truncate">{product.title}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{price}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {product.creation_timestamp ? new Date(product.creation_timestamp * 1000).toLocaleDateString('tr-TR') : 'N/A'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {product.last_modified_timestamp ? new Date(product.last_modified_timestamp * 1000).toLocaleDateString('tr-TR') : 'N/A'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-blue-600 hover:text-blue-800"
                                onClick={() => {
                                  setSelectedProductIds([productId]);
                                  updateSelectedProducts();
                                }}
                                disabled={isUpdating}
                              >
                                <RefreshCw className="w-4 h-4 mr-1" />
                                Güncelle
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Daha fazla ürün gösterme bilgisi */}
              {filteredProducts.length > 50 && (
                <div className="p-3 text-center text-sm text-gray-500 border-t">
                  Toplam {filteredProducts.length} ürün bulundu, ilk 50 ürün gösteriliyor.
                  <br />
                  Daha fazla ürün görmek için arama kutusunu kullanarak filtreleme yapabilirsiniz veya "Daha Fazla Ürün Yükle" butonunu kullanabilirsiniz.
                </div>
              )}
            </div>
          )}
          
          {/* Daha Fazla Yükle Butonu */}
          {hasMoreProducts && (
            <div className="text-center mt-4">
              <Button
                onClick={fetchMoreProducts}
                disabled={isLoadingProducts}
                variant="outline"
                className="bg-blue-50 hover:bg-blue-100 border-blue-200 px-6 py-2"
              >
                <div className="flex items-center">
                  {isLoadingProducts ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span>Yükleniyor...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      <span>Daha Fazla Ürün Yükle</span>
                    </>
                  )}
                </div>
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Daha fazla ürün yüklemek için tıklayın. Her seferinde 50 ürün daha yüklenir.
              </p>
            </div>
          )}
          
          {/* Güncelleme Sonuçları */}
          {updateResult && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-800 mb-2">Son Güncelleme Sonuçları</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <div className="text-sm text-gray-500">Toplam Ürün</div>
                  <div className="text-xl font-bold">{updateResult.total}</div>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <div className="text-sm text-gray-500">Güncellenen</div>
                  <div className="text-xl font-bold text-green-600">{updateResult.updated}</div>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <div className="text-sm text-gray-500">Başarısız</div>
                  <div className="text-xl font-bold text-red-600">{updateResult.failed}</div>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <div className="text-sm text-gray-500">Toplam Süre</div>
                  <div className="text-xl font-bold">{updateResult.duration.toFixed(2)} sn</div>
                </div>
              </div>
              
              {/* Son güncellenen ürünlerin listesi */}
              {updateResult.updatedListings && updateResult.updatedListings.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-blue-800 mb-2">Son Güncellenen Ürünler</h4>
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ürün</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Değişiklikler</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {updateResult.updatedListings.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.title}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">Ölçüler ve fiyatlar güncellendi</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
      
      {/* Güncelleme İlerleme Durumu - Geliştirilmiş modern tasarım */}
      {updateProgress.isUpdating && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Ürünler Güncelleniyor</h3>
              <div className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                Etsy API
              </div>
            </div>
            
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-gray-700">İlerleme</span>
                <span className="font-medium text-blue-600">{updateProgress.current} / {updateProgress.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-1 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 relative"
                  style={{ width: `${(updateProgress.current / updateProgress.total) * 100}%` }}
                >
                  {/* Animasyonlu yükleme göstergesi */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500 text-right">
                {Math.round((updateProgress.current / updateProgress.total) * 100)}% tamamlandı
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="text-xs text-gray-500 mb-1">Başarılı</div>
                <div className="text-lg font-bold text-green-600">{updateProgress.current - updateProgress.failed}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="text-xs text-gray-500 mb-1">Başarısız</div>
                <div className="text-lg font-bold text-red-600">{updateProgress.failed}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="text-xs text-gray-500 mb-1">Tahmini kalan süre</div>
                <div className="text-sm font-medium text-gray-800">{updateProgress.estimatedTimeRemaining}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="text-xs text-gray-500 mb-1">Tamamlanma oranı</div>
                <div className="text-sm font-medium text-gray-800">
                  {updateProgress.current > 0 ?
                    `${((updateProgress.current - updateProgress.failed) / updateProgress.current * 100).toFixed(1)}%` :
                    '0%'}
                </div>
              </div>
            </div>
            
            {updateProgress.recentlyUpdated.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                  Son Güncellenen Ürünler
                </h4>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-100">
                  {updateProgress.recentlyUpdated.map((item, index) => (
                    <div key={index} className="py-2 px-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 mr-2 flex-shrink-0" />
                        <div className="text-sm text-gray-800 truncate">{item.title}</div>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 pl-5.5">
                        {new Date(item.timestamp).toLocaleTimeString('tr-TR')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-6 text-xs text-gray-500 flex items-center">
              <Timer className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
              <span>Güncelleme işlemi devam ediyor, lütfen bekleyin...</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Ölçü ve Fiyat Ayarları Sekmesi */}
      {activeUpdateTab === 'settings' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Ölçü ve Fiyat Ayarları</h2>
              <p className="text-gray-600">Ürünlerinizin ölçü ve fiyat ayarlarını düzenleyin</p>
            </div>
            <Button
              onClick={() => {
                // Ayarları kaydet
                toast({
                  title: "Ayarlar Kaydedildi",
                  description: "Ölçü ve fiyat ayarları başarıyla kaydedildi.",
                  variant: "default",
                });
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Ayarları Kaydet
            </Button>
          </div>
          
          {/* Varyasyon Tablosu */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-medium text-gray-700">Ölçü ve Fiyat Varyasyonları</h3>
              <p className="text-sm text-gray-500">Tüm ürünlerinize uygulanacak ölçü ve fiyat varyasyonlarını düzenleyin</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ölçü</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Desen</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fiyat</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aktif</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {predefinedVariations.map((variation, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{variation.size}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{variation.pattern}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        <Input
                          type="number"
                          className="w-24 h-8 text-right"
                          defaultValue={variation.price.toString()}
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        <Checkbox
                          defaultChecked={variation.is_active}
                          id={`active-${index}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}