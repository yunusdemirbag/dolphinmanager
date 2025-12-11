'use client';

// Hydration hatalarını önlemek için
import dynamic from 'next/dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import { loadFromCache, saveToCache } from '@/lib/browser-cache';
import { predefinedVariations } from '@/lib/etsy-variation-presets';
import { useStore } from '@/contexts/StoreContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package, Clock, Play, Pause, Settings as SettingsIcon, Image, Loader2, RotateCcw, Timer, CheckCircle, XCircle, Upload, Trash2, Edit3, Video, Trash, RefreshCw, Download, Settings } from "lucide-react";
import ProductFormModal from "@/components/ProductFormModal";
import AutoProductPanel from "@/components/AutoProductPanel";
import GelatoProductPanel from "@/components/GelatoProductPanel";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { IOSSwitch } from "@/components/ui/ios-switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
    store?: {
      shop_id: string;
      shop_name: string;
      last_sync_at: string;
      connected_at?: string | null;
      last_activated_at?: string | null;
      last_token_refresh?: string | null;
    } | null;
}

export default function ProductsPageClient({ initialProducts, initialNextCursor, userId, store }: ProductsPageClientProps) {
  const { activeStore } = useStore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('products');
  const [activeQueueTab, setActiveQueueTab] = useState('live'); // 'live' veya 'completed'
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
  
  // Ölçü ve fiyat güncelleme ilerleme durumu
  const [updateProgress, setUpdateProgress] = useState<{
    isUpdating: boolean;
    total: number;
    updated: number;
    failed: number;
    estimatedTimeRemaining: string;
    updatedListings: any[];
  }>({
    isUpdating: false,
    total: 0,
    updated: 0,
    failed: 0,
    estimatedTimeRemaining: '',
    updatedListings: []
  });
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [products, setProducts] = useState<any[]>(initialProducts || []);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [hasMoreProducts, setHasMoreProducts] = useState(!!initialNextCursor);
  const [currentShopId, setCurrentShopId] = useState<string | null>(null);
  const [isQuickSyncing, setIsQuickSyncing] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  
  // Queue management states
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isAutoProcessing, setIsAutoProcessing] = useState(false);
  const [processingDelay, setProcessingDelay] = useState(3);
  const [currentlyProcessing, setCurrentlyProcessing] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempEditValue, setTempEditValue] = useState<string>('');
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [editingMediaItemId, setEditingMediaItemId] = useState<string | null>(null);
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const editingRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // Rate limit tracking
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    remaining: number;
    limit: number;
    reset: string | null;
    dailyUsed: number;
    dailyLimit: number;
  } | null>(null);

  // Store sync states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{
    current: number;
    total: number;
    status: string;
    remainingTime: string | null;
  } | null>(null);
  
  // Aktif mağaza değiştiğinde ürünleri yenile
  useEffect(() => {
    if (activeStore?.shop_id && activeStore.shop_id.toString() !== currentShopId) {
      console.log('🔄 Aktif mağaza değişti, ürünler yeniden yükleniyor...');
      console.log(`📍 Önceki: ${currentShopId} → Yeni: ${activeStore.shop_id}`);
      
      // Ürünleri sıfırla ve yeniden yükle
      setProducts([]);
      setNextCursor(null);
      setHasMoreProducts(true);
      setIsLoadingProducts(true);
      
      // Mevcut shop ID'yi güncelle
      setCurrentShopId(activeStore.shop_id.toString());
      
      // Yeni mağazanın ürünlerini yükle
      fetchProductsForStore(activeStore.shop_id.toString());
    }
  }, [activeStore?.shop_id, currentShopId]);

  // Mağaza ürünlerini yükle (istemci tarafında filtreleme)
  const fetchProductsForStore = async (shopId: string) => {
    try {
      console.log(`🔄 ${shopId} mağazasının ürünleri yükleniyor...`);
      
      // ShopId parametresini API rotasına eklemeden, tüm ürünleri çek
      const timestamp = Date.now();
      const response = await fetch(`/api/products/paginate?userId=${userId}&limit=200&t=${timestamp}`, {
        // Cache'i devre dışı bırak - her zaman yeni veri al
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const data = await response.json();
      
      console.log('🔍 API Response Debug:', {
        success: data.success,
        productCount: data.products?.length,
        error: data.error
      });
      
      if (data.success) {
        // İstemci tarafında shopId'ye göre filtreleme yap
        const shopIdNumber = parseInt(shopId);
        console.log(`🔍 İstemci tarafında filtreleme: aranan shopId=${shopIdNumber}, toplam ürün=${data.products?.length || 0}`);
        
        if (data.products && data.products.length > 0) {
          const first3 = data.products.slice(0, 3);
          first3.forEach((product: any, index: number) => {
            console.log(`🔍 Ürün ${index + 1}:`, {
              listing_id: product.listing_id,
              shop_id: product.shop_id,
              shop_id_type: typeof product.shop_id,
              title: product.title?.substring(0, 30)
            });
          });
        }
        
        // İstemci tarafında filtreleme yap - veri tiplerini dikkatlice kontrol et
        const filteredProducts = (data.products || []).filter((product: any) => {
          // Hem shop_id hem de shopId alanlarını kontrol et
          // String ve number tiplerini karşılaştırırken === yerine == kullan
          // veya her ikisini de aynı tipe dönüştür
          const productShopId = product.shop_id ? Number(product.shop_id) : null;
          const productShopId2 = product.shopId ? Number(product.shopId) : null;
          
          return productShopId === shopIdNumber || productShopId2 === shopIdNumber;
        });
        
        console.log(`✅ ${filteredProducts.length} ürün filtrelendi (${shopId} mağazası, toplam: ${data.products?.length || 0})`);
        
        // Filtrelenmiş ürün yoksa, tekrar farklı bir yöntemle dene
        if (filteredProducts.length === 0) {
          console.log('⚠️ İlk filtreleme başarısız! Alternatif yöntem deneniyor...');
          
          // String karşılaştırması dene
          const shopIdStr = shopIdNumber.toString();
          const altFilteredProducts = (data.products || []).filter((product: any) => {
            const productShopIdStr = product.shop_id ? product.shop_id.toString() : '';
            const productShopId2Str = product.shopId ? product.shopId.toString() : '';
            
            return productShopIdStr === shopIdStr || productShopId2Str === shopIdStr;
          });
          
          if (altFilteredProducts.length === 0) {
            console.log('⚠️ Alternatif filtreleme de başarısız! Daha kapsamlı filtreleme deneniyor...');
            
            // Daha kapsamlı bir filtreleme dene - herhangi bir eşleşme olabilir
            const flexibleFilteredProducts = (data.products || []).filter((product: any) => {
              // Tüm olası shop_id alanlarını kontrol et
              const productShopId = product.shop_id;
              const productShopId2 = product.shopId;
              
              // Farklı veri tipleri için karşılaştırma
              return (
                // Number karşılaştırmaları
                productShopId === shopIdNumber ||
                productShopId2 === shopIdNumber ||
                
                // String karşılaştırmaları
                (typeof productShopId === 'string' && productShopId === shopIdStr) ||
                (typeof productShopId2 === 'string' && productShopId2 === shopIdStr) ||
                
                // Sayısal string karşılaştırmaları
                (typeof productShopId === 'string' && parseInt(productShopId) === shopIdNumber) ||
                (typeof productShopId2 === 'string' && parseInt(productShopId2) === shopIdNumber)
              );
            });
            
            if (flexibleFilteredProducts.length === 0) {
              console.log('⚠️ Tüm filtreleme yöntemleri başarısız! Tüm ürünleri gösteriyorum...');
              // Tüm ürünleri göster - en azından bir şeyler görsün kullanıcı
              setProducts(data.products || []);
            } else {
              console.log(`✅ Kapsamlı filtreleme başarılı: ${flexibleFilteredProducts.length} ürün bulundu`);
              setProducts(flexibleFilteredProducts);
            }
          } else {
            console.log(`✅ Alternatif filtreleme başarılı: ${altFilteredProducts.length} ürün bulundu`);
            setProducts(altFilteredProducts);
          }
        } else {
          setProducts(filteredProducts);
        }
        
        setNextCursor(data.nextCursor);
        setHasMoreProducts(!!data.nextCursor);
      } else {
        console.error('❌ Ürün yükleme hatası:', data.error);
        toast({
          title: 'Hata',
          description: 'Ürünler yüklenirken hata oluştu',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('❌ Ürün fetch hatası:', error);
      toast({
        title: 'Hata',
        description: 'Ürünler yüklenirken hata oluştu',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Tüm ürünleri çekmek için yeni fonksiyon - Full Sync sonrası kullanılır
  const fetchAllProductsForStore = async (shopId: string) => {
    try {
      setIsLoadingProducts(true);
      console.log(`🔍 fetchAllProductsForStore: ${shopId} mağazasının ürünleri yükleniyor...`);
      
      // Gelişmiş önbellek kontrolü
      try {
        // browser-cache modülünden loadFromCache kullan
        const cachedData = await loadFromCache(shopId, 10 * 60 * 1000); // 10 dakika
        
        if (cachedData && cachedData.products && cachedData.products.length > 0) {
          console.log(`🚀 Önbellekten ${cachedData.products.length} ürün yüklendi`);
          setProducts(cachedData.products);
          setNextCursor(cachedData.nextCursor);
          setHasMoreProducts(!!cachedData.nextCursor);
          
          // Filtrelenmiş ürünleri de güncelle (price-update sekmesi için)
          if (activeTab === 'price-update') {
            setFilteredProducts?.(cachedData.products);
          }
          
          setIsLoadingProducts(false);
          
          toast({
            title: "Ürünler Hazır",
            description: `${cachedData.products.length} ürün önbellekten yüklendi.`,
            variant: "default",
          });
          
          return;
        }
      } catch (e) {
        console.error('Önbellek verisi ayrıştırılamadı:', e);
      }
      
      // Sayfa donmasını önlemek için daha küçük sayfalama kullan
      const pageSize = 50; // Daha küçük sayfa boyutu - ilk 50 ürün
      
      // ShopId parametresini API rotasına ekleyerek direkt o mağazanın ürünlerini çek
      const response = await fetch(`/api/products/paginate?userId=${userId}&limit=${pageSize}&shopId=${shopId}&t=${Date.now()}`, {
        // Cache'i devre dışı bırak - her zaman yeni veri al
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`📦 API'den ${data.products?.length || 0} ürün alındı`);
        
        // Yine de istemci tarafında filtrele (güvenlik için)
        const shopIdNumber = parseInt(shopId);
        
        // Önce normal filtreleme dene
        let filteredProducts = (data.products || []).filter((product: any) => {
          const productShopId = product.shop_id ? Number(product.shop_id) : null;
          const productShopId2 = product.shopId ? Number(product.shopId) : null;
          
          return productShopId === shopIdNumber || productShopId2 === shopIdNumber;
        });
        
        // Eğer sonuç bulunamazsa, string karşılaştırması dene
        if (filteredProducts.length === 0) {
          console.log('⚠️ fetchAllProductsForStore: İlk filtreleme başarısız! Alternatif yöntem deneniyor...');
          
          const shopIdStr = shopIdNumber.toString();
          filteredProducts = (data.products || []).filter((product: any) => {
            const productShopIdStr = product.shop_id ? product.shop_id.toString() : '';
            const productShopId2Str = product.shopId ? product.shopId.toString() : '';
            
            return productShopIdStr === shopIdStr || productShopId2Str === shopIdStr;
          });
          
          console.log(`${filteredProducts.length > 0 ? '✅' : '❌'} Alternatif filtreleme: ${filteredProducts.length} ürün bulundu`);
        }
        
        // Filtreleme sonrası ürün yoksa, daha kapsamlı bir filtreleme dene
        if (filteredProducts.length === 0) {
          console.log('⚠️ Filtreleme sonrası ürün bulunamadı! Daha kapsamlı filtreleme deneniyor...');
          
          // Tüm olası shop_id formatlarını kontrol et
          const shopIdStr = shopIdNumber.toString();
          const shopIdInt = shopIdNumber;
          
          // Daha esnek bir filtreleme yap - herhangi bir eşleşme olabilir
          const flexibleFilteredProducts = (data.products || []).filter((product: any) => {
            // Tüm olası shop_id alanlarını kontrol et
            const productShopId = product.shop_id;
            const productShopId2 = product.shopId;
            
            // Farklı veri tipleri için karşılaştırma
            return (
              // Number karşılaştırmaları
              productShopId === shopIdInt ||
              productShopId2 === shopIdInt ||
              
              // String karşılaştırmaları
              (typeof productShopId === 'string' && productShopId === shopIdStr) ||
              (typeof productShopId2 === 'string' && productShopId2 === shopIdStr) ||
              
              // Sayısal string karşılaştırmaları
              (typeof productShopId === 'string' && parseInt(productShopId) === shopIdInt) ||
              (typeof productShopId2 === 'string' && parseInt(productShopId2) === shopIdInt)
            );
          });
          
          if (flexibleFilteredProducts.length === 0) {
            console.log('⚠️ Kapsamlı filtreleme de başarısız! İlk sayfadaki ürünleri gösteriyorum...');
            // Tüm ürünleri göster - en azından bir şeyler görsün kullanıcı
            setProducts(data.products || []);
            
            // Gelişmiş önbelleğe al
            try {
              await saveToCache(shopId, {
                products: data.products || [],
                nextCursor: data.nextCursor,
                timestamp: Date.now()
              });
              console.log(`✅ ${data.products?.length || 0} ürün önbelleğe kaydedildi`);
            } catch (e) {
              console.error('Önbelleğe alma hatası:', e);
            }
          } else {
            console.log(`✅ Kapsamlı filtreleme başarılı: ${flexibleFilteredProducts.length} ürün bulundu`);
            setProducts(flexibleFilteredProducts);
            
            // Gelişmiş önbelleğe al
            try {
              await saveToCache(shopId, {
                products: flexibleFilteredProducts,
                nextCursor: data.nextCursor,
                timestamp: Date.now()
              });
              console.log(`✅ ${flexibleFilteredProducts.length} ürün önbelleğe kaydedildi`);
            } catch (e) {
              console.error('Önbelleğe alma hatası:', e);
            }
          }
        } else {
          console.log(`✅ ${filteredProducts.length} ürün filtrelendi ve gösteriliyor`);
          setProducts(filteredProducts);
          
          // Gelişmiş önbelleğe al
          try {
            await saveToCache(shopId, {
              products: filteredProducts,
              nextCursor: data.nextCursor,
              timestamp: Date.now()
            });
            console.log(`✅ ${filteredProducts.length} ürün önbelleğe kaydedildi`);
          } catch (e) {
            console.error('Önbelleğe alma hatası:', e);
          }
        }
        
        // Sayfalama bilgilerini güncelle
        setNextCursor(data.nextCursor);
        setHasMoreProducts(!!data.nextCursor);
        
        // Sessiz bildirim - kullanıcıyı rahatsız etmemek için
        if (filteredProducts.length > 0) {
          toast({
            title: "Ürünler Yüklendi",
            description: `${filteredProducts.length} ürün başarıyla yüklendi.`,
            variant: 'default',
          });
        }
      } else {
        console.error('❌ API yanıtı başarısız:', data.error);
        toast({
          title: 'Hata',
          description: 'Ürünler yüklenirken API hatası oluştu',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('❌ Ürün yükleme hatası:', error);
      toast({
        title: 'Hata',
        description: 'Ürünler yüklenirken hata oluştu',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Quick Sync - Cache'li sistem: İlk tıklamada Firebase'e kaydet, sonrakılerde cache'den göster
  const quickSyncProducts = async (shopId: string) => {
    if (isQuickSyncing) {
      console.log('⚠️ Quick sync zaten çalışıyor, atlanıyor...');
      return;
    }
    
    // Quick Sync başladığını bildir
    toast({
      title: 'Ürünler Yükleniyor',
      description: 'Ürünler Etsy\'den çekiliyor...',
      variant: 'default',
    });
    
    try {
      setIsQuickSyncing(true);
      console.log(`🚀 Quick sync başlıyor - Fresh data çekiliyor, ShopId: ${shopId}`);
      
      // Direkt Etsy API'den fresh data çek (cache kontrolü yok)
      const response = await fetch('/api/store/live-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Fresh data çekildi: ${data.products.length} ürün gösteriliyor`);
        
        // Direkt live products'ı göster
        setProducts(data.products || []);
        
        // Sayfalama için cursor ayarla - daha fazla ürün yüklenebilir
        setNextCursor("next_page");
        setHasMoreProducts(true);
        
        // Gelişmiş önbelleğe al
        try {
          await saveToCache(shopId, {
            products: data.products || [],
            nextCursor: "next_page",
            timestamp: Date.now()
          }, 'price_update_products');
          console.log(`✅ ${data.products?.length || 0} ürün fiyat güncelleme önbelleğine kaydedildi`);
        } catch (e) {
          console.error('Önbelleğe alma hatası:', e);
        }
        
        toast({
          title: 'Ürünler Yüklendi!',
          description: `${data.products.length} ürün yüklendi. Daha fazlası için "Daha Fazla Yükle" butonunu kullanabilirsiniz.`,
          variant: 'default',
        });
        
      } else {
        console.error('❌ Quick sync hatası:', data.error);
        
        toast({
          title: 'Yükleme Hatası',
          description: 'Ürünler yüklenirken hata oluştu.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('❌ Quick sync fetch hatası:', error);
      
      toast({
        title: 'Bağlantı Hatası',
        description: 'Sunucuya bağlanırken hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setIsQuickSyncing(false);
      setIsLoadingProducts(false);
    }
  };

  // Client-side mount kontrolü
  useEffect(() => {
    setMounted(true);
    
    // İlk yüklemede currentShopId'yi set et
    if (activeStore?.shop_id) {
      setCurrentShopId(activeStore.shop_id.toString());
    }
    
    // localStorage'dan completed verileri yükle
    if (typeof window !== 'undefined') {
      const completedKeys = Object.keys(localStorage).filter(key => key.startsWith('completed_'));
      const validCompletedData = completedKeys.map(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.title && data.completed_at && !isNaN(new Date(data.completed_at).getTime())) {
            return { key, data };
          }
          return null;
        } catch {
          localStorage.removeItem(key); // Bozuk veriyi temizle
          return null;
        }
      }).filter(item => item !== null);
      
      localStorage.setItem('completed_count', validCompletedData.length.toString());
      setCompletedCount(validCompletedData.length);
      setCompletedItems(validCompletedData.sort((a, b) => 
        new Date(b.data.completed_at).getTime() - new Date(a.data.completed_at).getTime()
      ));
    }
    
    // Eğer sayfa açılırken queue tabı aktifse direkt yükle
    if (activeTab === 'queue') {
      console.log('🚀 Component mount - Queue tab aktif, kuyruk yükleniyor...');
      setTimeout(fetchQueue, 100); // Mikro delay ile
    }
    
    // Rate limit bilgilerini fetch et
    fetchRateLimitInfo();
  }, []);
  
  // Rate limit bilgilerini fetch et
  const fetchRateLimitInfo = async () => {
    try {
      const response = await fetch('/api/etsy/status');
      const data = await response.json();
      
      if (data.isConnected && data.apiLimit) {
        // Gerçek Etsy API header'larını kullan
        const dailyRemaining = data.apiLimit.daily_remaining || 0;
        const dailyLimit = data.apiLimit.daily_limit || 10000;
        const secondRemaining = data.apiLimit.second_remaining || 0;
        const secondLimit = data.apiLimit.second_limit || 10;
        const dailyUsed = dailyLimit - dailyRemaining;
        
        setRateLimitInfo({
          remaining: dailyRemaining,
          limit: dailyLimit,
          reset: null,
          dailyUsed: dailyUsed,
          dailyLimit: dailyLimit
        });
        
        console.log('⚡ Rate limit bilgileri güncellendi:', {
          daily_remaining: dailyRemaining,
          daily_limit: dailyLimit,
          second_remaining: secondRemaining,
          second_limit: secondLimit
        });
      }
    } catch (error) {
      console.error('Rate limit bilgileri alınamadı:', error);
    }
  };
  
  // Etsy store bilgileri
  const [storeInfo, setStoreInfo] = useState<{
    shopId: string | null;
    shopName: string | null;
    isConnected: boolean;
    apiLimit?: {
      daily_limit?: number;
      remaining?: number;
      reset?: string;
    };
  }>({
    shopId: null,
    shopName: null,
    isConnected: false
  });
  
  // Client-side only state
  const [mounted, setMounted] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [completedItems, setCompletedItems] = useState<any[]>([]);

  const fetchMoreProducts = useCallback(async () => {
    if (isLoadingProducts) return;
    
    setIsLoadingProducts(true);
    try {
      if (activeStore?.shop_id) {
        // Daha fazla ürün yüklemek için Firebase'den veya Etsy API'den veri çek
        const shopId = activeStore.shop_id.toString();
        
        // Önce Firebase'den daha fazla ürün çekmeyi dene
        const response = await fetch(`/api/products/paginate?userId=${userId}&limit=50&shopId=${shopId}&t=${Date.now()}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.products && data.products.length > 0) {
            // Yeni ürünleri mevcut ürünlere ekle
            setProducts(prev => [...prev, ...data.products]);
            
            // Sayfalama bilgilerini güncelle
            setNextCursor(data.nextCursor);
            setHasMoreProducts(!!data.nextCursor);
            
            toast({
              title: "Daha Fazla Ürün Yüklendi",
              description: `${data.products.length} ürün daha yüklendi.`,
              variant: 'default',
            });
          } else {
            // Eğer Firebase'den ürün gelmezse, Etsy API'den direkt çekmeyi dene
            await quickSyncProducts(shopId);
          }
        } else {
          console.error("Failed to fetch more products");
          setHasMoreProducts(false);
        }
      }
    } catch (error) {
      console.error("Error fetching more products:", error);
      setHasMoreProducts(false);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [isLoadingProducts, userId, activeStore]);


  // Store bilgilerini yükle
  const loadStoreInfo = async () => {
    try {
      const response = await fetch('/api/etsy/status');
      if (response.ok) {
        const data = await response.json();
        setStoreInfo({
          shopId: data.shopId,
          shopName: data.shopName,
          isConnected: data.isConnected,
          apiLimit: data.apiLimit
        });
      }
    } catch (error) {
      console.error('Store bilgileri yüklenemedi:', error);
    }
  };

  // Etsy bağlantısını kes
  // Store data sync function
  const syncStoreData = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    setSyncProgress({ current: 0, total: 0, status: 'Başlatılıyor...', remainingTime: null });
    
    try {
      console.log('🔄 Starting store data sync...');
      
      const response = await fetch('/api/store/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sync failed');
      }
      
      const data = await response.json();
      
      console.log('✅ Store sync completed:', data);
      
      setSyncProgress({
        current: data.syncResult.synced_listings,
        total: data.syncResult.total_listings,
        status: 'Tamamlandı',
        remainingTime: null
      });
      
      toast({
        title: "Başarılı",
        description: `${data.syncResult.synced_listings} ürün verisi çekildi ve kaydedildi`
      });
      
      // Ürünleri yeniden yükle
      if (activeStore?.shop_id) {
        fetchProductsForStore(activeStore.shop_id.toString());
      }
      
      // Clear progress after 3 seconds
      setTimeout(() => {
        setSyncProgress(null);
      }, 3000);
      
    } catch (error) {
      console.error('❌ Store sync error:', error);
      
      setSyncProgress({ current: 0, total: 0, status: 'Hata!', remainingTime: null });
      
      toast({
        variant: "destructive",
        title: "Hata",
        description: error instanceof Error ? error.message : "Mağaza verileri çekilemedi"
      });
      
      // Clear progress after 3 seconds
      setTimeout(() => {
        setSyncProgress(null);
      }, 3000);
      
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Full Store data sync function with progress and remaining time
  const fullSyncStoreData = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    setSyncProgress({
      current: 0,
      total: 0,
      status: 'Başlatılıyor...',
      remainingTime: null
    });
    
    try {
      console.log('🔄 FULL SYNC başlatılıyor...');
      
      // Kullanıcıya bildirim göster
      toast({
        title: "Full Sync Başlatıldı",
        description: "Tüm ürünler Etsy'den çekiliyor ve önbelleğe kaydediliyor...",
        variant: "default",
      });
      
      // Önce tarayıcı önbelleğinden kontrol et
      if (activeStore?.shop_id) {
        try {
          // Önbellek anahtarını oluştur
          const cacheKey = `all_products_${activeStore.shop_id}`;
          console.log(`🔍 Önbellek kontrolü: ${cacheKey}`);
          
          // Gelişmiş önbellek kontrolü için browser-cache modülünü kullan
          const cachedData = await loadFromCache(activeStore.shop_id.toString(), 60 * 60 * 1000); // 1 saat
          
          if (cachedData && cachedData.products && cachedData.products.length > 0) {
            console.log(`🚀 Önbellekten ${cachedData.products.length} ürün yüklendi`);
            console.log(`📅 Önbellek tarihi: ${new Date(cachedData.timestamp).toLocaleString('tr-TR')}`);
            
            // Önbellekten yüklenen ürünleri göster
            setProducts(cachedData.products);
            setNextCursor(null);
            setHasMoreProducts(false);
            
            // Filtrelenmiş ürünleri de güncelle (price-update sekmesi için)
            if (activeTab === 'price-update') {
              setFilteredProducts(cachedData.products);
            }
            
            setSyncProgress({
              current: cachedData.products.length,
              total: cachedData.products.length,
              status: 'Önbellekten yüklendi',
              remainingTime: null
            });
            
            toast({
              title: "Önbellekten Yüklendi",
              description: `${cachedData.products.length} ürün tarayıcı önbelleğinden yüklendi.`,
              variant: "default",
            });
            
            // 3 saniye sonra ilerleme çubuğunu temizle
            setTimeout(() => {
              setSyncProgress(null);
              setIsSyncing(false);
            }, 3000);
            
            return;
          } else {
            console.log('⚠️ Önbellekte veri bulunamadı veya süresi dolmuş');
          }
        } catch (error) {
          console.error('❌ Önbellek okuma hatası:', error);
        }
      }
      
      // Önbellekte yoksa API'den çek
      console.log('🔄 Etsy API\'den tüm ürünler çekiliyor...');
      const response = await fetch('/api/etsy/full-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId: activeStore?.shop_id })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sync failed');
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Full sync tamamlandı: ${data.results.total} ürün`);
        
        // Ürünleri göster
        setProducts(data.results.products || []);
        setNextCursor(null);
        setHasMoreProducts(false);
        
        // Filtrelenmiş ürünleri de güncelle (price-update sekmesi için)
        if (activeTab === 'price-update') {
          setFilteredProducts(data.results.products || []);
        }
        
        // Hem normal hem de fiyat güncelleme önbelleğine kaydet
        try {
          if (activeStore?.shop_id) {
            // Normal önbelleğe kaydet
            await saveToCache(activeStore.shop_id.toString(), {
              products: data.results.products || [],
              timestamp: Date.now()
            });
            
            // Fiyat güncelleme önbelleğine de kaydet
            await saveToCache(activeStore.shop_id.toString(), {
              products: data.results.products || [],
              timestamp: Date.now()
            }, 'price_update_products');
            
            console.log('✅ Veriler her iki önbelleğe de kaydedildi');
          }
        } catch (error) {
          console.error('❌ Önbelleğe kaydetme hatası:', error);
        }
        
        setSyncProgress({
          current: data.results.total,
          total: data.results.total,
          status: 'Tamamlandı',
          remainingTime: null
        });
        
        toast({
          title: "Full Sync Tamamlandı",
          description: `${data.results.total} ürün başarıyla senkronize edildi ve tarayıcı önbelleğine kaydedildi.`,
          variant: "default",
        });
        
        // 3 saniye sonra ilerleme çubuğunu temizle
        setTimeout(() => {
          setSyncProgress(null);
          setIsSyncing(false);
        }, 3000);
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error) {
      console.error('❌ Full sync hatası:', error);
      
      setSyncProgress({
        current: 0,
        total: 0,
        status: 'Hata!',
        remainingTime: null
      });
      
      toast({
        variant: "destructive",
        title: "Hata",
        description: error instanceof Error ? error.message : "Full sync sırasında bir hata oluştu"
      });
      
      // 3 saniye sonra ilerleme çubuğunu temizle
      setTimeout(() => {
        setSyncProgress(null);
      }, 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  const disconnectEtsy = async () => {
    try {
      const response = await fetch('/api/etsy/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'local-user-123' })
      });
      
      if (response.ok) {
        setStoreInfo({
          shopId: null,
          shopName: null,
          isConnected: false
        });
        toast({
          title: "Başarılı",
          description: "Etsy bağlantısı kesildi"
        });
      } else {
        throw new Error('Bağlantı kesilemedi');
      }
    } catch (error) {
      console.error('Etsy bağlantısı kesme hatası:', error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Etsy bağlantısı kesilemedi"
      });
    }
  };

  // 🔥 HAYVAN GİBİ HIZLI Kuyruk verilerini yükle
  const loadQueueItems = async () => {
    try {
      console.log('🚀 Kuyruk verileri yükleniyor...');
      setIsLoadingQueue(true);
      
      const startTime = Date.now();
      const response = await fetch('/api/queue?user_id=local-user-123');
      const loadTime = Date.now() - startTime;
      
      console.log(`📈 API yanıtı alındı: ${response.status} - ${loadTime}ms`);
      
      if (!response.ok) {
        throw new Error(`API hatası: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📋 API veri detayı:', {
        totalItems: data.items?.length || 0,
        metadata: data.metadata,
        items: data.items?.map((item: any) => ({
          id: item.id,
          title: item.product_data?.title?.substring(0, 50) + '...',
          status: item.status
        }))
      });
      
      // Tüm ürünleri al ama state hesaplaması için
      const allItems = data.items || [];
      
      console.log(`💾 State gúncelleniyor: ${allItems.length} item`);
      setQueueItems(allItems);
      
      // Stats'ı güncelle - tüm statusları dahil et
      const newStats = {
        pending: allItems.filter((item: any) => item.status === 'pending').length,
        processing: allItems.filter((item: any) => item.status === 'processing').length,
        completed: allItems.filter((item: any) => item.status === 'completed').length,
        failed: allItems.filter((item: any) => item.status === 'failed').length
      };
      
      console.log('📊 Stats güncellendi:', newStats);
      console.log('🎯 Aktif öğeler (pending/processing):', allItems.filter((item: any) => 
        item.status !== 'completed' && item.status !== 'failed'
      ).map((item: any) => ({
        id: item.id,
        status: item.status,
        title: item.product_data?.title?.substring(0, 30) + '...'
      })));
      
      setQueueStats(newStats);
      
      console.log(`✅ Kuyruk yükleme tamamlandı: ${allItems.length} item, ${loadTime}ms`);
      
    } catch (error) {
      console.error('❌ Kuyruk verileri yüklenemedi:', error)
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Kuyruk verileri yüklenemedi"
      })
    } finally {
      setIsLoadingQueue(false)
    }
  }

  const fetchQueue = useCallback(async () => { 
    console.log('🔄 Manuel Yenile butonu tıklandı!');
    await loadQueueItems();
  }, []);
  
  const toggleQueue = async () => { 
    setIsAutoProcessing(!isAutoProcessing);
  };

  useEffect(() => {
    if (activeTab === 'queue') {
      console.log('🎯 Queue tabı açıldı, kuyruk verileri yükleniyor...');
      fetchQueue();
    } else if (activeTab === 'price-update') {
      console.log('🎯 Ölçü ve Fiyat Güncelleme tabı açıldı, ilk 50 ürün yükleniyor...');
      if (activeStore?.shop_id) {
        // Gelişmiş önbellek kontrolü
        const loadCachedPriceUpdateProducts = async () => {
          try {
            // browser-cache modülünden loadFromCache kullan
            const cachedData = await loadFromCache(activeStore.shop_id.toString(), 5 * 60 * 1000, 'price_update_products'); // 5 dakika
            
            if (cachedData && cachedData.products && cachedData.products.length > 0) {
              console.log(`🚀 Önbellekten ${cachedData.products.length} ürün yüklendi (fiyat güncelleme)`);
              setProducts(cachedData.products);
              setNextCursor(cachedData.nextCursor);
              setHasMoreProducts(!!cachedData.nextCursor);
              
              // Filtrelenmiş ürünleri de güncelle
              setFilteredProducts(cachedData.products);
              
              toast({
                title: "Ürünler Hazır",
                description: `${cachedData.products.length} ürün önbellekten yüklendi.`,
                variant: "default",
              });
              
              return true;
            }
            return false;
          } catch (e) {
            console.error('Önbellek erişim hatası:', e);
            return false;
          }
        };
        
        // Önbellek kontrolü yap, yoksa normal yükleme yap
        loadCachedPriceUpdateProducts().then(cacheLoaded => {
          if (!cacheLoaded) {
            // İlk 50 ürünü yükle - sayfalama ile
            setIsLoadingProducts(true);
            
            // Sayfa donmasını önlemek için setTimeout kullanarak yüklemeyi geciktir
            setTimeout(() => {
              // Direkt Etsy API'den hızlı veri çek - ilk 50 ürün
              quickSyncProducts(activeStore.shop_id.toString());
            }, 100);
          }
        });
      }
    }
    // Store bilgilerini sayfa açıldığında yükle
    loadStoreInfo();
  }, [activeTab, fetchQueue, fetchMoreProducts]);

  // 🔥 REAL-TIME LISTENER VE CUSTOM EVENT SİSTEMİ
  useEffect(() => {
    console.log('🎯 Real-time kuyruk listener sistemi başlatılıyor...');
    
    // Custom event listener for instant queue updates
    const handleQueueUpdate = () => {
      console.log('📨 Custom queue update event alındı!');
      fetchQueue();
    };
    
    // Add custom event listener
    window.addEventListener('queueUpdated', handleQueueUpdate);
    
    // OTOMATIK YENİLEME KALDIRILDI - Sadece manuel yenileme
    
    return () => {
      window.removeEventListener('queueUpdated', handleQueueUpdate);
      console.log('🛑 Real-time listener sistemi temizlendi');
    };
  }, [activeTab]);

  // Debug hook to track queueItems state changes
  useEffect(() => {
    const activeItems = queueItems.filter(item => item.status !== 'completed' && item.status !== 'failed');
    console.log('🔄 queueItems State Changed:', {
      timestamp: new Date().toISOString(),
      totalItems: queueItems.length,
      activeItems: activeItems.length,
      allStatuses: queueItems.reduce((acc: any, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {}),
      activeItemDetails: activeItems.map(item => ({
        id: item.id,
        status: item.status,
        title: item.product_data?.title?.substring(0, 40) + '...',
        hasProductData: !!item.product_data,
        hasTitle: !!item.product_data?.title
      }))
    });
  }, [queueItems]);

  useEffect(() => {
    return () => {
      if (queueInterval) clearInterval(queueInterval);
    };
  }, [queueInterval]);

  // Otomatik işleme sistemi
  useEffect(() => {
    if (isAutoProcessing) {
      console.log('🚀 Otomatik işleme başlatılıyor...');
      
      const processNext = async () => {
        try {
          // Countdown aktifse bekle
          if (countdown > 0) {
            console.log(`⏳ Countdown aktif: ${countdown}s - bekleniyor...`);
            return;
          }

          // Bekleyen ürünleri eskiden yeniye sırala
          const pendingItems = queueItems
            .filter(item => item.status === 'pending')
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

          if (pendingItems.length === 0) {
            console.log('✅ Kuyrukta bekleyen ürün yok, otomatik işleme durduruluyor');
            setIsAutoProcessing(false);
            setCountdown(0);
            return;
          }

          if (currentlyProcessing) {
            console.log('⏳ Başka bir ürün işleniyor, bekleniyor...');
            return;
          }

          const nextItem = pendingItems[0];
          console.log(`🎯 Sıradaki ürün işleme alınıyor: ${nextItem.product_data?.title || nextItem.id}`);
          
          // Ürünü işleme al
          await processQueueItem(nextItem.id);
          
          // İşlem bitince sayaç başlat (sadece daha fazla ürün varsa)
          const remainingPendingItems = queueItems
            .filter(item => item.status === 'pending' && item.id !== nextItem.id);
          
          if (remainingPendingItems.length > 0) {
            console.log(`⏰ ${processingDelay} saniye bekleme başlatılıyor...`);
            
            let remainingTime = processingDelay;
            setCountdown(remainingTime);
            
            const countdownInterval = setInterval(() => {
              remainingTime--;
              setCountdown(remainingTime);
              
              if (remainingTime <= 0) {
                clearInterval(countdownInterval);
                setCountdown(0);
                console.log('✅ Bekleme süresi tamamlandı, sıradaki ürüne geçiliyor...');
              }
            }, 1000);
          } else {
            console.log('✅ Son ürün işlendi, otomatik işleme tamamlandı');
            setIsAutoProcessing(false);
          }

        } catch (error) {
          console.error('❌ Otomatik işleme hatası:', error);
        }
      };

      // İlk işlemi hemen başlat
      processNext();
      
      // Her 5 saniyede kontrol et 
      const interval = setInterval(processNext, 5000);
      setQueueInterval(interval);

    } else {
      // Otomatik işleme durduruldu
      console.log('⏹️ Otomatik işleme durduruldu');
      if (queueInterval) {
        clearInterval(queueInterval);
        setQueueInterval(null);
      }
      setCountdown(0);
    }

    return () => {
      if (queueInterval) {
        clearInterval(queueInterval);
      }
    };
  }, [isAutoProcessing, queueItems, currentlyProcessing, processingDelay, countdown]);

  // Click outside to close editing
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Başlık düzenleme kontrolü
      if (editingItemId && editingField === 'title') {
        const titleRef = editingRefs.current[`title-${editingItemId}`];
        if (titleRef && !titleRef.contains(event.target as Node)) {
          cancelEdit();
        }
      }
      
      // Fiyat düzenleme kontrolü
      if (editingItemId && editingField === 'price') {
        const priceRef = editingRefs.current[`price-${editingItemId}`];
        if (priceRef && !priceRef.contains(event.target as Node)) {
          cancelEdit();
        }
      }
      
      // Etiket düzenleme kontrolü
      if (editingItemId && editingField === 'tags') {
        const tagsRef = editingRefs.current[`tags-${editingItemId}`];
        if (tagsRef && !tagsRef.contains(event.target as Node)) {
          cancelEdit();
        }
      }
      
      // Medya düzenleme kontrolü
      if (editingMediaItemId) {
        const mediaRef = editingRefs.current[`media-${editingMediaItemId}`];
        if (mediaRef && !mediaRef.contains(event.target as Node)) {
          setEditingMediaItemId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingItemId, editingField, editingMediaItemId]);

  const tabs = [
    { id: 'products', label: 'Ürünler', icon: Package },
    { id: 'auto-add', label: 'Otomatik Ürün Ekleme', icon: Plus },
    { id: 'auto-digital', label: 'Otomatik Digital Ürün Ekleme', icon: Download },
    { id: 'gelato-add', label: 'Gelato Ürün Ekleme', icon: Plus },
  ];

  const renderProducts = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Ürünler</h2>
          {/* Etsy Store Bilgileri */}
          {storeInfo.isConnected ? (
            <div className="mt-2 text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <strong>{storeInfo.shopName}</strong> (ID: {storeInfo.shopId})
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={syncStoreData}
                  className="text-blue-600 hover:bg-blue-50"
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Veri Çekiliyor...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Mağaza Verilerini Çek
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectEtsy}
                  className="text-red-600 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Bağlantıyı Kes
                </Button>
              </div>
              {/* Sync Progress */}
              {syncProgress && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-800">
                      {syncProgress.status}
                    </span>
                    {syncProgress.total > 0 && (
                      <span className="text-sm text-blue-600">
                        {syncProgress.current}/{syncProgress.total}
                      </span>
                    )}
                  </div>
                  {syncProgress.total > 0 && (
                    <>
                      <div className="w-full bg-blue-200 rounded-full h-2 relative">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${(syncProgress.current / syncProgress.total) * 100}%`
                          }}
                        />
                        {/* Animasyonlu yükleme göstergesi */}
                        <div className="absolute top-0 left-0 w-full h-2 rounded-full overflow-hidden">
                          <div className="h-full w-full bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-30 animate-pulse"></div>
                        </div>
                      </div>
                      <div className="text-xs text-blue-600 mt-1 text-center">
                        {Math.round((syncProgress.current / syncProgress.total) * 100)}%
                      </div>
                    </>
                  )}
                  
                  {/* Kalan süre ve detaylar */}
                  <div className="mt-2 flex flex-col text-xs text-blue-700">
                    <div className="flex items-center">
                      <Timer className="w-3 h-3 mr-1" />
                      <span>
                        {syncProgress.remainingTime
                          ? `Tahmini kalan süre: ${syncProgress.remainingTime}`
                          : 'Süre hesaplanıyor...'}
                      </span>
                    </div>
                    <div className="flex items-center mt-1">
                      <RefreshCw className="w-3 h-3 mr-1" />
                      <span>Son güncelleme: {new Date().toLocaleTimeString('tr-TR')}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-2 text-sm text-red-600">
              <XCircle className="w-4 h-4 inline mr-1" />
              Etsy hesabı bağlı değil
            </div>
          )}
          <p className="text-gray-800">Etsy&apos;e yüklenmiş veya taslak ürünleriniz</p>
        </div>
        <div className="flex gap-2">
          {activeStore && (
            <>
              <Button
                onClick={() => quickSyncProducts(activeStore.shop_id.toString())}
                disabled={isQuickSyncing}
                variant="outline"
                className="bg-blue-50 hover:bg-blue-100 border-blue-200"
              >
                {isQuickSyncing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Quick Sync (12)
              </Button>
              <Button
                onClick={fullSyncStoreData}
                disabled={isSyncing}
                variant="outline"
                className="bg-green-50 hover:bg-green-100 border-green-200 relative group"
              >
                <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                  Tüm ürünleri çeker ve önbelleğe kaydeder
                </div>
                {isSyncing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Full Sync
              </Button>
              <Button
                onClick={async () => {
                  if (!confirm("Bu işlem mağazanızdaki tüm ürünlerin ölçülerini ve fiyatlarını güncelleyecek. Yeni fiyatlar ve StretchedWood Canvas formatı uygulanacak. Devam etmek istiyor musunuz?")) {
                    return;
                  }
                  
                  try {
                    // İlerleme durumunu göster
                    setUpdateProgress({
                      ...updateProgress,
                      isUpdating: true,
                      total: 0,
                      updated: 0,
                      failed: 0
                    });
                    
                    toast({
                      title: "Mağaza Ürünleri Güncelleniyor",
                      description: "Tüm ürünlerin ölçüleri ve fiyatları güncelleniyor, lütfen bekleyin...",
                    });
                    
                    const response = await fetch('/api/etsy/update-variations', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' }
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                      // İlerleme durumunu güncelle
                      setUpdateProgress({
                        isUpdating: false,
                        total: result.results.total,
                        updated: result.results.updated,
                        failed: result.results.failed,
                        estimatedTimeRemaining: '',
                        updatedListings: result.results.updatedListings || []
                      });
                      
                      // Detaylı sonuç göster
                      const detailsDialog = document.createElement('dialog');
                      detailsDialog.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50';
                      detailsDialog.innerHTML = `
                        <div class="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-auto">
                          <h2 class="text-xl font-bold mb-4">Güncelleme Sonuçları</h2>
                          <div class="mb-4">
                            <p><strong>Toplam Ürün:</strong> ${result.results.total}</p>
                            <p><strong>Güncellenen:</strong> ${result.results.updated}</p>
                            <p><strong>Başarısız:</strong> ${result.results.failed}</p>
                            <p><strong>Toplam Süre:</strong> ${result.results.duration.toFixed(2)} saniye</p>
                          </div>
                          
                          <h3 class="font-bold mt-4 mb-2">Son Güncellenen Ürünler</h3>
                          <div class="border rounded-lg overflow-hidden">
                            <table class="min-w-full divide-y divide-gray-200">
                              <thead class="bg-gray-50">
                                <tr>
                                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ürün</th>
                                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Değişiklikler</th>
                                </tr>
                              </thead>
                              <tbody class="bg-white divide-y divide-gray-200">
                                ${result.results.updatedListings?.map((item: any) => `
                                  <tr>
                                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-900">${item.title}</td>
                                    <td class="px-4 py-2 text-sm text-gray-500">Ölçüler ve fiyatlar güncellendi</td>
                                  </tr>
                                `).join('') || 'Detaylı bilgi yok'}
                              </tbody>
                            </table>
                          </div>
                          
                          <div class="mt-6 flex justify-end">
                            <button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onclick="this.closest('dialog').close()">
                              Kapat
                            </button>
                          </div>
                        </div>
                      `;
                      
                      document.body.appendChild(detailsDialog);
                      detailsDialog.showModal();
                      
                      detailsDialog.addEventListener('close', () => {
                        document.body.removeChild(detailsDialog);
                      });
                      
                      toast({
                        title: "Ölçü ve Fiyatlar Güncellendi",
                        description: `${result.results.updated} ürün başarıyla güncellendi, ${result.results.failed} ürün güncellenemedi. Toplam süre: ${result.results.duration.toFixed(2)} saniye`,
                      });
                    } else {
                      throw new Error(result.error || "Güncelleme başarısız oldu");
                    }
                  } catch (error) {
                    console.error("Ölçü ve fiyat güncelleme hatası:", error);
                    toast({
                      variant: "destructive",
                      title: "Hata",
                      description: error instanceof Error ? error.message : "Ölçüler ve fiyatlar güncellenirken bir hata oluştu",
                    });
                  }
                }}
                variant="outline"
                className="bg-purple-50 hover:bg-purple-100 border-purple-200"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Ölçü ve Fiyatları Güncelle
              </Button>
            </>
          )}
          <Button onClick={() => setIsProductFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Ürün Ekle
          </Button>
        </div>
      </div>
      
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl shadow-sm border border-slate-100">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500 opacity-10 blur-xl rounded-full"></div>
            <Package className="w-16 h-16 text-slate-400 relative z-10" />
          </div>
          <h3 className="mt-6 text-lg font-medium text-slate-700">Henüz Ürün Bulunamadı</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-md text-center">
            {activeStore ?
              `${activeStore.shop_name} mağazası için henüz ürün bulunmuyor.` :
              'Lütfen bir mağaza seçin.'}
          </p>
          
          {/* Full Sync Butonu - Sadece aktif mağaza varsa ve ürün yoksa göster */}
          {activeStore && (
            <Button
              onClick={fullSyncStoreData}
              disabled={isSyncing}
              className="mt-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-3 rounded-full shadow-md hover:shadow-lg transition-all duration-300 relative group"
            >
              <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                Tüm ürünleri çeker ve önbelleğe kaydeder
              </div>
              {isSyncing ? (
                <div className="flex items-center">
                  <div className="mr-2 h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                  <span>Senkronize Ediliyor...</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <RefreshCw className="w-5 h-5 mr-2" />
                  <span>Ürünleri Senkronize Et</span>
                </div>
              )}
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {products.map(product => {
              // Fiyat hesaplama
              const price = product.price && typeof product.price === 'number'
                ? `${product.price.toFixed(2)} ${product.currency_code || 'USD'}`
                : product.price?.amount
                  ? `${(product.price.amount / product.price.divisor).toFixed(2)} ${product.price?.currency_code}`
                  : 'N/A';
              
              return (
                <div
                  key={product.listing_id || product.id}
                  className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 hover:border-slate-200"
                >
                  {/* Görsel Alanı */}
                  <div className="aspect-square relative bg-slate-50 overflow-hidden">
                    {product.images && product.images.length > 0 && (product.images[0]?.url_570xN || product.images[0]?.url_fullxfull) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.images[0]?.url_570xN || product.images[0]?.url_fullxfull}
                        alt={product.title || "Ürün görseli"}
                        className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          console.log("Resim yükleme hatası, placeholder kullanılıyor");
                          e.currentTarget.src = "/placeholder-image.svg";
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="relative">
                          <div className="absolute inset-0 bg-blue-500 opacity-5 blur-lg rounded-full"></div>
                          <Image className="w-12 h-12 text-slate-300 relative z-10" />
                        </div>
                      </div>
                    )}
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center p-4">
                      <div className="flex space-x-2">
                        <button className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors">
                          <Edit3 className="w-4 h-4 text-slate-700" />
                        </button>
                        <button className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors">
                          <RefreshCw className="w-4 h-4 text-slate-700" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* İçerik Alanı */}
                  <div className="p-4">
                    <h3 className="font-medium text-slate-800 line-clamp-2 h-12">{product.title}</h3>
                    
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center space-x-1 text-slate-500 text-sm">
                        <Package className="w-3.5 h-3.5" />
                        <span>{product.quantity} Adet</span>
                      </div>
                      <span className="font-semibold text-slate-800">{price}</span>
                    </div>
                    
                    {/* Etiketler */}
                    {product.tags && product.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {product.tags.slice(0, 3).map((tag: string, index: number) => (
                          <span key={index} className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                        {product.tags.length > 3 && (
                          <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                            +{product.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Daha Fazla Yükle Butonu */}
          {hasMoreProducts && (
            <div className="text-center mt-8">
              <Button
                onClick={fetchMoreProducts}
                disabled={isLoadingProducts}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-2 rounded-full shadow-sm hover:shadow transition-all duration-300"
              >
                {isLoadingProducts ? (
                  <div className="flex items-center">
                    <div className="mr-2 h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                    <span>Yükleniyor...</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span>Daha Fazla Yükle</span>
                    <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );

  // Base64'ten File objesine dönüştürme
  const base64ToFile = (base64: string, filename: string, mimeType: string): File => {
    const byteCharacters = atob(base64.split(',')[1] || base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new File([byteArray], filename, { type: mimeType });
  };

  // Kuyruk istatistikleri - Client-side only
  const stats = {
    pending: queueItems.filter(item => item.status === 'pending').length,
    processing: queueItems.filter(item => item.status === 'processing').length,
    completed: completedCount, // State'ten al
    failed: queueItems.filter(item => item.status === 'failed').length,
    total: queueItems.length + completedCount
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('tr-TR')
    } catch (error) {
      console.error('Date formatting error:', error);
      return dateString || 'Tarih bilinmiyor';
    }
  }

  const getCategoryName = (taxonomyId: number) => {
    const categories: { [key: number]: string } = {
      1027: "Duvar Dekorasyonu",
      2078: "Dijital Baskılar",
    }
    return categories[taxonomyId] || "Bilinmeyen Kategori"
  }

  const startEdit = (itemId: string, field: string, currentValue: string) => {
    setEditingItemId(itemId);
    setEditingField(field);
    if (field === 'tags') {
      // Etiketler için array kullan
      const tags = Array.isArray(currentValue) ? currentValue : 
                   typeof currentValue === 'string' ? currentValue.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];
      setEditingTags(tags);
      setNewTagInput('');
    } else {
      setTempEditValue(currentValue);
    }
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    setEditingField(null);
    setTempEditValue('');
    setEditingTags([]);
    setNewTagInput('');
    setEditingMediaItemId(null);
  };

  const removeTag = (tagToRemove: string) => {
    setEditingTags(tags => tags.filter(tag => tag !== tagToRemove));
  };

  const addTag = () => {
    const input = newTagInput.trim();
    
    if (!input) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Etiket boş olamaz"
      });
      return;
    }
    
    // VİRGÜLLE AYRILMIŞ ETIKETLER - Toplu ekleme
    if (input.includes(',')) {
      const newTags = input
        .split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0 && tag.length <= 20)
        .filter(tag => !editingTags.includes(tag))
        .slice(0, 13 - editingTags.length); // Sadece kalan slot kadar ekle
      
      if (newTags.length === 0) {
        toast({
          variant: "destructive",
          title: "Hata",
          description: "Geçerli yeni etiket bulunamadı (max 20 karakter, tekrar olmayan)"
        });
        return;
      }
      
      const finalTags = [...editingTags, ...newTags].slice(0, 13); // Maximum 13 etiket
      setEditingTags(finalTags);
      setNewTagInput('');
      
      toast({
        title: "Başarılı",
        description: `${newTags.length} etiket eklendi (Toplam: ${finalTags.length}/13)`
      });
      
      return;
    }
    
    // TEK ETİKET EKLEME - Mevcut sistem
    const trimmedTag = input.toLowerCase();
    
    if (trimmedTag.length > 20) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Etiket 20 karakterden uzun olamaz"
      });
      return;
    }
    
    if (editingTags.includes(trimmedTag)) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Bu etiket zaten ekli"
      });
      return;
    }
    
    if (editingTags.length >= 13) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Maksimum 13 etiket ekleyebilirsiniz"
      });
      return;
    }
    
    setEditingTags(tags => [...tags, trimmedTag]);
    setNewTagInput('');
  };

  const startMediaEdit = (itemId: string) => {
    setEditingMediaItemId(itemId);
  };

  const removeImage = async (itemId: string, imageIndex: number) => {
    try {
      const response = await fetch('/api/queue/update-media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          action: 'remove_image',
          imageIndex
        })
      });

      if (response.ok) {
        // Local state güncelle
        setQueueItems(items => 
          items.map(item => 
            item.id === itemId 
              ? {
                  ...item,
                  product_data: {
                    ...item.product_data,
                    images: item.product_data.images?.filter((_: any, idx: number) => idx !== imageIndex) || []
                  }
                }
              : item
          )
        );
        
        toast({
          title: "Başarılı",
          description: "Resim silindi"
        });
      }
    } catch (error) {
      console.error('Resim silme hatası:', error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Resim silinemedi"
      });
    }
  };

  const reorderImages = async (itemId: string, fromIndex: number, toIndex: number) => {
    try {
      const response = await fetch('/api/queue/update-media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          action: 'reorder_images',
          fromIndex,
          toIndex
        })
      });

      if (response.ok) {
        // Local state güncelle
        setQueueItems(items => 
          items.map(item => {
            if (item.id === itemId && item.product_data.images) {
              const newImages = [...item.product_data.images];
              const [removed] = newImages.splice(fromIndex, 1);
              newImages.splice(toIndex, 0, removed);
              
              return {
                ...item,
                product_data: {
                  ...item.product_data,
                  images: newImages
                }
              };
            }
            return item;
          })
        );
        
        toast({
          title: "Başarılı",
          description: "Resim sırası güncellendi"
        });
      }
    } catch (error) {
      console.error('Resim sıralama hatası:', error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Resim sırası güncellenemedi"
      });
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedImageIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number, itemId: string) => {
    e.preventDefault();
    if (draggedImageIndex !== null && draggedImageIndex !== dropIndex) {
      reorderImages(itemId, draggedImageIndex, dropIndex);
    }
    setDraggedImageIndex(null);
  };

  // Tüm tagleri temizleme fonksiyonu
  const clearAllTags = async (itemId: string) => {
    try {
      const response = await fetch('/api/queue/update-item', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          field: 'tags',
          value: []
        })
      });

      if (response.ok) {
        // Local state güncelle
        setQueueItems(items => 
          items.map(item => 
            item.id === itemId 
              ? {
                  ...item,
                  product_data: {
                    ...item.product_data,
                    tags: []
                  }
                }
              : item
          )
        );

        toast({
          title: "Başarılı",
          description: "Tüm etiketler temizlendi"
        });
      } else {
        throw new Error('Failed to clear tags');
      }
    } catch (error) {
      console.error('Tag temizleme hatası:', error);
      toast({
        title: "Hata",
        description: "Etiketler temizlenirken hata oluştu",
        variant: "destructive"
      });
    }
  };

  const processQueueItem = useCallback(async (itemId: string) => {
    console.log('🚀 processQueueItem başlatılıyor:', itemId);
    try {
      // İşlem süresini ölçmek için timer başlat
      // Güvenli bir şekilde window nesnesine özellik ekle
      if (typeof window !== 'undefined') {
        (window as any).processingStartTime = performance.now();
      }
      setCurrentlyProcessing(itemId);
      
      // ⚡ SPEED: Direkt individual item API'si kullan
      const itemResponse = await fetch(`/api/queue/item/${itemId}`);
      
      if (!itemResponse.ok) {
        throw new Error(`Queue item bulunamadı: ${itemResponse.status}`);
      }
      
      const queueItem = await itemResponse.json();

      // Base64 resimlerini File objelerine dönüştür
      const formData = new FormData();
      
      // Product data'dan base64 image/video data'yı temizle
      const cleanProductData = { ...queueItem.product_data };
      
      // 🔧 BAŞLIK 140 KARAKTER KONTROLÜ VE DÜZELTMESİ
      if (cleanProductData.title && cleanProductData.title.length > 140) {
        console.log(`⚠️ Başlık çok uzun (${cleanProductData.title.length} karakter), kısaltılıyor...`);
        
        // Son kelimeyi sil sil, 140 karakter altına düşene kadar
        let shortTitle = cleanProductData.title;
        while (shortTitle.length > 140) {
          const words = shortTitle.trim().split(' ');
          if (words.length > 1) {
            words.pop(); // Son kelimeyi sil
            shortTitle = words.join(' ');
          } else {
            // Tek kelime varsa, 140 karakterde kes
            shortTitle = shortTitle.substring(0, 140).trim();
            break;
          }
        }
        
        cleanProductData.title = shortTitle;
        console.log(`✅ Başlık kısaltıldı: "${shortTitle}" (${shortTitle.length} karakter)`);
      }
      
      // Images ve video'yu product data'dan çıkar (FormData'ya ayrı ekleyeceğiz)
      if (cleanProductData.images) {
        delete cleanProductData.images;
      }
      if (cleanProductData.video) {
        delete cleanProductData.video;
      }
      
      // Description'dan base64 data'yı temizle
      if (cleanProductData.description && typeof cleanProductData.description === 'string') {
        cleanProductData.description = cleanProductData.description.replace(/data:image\/[^;]+;base64,[\w+/=]+/g, '[IMAGE_REMOVED]');
        cleanProductData.description = cleanProductData.description.replace(/[A-Za-z0-9+/]{100,}={0,2}/g, '[LONG_STRING_REMOVED]');
      }
      
      console.log('🧹 Frontend temizlik:', {
        original_size: JSON.stringify(queueItem.product_data).length,
        cleaned_size: JSON.stringify(cleanProductData).length,
        has_images: !!(queueItem.product_data.images?.length),
        has_video: !!queueItem.product_data.video
      });
      
      // 🔧 ARTIK TÜM VERİLER product_data İÇİNDE - SADECE BAŞLIK KONTROL EDİP DİREKT KULLAN
      const completeProductData = {
        ...cleanProductData
        // Artık queue API'den tüm veriler product_data içinde geliyor
      };
      
      console.log('🔧 Tamamlanmış ürün verisi:', {
        title: completeProductData.title,
        shop_section_id: completeProductData.shop_section_id,
        description_length: completeProductData.description?.length,
        description_preview: completeProductData.description?.substring(0, 50) + '...',
        quantity: completeProductData.quantity,
        price: completeProductData.price,
        has_variations: completeProductData.has_variations,
        variations_count: completeProductData.variations?.length,
        renewal_option: completeProductData.renewal_option,
        is_personalizable: completeProductData.is_personalizable
      });
      
      console.log('🔍 Queue item product_data detayı:', {
        product_data_shop_section_id: queueItem.product_data.shop_section_id,
        product_data_description_length: queueItem.product_data.description?.length,
        product_data_quantity: queueItem.product_data.quantity,
        product_data_price: queueItem.product_data.price,
        product_data_has_variations: queueItem.product_data.has_variations,
        product_data_variations_length: queueItem.product_data.variations?.length
      });
      
      formData.append('listingData', JSON.stringify(completeProductData));

      // Resimler - API'den gelen base64 formatını kontrol et
      if (queueItem.product_data.images && queueItem.product_data.images.length > 0) {
        console.log('🖼️ Processing images for upload:', queueItem.product_data.images.length);
        queueItem.product_data.images.forEach((image: any, index: number) => {
          const imageData = image.data || image.base64; // API'den base64 field'ı gelebilir
          if (imageData) {
            console.log(`🖼️ Converting image ${index + 1}: ${image.name} (${image.type})`);
            const file = base64ToFile(imageData, image.name || `image_${index + 1}.jpg`, image.type || 'image/jpeg');
            formData.append(`imageFile_${index}`, file);
          } else {
            console.warn(`⚠️ Image ${index + 1} missing data/base64 field:`, image);
          }
        });
      } else {
        console.log('🖼️ No images to upload');
      }

      // Video - API'den gelen base64 formatını kontrol et  
      if (queueItem.product_data.video) {
        console.log('🎥 Processing video for upload:', {
          hasVideo: true,
          hasData: !!queueItem.product_data.video.data,
          hasBase64: !!queueItem.product_data.video.base64,
          name: queueItem.product_data.video.name,
          type: queueItem.product_data.video.type
        });
        
        const videoData = queueItem.product_data.video.data || queueItem.product_data.video.base64;
        if (videoData) {
          console.log('🎥 Converting video:', queueItem.product_data.video.name || 'video.mp4');
          const videoFile = base64ToFile(
            videoData,
            queueItem.product_data.video.name || 'video.mp4',
            queueItem.product_data.video.type || 'video/mp4'
          );
          formData.append('videoFile', videoFile);
        } else {
          console.warn('⚠️ Video object exists but missing data/base64 field:', queueItem.product_data.video);
        }
      } else {
        console.log('🎥 No video to upload');
      }

      console.log('📤 Etsy API\'sine gönderiliyor...', {
        endpoint: '/api/etsy/listings/create',
        hasImages: queueItem.product_data.images?.length || 0,
        hasVideo: !!queueItem.product_data.video,
        videoHasData: queueItem.product_data.video?.data ? 'YES' : 'NO',
        title: queueItem.product_data.title
      });

      // Direkt Etsy API'sine gönder
      const response = await fetch('/api/etsy/listings/create', {
        method: 'POST',
        body: formData
      });

      console.log('📥 Etsy API yanıtı:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Başarılı yanıt:', result);
        
        // Database'den ürünü sil ve localStorage'a tamamlanan olarak ekle
        const deleteResponse = await fetch('/api/queue', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'delete_selected',
            itemIds: [itemId],
            user_id: 'local-user-123'
          })
        });
        
        const deleteResult = await deleteResponse.json();
        
        // Değişkenleri üst scope'ta tanımla
        let newCompletedCount = 0;
        let completedData: any = null;
        
        if (deleteResult.success) {
          // İşlem süresini hesapla
          const processingTime = performance.now() - ((window as any).processingStartTime || 0);
          
          // Tamamlananlar sayacını localStorage'dan gerçek sayıyı alarak hesapla
          const currentCompletedKeys = Object.keys(localStorage).filter(key => key.startsWith('completed_'));
          const currentValidCompleted = currentCompletedKeys.filter(key => {
            try {
              const data = JSON.parse(localStorage.getItem(key) || '{}');
              return data.title && data.completed_at && !isNaN(new Date(data.completed_at).getTime());
            } catch {
              localStorage.removeItem(key);
              return false;
            }
          });
          newCompletedCount = currentValidCompleted.length + 1;
          completedData = {
            title: queueItem.product_data.title,
            completed_at: new Date().toISOString(),
            etsy_listing_id: result.listing_id,
            processing_time: Math.round(processingTime / 1000) // saniye olarak
          };
          
          if (typeof window !== 'undefined') {
            localStorage.setItem('completed_count', newCompletedCount.toString());
            localStorage.setItem(`completed_${itemId}`, JSON.stringify(completedData));
          }
          
          setCompletedCount(newCompletedCount);
          setCompletedItems(prev => [{ key: `completed_${itemId}`, data: completedData }, ...prev]);
          
          // API limit bilgisi - SAFE
          const apiLimitInfo = (result.rate_limit && result.rate_limit.daily_limit) ? 
            `${((result.rate_limit.daily_limit || 0) - (result.rate_limit.api_calls_used || 1)).toLocaleString()}/${(result.rate_limit.daily_limit || 0).toLocaleString()}` : 
            'Bilinmiyor';
          
          // Harika emojili log
          console.log(`
🎉 ═══════════════════════════════════════════
✅ ÜRÜN BAŞARIYLA GÖNDERİLDİ!
📦 Ürün Adı: ${queueItem.product_data.title}
⏱️  Süre: ${Math.round(processingTime / 1000)} saniye
🔢 Kalan API Limit: ${apiLimitInfo}
🆔 Etsy ID: ${result.listing_id}
📊 Toplam Tamamlanan: ${completedCount}
═══════════════════════════════════════════`);
          
        } else {
          console.error('❌ Database\'den silinirken hata:', deleteResult.error || deleteResult.message || 'Bilinmeyen hata');
          console.error('❌ DELETE response detayı:', deleteResult);
        }

        // Local state'i güncelle (artık sadece filtreli görünüm için)
        setQueueItems(items => 
          items.filter(item => item.id !== itemId) // Silinen ürünü listeden çıkar
        );
        
        // Rate limit bilgilerini state'e kaydet
        if (result.rate_limit) {
          setRateLimitInfo({
            remaining: result.rate_limit.remaining || 0,
            limit: result.rate_limit.limit || 0,
            reset: result.rate_limit.reset || null,
            dailyUsed: result.rate_limit.api_calls_used || 1,
            dailyLimit: result.rate_limit.daily_limit || 0
          });
          
          // Console'da detaylı log
          console.log('⚡ RATE LIMIT BİLGİLERİ GÜNCELLENDI:');
          console.log(`   📊 Kalan API: ${result.rate_limit.remaining}/${result.rate_limit.limit}`);
          console.log(`   📅 Günlük: ${result.rate_limit.api_calls_used}/${result.rate_limit.daily_limit} kullanıldı`);
          console.log(`   🕒 Reset: ${result.rate_limit.reset ? new Date(result.rate_limit.reset).toLocaleString('tr-TR') : 'Bilinmiyor'}`);
        }
        
        // Rate limit bilgisi varsa göster - SAFE
        let toastDescription = `Ürün Etsy'e gönderildi ve tamamlandı (${newCompletedCount || 0}) - ID: ${result.listing_id}`;
        if (result.rate_limit && result.rate_limit.daily_limit) {
          const usedCalls = result.rate_limit.api_calls_used || 1;
          const dailyLimit = result.rate_limit.daily_limit || 0;
          const remainingCalls = Math.max(0, dailyLimit - usedCalls);
          toastDescription += `\n📊 API Limit: ${(remainingCalls || 0).toLocaleString()}/${(dailyLimit || 0).toLocaleString()} kaldı`;
        }
        
        toast({
          title: "Ürün Tamamlandı",
          description: toastDescription
        });
      } else {
        console.error('❌ HTTP Hatası:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('❌ Hata detayı:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || 'Gönderim başarısız' };
        }
        
        throw new Error(errorData.message || errorData.error || 'Gönderim başarısız');
      }
    } catch (error) {
      // Error objesini farklı şekillerde yazdırmaya çalış
      console.error('🚨 RAW ERROR:', error);
      console.error('🚨 ERROR STRING:', String(error));
      console.error('🚨 ERROR JSON:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      console.error('🚨 DETAYLI KUYRUK İŞLEME HATASI:', {
        error: error instanceof Error ? error.toString() : String(error),
        errorMessage: error instanceof Error ? error.message : 'Bilinmeyen hata',
        errorStack: error instanceof Error ? error.stack : 'Stack yok',
        errorType: typeof error,
        errorConstructor: error instanceof Object ? error.constructor?.name : 'Unknown',
        itemId,
        userId
      });
      
      // Response hatası varsa detayını göster
      if (error instanceof Error && error.message.includes('fetch')) {
        console.error('🌐 FETCH HATASI - Network veya server sorunu olabilir');
      }
      
      // 🔄 RETRY LOGİĞİ - 2 deneme sonrası atla
      const currentItem = queueItems.find(item => item.id === itemId);
      const retryCount = ((currentItem as any)?.retry_count || 0) + 1;
      
      if (retryCount < 3) {
        console.log(`🔄 Retry ${retryCount}/2 - Tekrar deneniyor:`, itemId);
        
        // Retry count'u artır ve tekrar pending yap
        setQueueItems(items => 
          items.map(item => 
            item.id === itemId 
              ? {
                  ...item,
                  status: 'pending' as const,
                  retry_count: retryCount,
                  error_message: error instanceof Error ? error.message : 'Bilinmeyen hata'
                }
              : item
          )
        );
        
        toast({
          title: `Tekrar Deneme ${retryCount}/2`,
          description: `Hata sonrası tekrar deneniyor: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`
        });
      } else {
        console.log(`❌ Max retry limit (2) reached, skipping item:`, itemId);
        
        // 2 deneme sonrası failed olarak işaretle ve atla
        setQueueItems(items => 
          items.map(item => 
            item.id === itemId 
              ? {
                  ...item,
                  status: 'failed' as const,
                  retry_count: retryCount,
                  error_message: `Max retry limit reached: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`
                }
              : item
          )
        );
        
        toast({
          variant: "destructive",
          title: "Ürün Atlandı",
          description: `2 deneme sonrası başarısız oldu ve atlandı: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`
        });
      }
    } finally {
      setCurrentlyProcessing(null);
    }
  }, [toast]);

  const retryQueueItem = useCallback(async (itemId: string) => {
    try {
      // Önce failed durumu pending'e çevir ve öğeyi listenin başına taşı
      setQueueItems(items => {
        const itemToRetry = items.find(item => item.id === itemId);
        if (!itemToRetry) return items;
        
        const updatedItem = {
          ...itemToRetry,
          status: 'pending' as const,
          error_message: undefined, // Hata mesajını temizle
          created_at: new Date().toISOString() // Yeni zaman damgası ile başa taşı
        };
        
        // Retry edilen öğeyi başa al, diğerlerini filtrele
        const otherItems = items.filter(item => item.id !== itemId);
        return [updatedItem, ...otherItems];
      });

      // Firebase'de de durumu güncelle
      await fetch('/api/queue/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          field: 'status',
          value: 'pending'
        })
      });

      toast({
        title: "Tekrar Deneme",
        description: "Ürün kuyruğun başına eklendi ve beklemede"
      });
    } catch (error) {
      console.error('Tekrar deneme hatası:', error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Tekrar deneme başarısız"
      });
    }
  }, [toast]);

  const clearQueue = useCallback(async () => {
    const totalItems = queueItems.length + stats.completed;
    
    if (!confirm(`Tüm kuyruk temizlenecek (${queueItems.length} aktif + ${stats.completed} tamamlanan = ${totalItems} toplam). Bu işlem geri alınamaz. Emin misiniz?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/queue/clear?user_id=local-user-123`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        
        // Local state'i temizle
        setQueueItems([]);
        
        // localStorage'daki tamamlanan ürünleri de temizle ve state'i sıfırla
        if (typeof window !== 'undefined') {
          const completedKeys = Object.keys(localStorage).filter(key => key.startsWith('completed_'));
          completedKeys.forEach(key => localStorage.removeItem(key));
          localStorage.removeItem('completed_count');
        }
        setCompletedCount(0);
        setCompletedItems([]);
        
        toast({
          title: "Kuyruk Tamamen Temizlendi",
          description: `${totalItems} ürün (aktif + tamamlanan) başarıyla silindi`
        });
      } else {
        throw new Error('Kuyruk temizlenemedi');
      }
    } catch (error) {
      console.error('Kuyruk temizleme hatası:', error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Kuyruk temizlenemedi"
      });
    }
  }, [queueItems.length, stats.completed, toast]);

  const deleteSelectedItems = useCallback(async () => {
    if (selectedItems.length === 0) return;
    
    if (!confirm(`${selectedItems.length} seçili ürün silinecek. Bu işlem geri alınamaz. Emin misiniz?`)) {
      return;
    }

    try {
      const response = await fetch('/api/queue', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'delete_selected',
          itemIds: selectedItems,
          user_id: 'local-user-123'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Ürünler Silindi",
          description: `${selectedItems.length} ürün başarıyla silindi`
        });
        setSelectedItems([]);
        await loadQueueItems();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Silme hatası:', error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Seçili ürünler silinemedi"
      });
    }
  }, [selectedItems, toast]);

  // Reset List function - clears both Firebase queue and localStorage completed items
  const resetList = useCallback(async () => {
    try {
      if (!confirm('Bu işlem tüm kuyruk ve tamamlanan ürün listesini sıfırlayacak. Bu işlem geri alınamaz. Emin misiniz?')) {
        return;
      }

      console.log('🧹 Liste sıfırlama başlatılıyor...');
      // Clear Firebase queue
      const response = await fetch('/api/queue', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'clear_all',
          user_id: 'local-user-123'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Clear localStorage completed items
        if (typeof window !== 'undefined') {
          const completedKeys = Object.keys(localStorage).filter(key => key.startsWith('completed_'));
          completedKeys.forEach(key => localStorage.removeItem(key));
          localStorage.removeItem('completed_count');
        }
        
        // Reset all state
        setQueueItems([]);
        setSelectedItems([]);
        setCompletedCount(0);
        setCompletedItems([]);
        setQueueStats({
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0
        });
        
        toast({
          title: "Liste Sıfırlandı",
          description: "Tüm kuyruk ve tamamlanan ürün listesi temizlendi"
        });
        
        // Reload queue to sync with backend
        await loadQueueItems();
      } else {
        console.error('🔴 Reset result:', result);
        throw new Error(result.error || result.message || 'Reset işlemi başarısız');
      }
    } catch (error) {
      console.error('🔴 RESET LİST HATASI:', error);
      console.error('🔴 Error stack:', error instanceof Error ? error.stack : 'No stack');
      console.error('🔴 Error message:', error instanceof Error ? error.message : String(error));
      
      toast({
        variant: "destructive",
        title: "Liste Sıfırlama Hatası",
        description: error instanceof Error ? (error.message || "Error mesajı boş") : (String(error) || "Bilinmeyen hata oluştu")
      });
    }
  }, [toast, loadQueueItems, setQueueItems, setSelectedItems, setCompletedCount, setCompletedItems, setQueueStats]);

  const saveEdit = async (itemId: string, field: string, newValue?: string | string[]) => {
    try {
      let valueToSave = newValue;
      
      // Başlık validasyonu
      if (field === 'title' && typeof newValue === 'string') {
        if (newValue.trim().length === 0) {
          toast({
            variant: "destructive",
            title: "Hata",
            description: "Başlık boş olamaz"
          });
          return;
        }
        if (newValue.length > 140) {
          toast({
            variant: "destructive",
            title: "Hata",
            description: "Başlık 140 karakterden uzun olamaz"
          });
          return;
        }
      }
      
      // Etiketler için editingTags array'ini kullan
      if (field === 'tags') {
        valueToSave = editingTags;
      }
      
      // Firebase'de kuyruk öğesini güncelle
      const response = await fetch('/api/queue/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          field,
          value: valueToSave
        })
      });

      if (response.ok) {
        // Local state'i güncelle
        setQueueItems(items => 
          items.map(item => 
            item.id === itemId 
              ? {
                  ...item,
                  product_data: {
                    ...item.product_data,
                    [field]: valueToSave
                  }
                }
              : item
          )
        );
        
        cancelEdit();
        toast({
          title: "Başarılı",
          description: "Ürün bilgisi güncellendi"
        });
      } else {
        throw new Error('Güncelleme başarısız');
      }
    } catch (error) {
      console.error('Güncelleme hatası:', error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Ürün güncellenemedi"
      });
    }
  };

  
  // Ölçü ve Fiyat Güncelleme bileşeni - Yeniden tasarlanmış versiyon
  const PriceUpdateComponent = () => {
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
    
    // Sayfa yüklendiğinde otomatik olarak ürünleri yükleme - kaldırıldı
    // Bunun yerine, kullanıcı bir butona tıklayarak ürünleri yükleyecek
    
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
    }, [searchText, products]);

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
          </>
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
      </div>
    );
  };
  
  const renderAutoAdd = () => <AutoProductPanel />;
  const renderAutoDigital = () => <AutoProductPanel isDigital={true} />;
  const renderGelatoAdd = () => <GelatoProductPanel />;

  // Rate Limit Widget Component
  const RateLimitWidget = () => {
    if (!rateLimitInfo || !store) return null;
    
    const remainingPercentage = rateLimitInfo.limit > 0 ? (rateLimitInfo.remaining / rateLimitInfo.limit) * 100 : 0;
    const dailyRemainingPercentage = rateLimitInfo.dailyLimit > 0 ? ((rateLimitInfo.dailyLimit - rateLimitInfo.dailyUsed) / rateLimitInfo.dailyLimit) * 100 : 0;
    
    return (
      <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs z-50 min-w-48">
        <div className="font-semibold text-gray-700 mb-2 flex items-center gap-1">
          ⚡ Etsy API Durumu
        </div>
        
        <div className="space-y-2">
          {/* Hourly Rate Limit */}
          <div>
            <div className="flex justify-between text-gray-600 mb-1">
              <span>Saatlik:</span>
              <span>{rateLimitInfo.remaining}/{rateLimitInfo.limit}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div 
                className={`h-1 rounded-full transition-all ${remainingPercentage > 50 ? 'bg-green-500' : remainingPercentage > 20 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${remainingPercentage}%` }}
              ></div>
            </div>
          </div>
          
          {/* Daily Rate Limit */}
          <div>
            <div className="flex justify-between text-gray-600 mb-1">
              <span>Günlük:</span>
              <span>{rateLimitInfo.dailyLimit - rateLimitInfo.dailyUsed}/{rateLimitInfo.dailyLimit}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div 
                className={`h-1 rounded-full transition-all ${dailyRemainingPercentage > 50 ? 'bg-green-500' : dailyRemainingPercentage > 20 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${dailyRemainingPercentage}%` }}
              ></div>
            </div>
          </div>
          
          {/* Reset Time */}
          {rateLimitInfo.reset && (
            <div className="text-gray-500 text-xs">
              Reset: {new Date(rateLimitInfo.reset).toLocaleTimeString('tr-TR')}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <>
        {/* Rate Limit Widget */}
        <RateLimitWidget />
        
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
                    : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
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
        {activeTab === 'price-update' && <PriceUpdateComponent />}
        {activeTab === 'auto-add' && renderAutoAdd()}
        {activeTab === 'auto-digital' && renderAutoDigital()}
        {activeTab === 'gelato-add' && renderGelatoAdd()}
      </div>

        <ProductFormModal 
          isOpen={isProductFormOpen} 
          onClose={() => setIsProductFormOpen(false)} 
        />
      </>
    </DndProvider>
  );
} 