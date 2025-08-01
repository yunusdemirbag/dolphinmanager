'use client';

// Hydration hatalarını önlemek için
import dynamic from 'next/dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package, Clock, Play, Pause, Settings as SettingsIcon, Image, Loader2, RotateCcw, Timer, CheckCircle, XCircle, Upload, Trash2, Edit3, Video, Trash, RefreshCw, Download } from "lucide-react";
import ProductFormModal from "@/components/ProductFormModal";
import AutoProductPanel from "@/components/AutoProductPanel";
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
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [products, setProducts] = useState<any[]>(initialProducts || []);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [hasMoreProducts, setHasMoreProducts] = useState(!!initialNextCursor);
  const [currentShopId, setCurrentShopId] = useState<string | null>(null);
  const [isQuickSyncing, setIsQuickSyncing] = useState(false);
  
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

  // Mağaza ürünlerini yükle (geçici çözüm: client-side filtreleme)
  const fetchProductsForStore = async (shopId: string) => {
    try {
      console.log(`🔄 ${shopId} mağazasının ürünleri yükleniyor...`);
      
      // Daha fazla ürün çek ki tüm shop'ların ürünleri gelsin
      const timestamp = Date.now();
      const response = await fetch(`/api/products/paginate?userId=${userId}&limit=200&t=${timestamp}`);
      const data = await response.json();
      
      console.log('🔍 API Response Debug:', {
        success: data.success,
        productCount: data.products?.length,
        error: data.error
      });
      
      if (data.success) {
        // ShopId'ye göre filtrele
        const shopIdNumber = parseInt(shopId);
        console.log(`🔍 Filtreleme başlıyor: aranan shopId=${shopIdNumber}, toplam ürün=${data.products?.length || 0}`);
        
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
        
        const filteredProducts = (data.products || []).filter((product: any) => 
          product.shop_id === shopIdNumber
        );
        
        console.log(`✅ ${filteredProducts.length} ürün filtrelendi (${shopId} mağazası, toplam: ${data.products?.length || 0})`);
        
        // Tüm unique shop_id'leri göster
        const allShopIds = [...new Set(data.products.map((p: any) => p.shop_id))];
        console.log(`🏪 Tüm shop_id'ler:`, allShopIds);
        
        setProducts(filteredProducts);
        setNextCursor(null);
        setHasMoreProducts(false);
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

  // Quick Sync - Cache'li sistem: İlk tıklamada Firebase'e kaydet, sonrakılerde cache'den göster
  const quickSyncProducts = async (shopId: string) => {
    if (isQuickSyncing) {
      console.log('⚠️ Quick sync zaten çalışıyor, atlanıyor...');
      return;
    }
    
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
        setNextCursor(null);
        setHasMoreProducts(false);
        
        toast({
          title: 'Güncel Ürünler Yüklendi!',
          description: `${data.products.length} ürün Etsy'den çekildi.`,
          variant: 'default',
        });
        
      } else {
        console.error('❌ Quick sync hatası:', data.error);
        
        toast({
          title: 'Sync Hatası',
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
    if (!nextCursor || isLoadingProducts) return;
    
    setIsLoadingProducts(true);
    try {
      // This is a new API route we'll need to create to specifically handle pagination
      const response = await fetch(`/api/products/paginate?user_id=${userId}&cursor=${nextCursor}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(prev => [...prev, ...(data.products || [])]);
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
    setSyncProgress({ current: 0, total: 0, status: 'Başlatılıyor...' });
    
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
        status: 'Tamamlandı'
      });
      
      toast({
        title: "Başarılı",
        description: `${data.syncResult.synced_listings} ürün verisi çekildi ve kaydedildi`
      });
      
      // Clear progress after 3 seconds
      setTimeout(() => {
        setSyncProgress(null);
      }, 3000);
      
    } catch (error) {
      console.error('❌ Store sync error:', error);
      
      setSyncProgress({ current: 0, total: 0, status: 'Hata!' });
      
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
    }
    // Store bilgilerini sayfa açıldığında yükle
    loadStoreInfo();
  }, [activeTab, fetchQueue]);

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
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(syncProgress.current / syncProgress.total) * 100}%` 
                        }}
                      />
                    </div>
                  )}
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
                onClick={() => {/* Full sync fonksiyonu */}}
                disabled={isSyncing}
                variant="outline"
                className="bg-green-50 hover:bg-green-100 border-green-200"
              >
                {isSyncing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Full Sync
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
        <Card className="p-4">
          <div className="text-center text-gray-700">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Henüz ürün bulunamadı</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map(product => {
              return (
                <Card key={product.listing_id || product.id} className="overflow-hidden">
                  <div className="aspect-square relative bg-gray-100">
                    {product.images && product.images.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={product.images[0]?.url_570xN || product.images[0]?.url_fullxfull} 
                        alt={product.title}
                        className="object-cover w-full h-full"
                        onError={(e) => {
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
                    <div className="flex items-center justify-between text-sm text-gray-700 mt-2">
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
              );
            })}
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
      window.processingStartTime = performance.now();
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
        let completedData = null;
        
        if (deleteResult.success) {
          // İşlem süresini hesapla
          const processingTime = performance.now() - (window.processingStartTime || 0);
          
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
        error: error.toString(),
        errorMessage: error instanceof Error ? error.message : 'Bilinmeyen hata',
        errorStack: error instanceof Error ? error.stack : 'Stack yok',
        errorType: typeof error,
        errorConstructor: error.constructor?.name,
        itemId,
        userId
      });
      
      // Response hatası varsa detayını göster
      if (error instanceof Error && error.message.includes('fetch')) {
        console.error('🌐 FETCH HATASI - Network veya server sorunu olabilir');
      }
      
      // 🔄 RETRY LOGİĞİ - 2 deneme sonrası atla
      const currentItem = queueItems.find(item => item.id === itemId);
      const retryCount = (currentItem?.retry_count || 0) + 1;
      
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

  
  const renderAutoAdd = () => <AutoProductPanel />;
  const renderAutoDigital = () => <AutoProductPanel isDigital={true} />;

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
        {activeTab === 'auto-add' && renderAutoAdd()}
        {activeTab === 'auto-digital' && renderAutoDigital()}
      </div>

        <ProductFormModal 
          isOpen={isProductFormOpen} 
          onClose={() => setIsProductFormOpen(false)} 
        />
      </>
    </DndProvider>
  );
} 