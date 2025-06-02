"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Package,
  Search,
  Filter,
  Plus,
  Edit,
  Copy,
  Trash2,
  Sparkles,
  TrendingUp,
  Eye,
  ShoppingCart,
  Star,
  AlertTriangle,
  CheckCircle,
  Upload,
  BarChart3,
  Save,
  X,
  Image as ImageIcon,
  ExternalLink,
  Info,
  RefreshCw,
  Clock,
  Check,
  MoreHorizontal,
  Loader2,
  LayoutGrid,
  List,
  ArrowDownUp,
  ChevronDown,
  Store,
  ArrowDown,
  ArrowUp,
  Video, // Video ikonu için
} from "lucide-react"
import { createClientSupabase } from "@/lib/supabase"
import CurrentStoreNameBadge from "../components/CurrentStoreNameBadge"
import { toast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { ToastAction } from "@/components/ui/toast"
import { useRouter } from "next/navigation"

interface Product {
  listing_id: number
  title: string
  description: string
  price: {
    amount: number
    divisor: number
    currency_code: string
  }
  images: Array<{
    listing_image_id?: number; // Etsy'den gelen resim ID'si
    url_570xN: string
    url_fullxfull?: string
    alt_text: string
    cache_key?: string
  }>
  tags: string[]
  state: "active" | "inactive" | "draft"
  views?: number
  sold?: number
  quantity: number
  created_timestamp: number
  last_modified_timestamp: number
  shop_id: number
  url: string
  metrics?: {
    views: number
    favorites: number
    sold: number
  }
}

interface CreateProductForm {
  title: string
  description: string
  price: number
  quantity: number
  tags: string[]
  materials: string[]
  who_made: "i_did" | "someone_else" | "collective"
  when_made: string
  taxonomy_id: number
  shipping_profile_id?: number
  processing_profile_id?: number
  processing_min?: number
  processing_max?: number
  processing_time_unit?: string
  state?: "active" | "draft"
  image_ids?: number[]
  // Varyasyonlar ve diğer detaylar
  variations?: Array<{
    property_values: Array<{
      scale_id: number
      value_ids: number[]
      values: string[]
    }>
  }>
  style?: string
  non_taxable?: boolean
  language?: string
  featured_rank?: number
  taxonomy_path?: string[]
  used_manufacturer?: boolean
  is_supply?: boolean
  is_customizable?: boolean
  is_digital?: boolean
  file_data?: string
  has_variations?: boolean
  production_partners?: string[]
  section_id?: number
  shop_section_id?: number
  inventory?: {
    products: Array<{
      property_values: Array<{
        scale_id: number
        value_ids: number[]
        values: string[]
      }>
    }>
  }
  should_auto_renew?: boolean;
  is_personalizable?: boolean;
  personalization_is_required?: boolean;
  personalization_instructions?: string;
  personalization_char_count_max?: number;
}

interface TaxonomyNode {
  id: number
  name: string
  level: number
  path: string[]
}

export default function ProductsClient() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("created_timestamp")
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterStatus, setFilterStatus] = useState("all")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState<Product | null>(null)
  const [taxonomyNodes, setTaxonomyNodes] = useState<TaxonomyNode[]>([])
  const [taxonomyError, setTaxonomyError] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState<CreateProductForm>({
    title: "",
    description: "",
    price: 0,
    quantity: 1,
    tags: [],
    materials: [],
    who_made: "i_did",
    when_made: "made_to_order",
    taxonomy_id: 1,
    processing_min: undefined,
    processing_max: undefined,
    processing_time_unit: "business_days" // Default to business days
  })
  const [tagInput, setTagInput] = useState("")
  const [materialInput, setMaterialInput] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [cachingImages, setCachingImages] = useState(false)
  const [cachingAllImages, setCachingAllImages] = useState(false)
  const [analytics, setAnalytics] = useState<Record<number, { view: number; sale: number; revenue: number }>>({});
  const [shippingProfiles, setShippingProfiles] = useState<{ shipping_profile_id: number; title: string; min_processing_time: number; max_processing_time: number; processing_time_unit: string; }[]>([]);
  const [loadingShippingProfiles, setLoadingShippingProfiles] = useState(false);
  const [processingProfiles, setProcessingProfiles] = useState<{ readiness_state_id: number; readiness_state: string; min_processing_time: number; max_processing_time: number; processing_time_unit: string; }[]>([]);
  const [loadingProcessingProfiles, setLoadingProcessingProfiles] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [refreshStatus, setRefreshStatus] = useState<{
    success?: boolean;
    message?: string;
  }>({})
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [selectAllChecked, setSelectAllChecked] = useState(false)
  const [currentStore, setCurrentStore] = useState<{ shop_name: string; shop_id: number } | null>(null);
  const [reconnectRequired, setReconnectRequired] = useState(false);
  const [showReconnectBanner, setShowReconnectBanner] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(100); // Varsayılan sayfa boyutu
  const [gridType, setGridType] = useState<'grid3' | 'grid5' | 'list'>('grid3');
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmDeleteProductId, setConfirmDeleteProductId] = useState<number | null>(null);
  const [etsyConnected, setEtsyConnected] = useState(true); // Track Etsy connection status
  // Add this state to track if image order has changed
  const [imagesReordered, setImagesReordered] = useState(false);
  // Add a new state for "No stores found" error
  const [noStoresFound, setNoStoresFound] = useState(false);
  // Ekle - çoklu resim seçimi için state
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [dragImageIndex, setDragImageIndex] = useState<number | null>(null);
  const [dropImageIndex, setDropImageIndex] = useState<number | null>(null);
  // Etsy yeniden bağlantı durumunu ve hata sayacını izlemek için değişkenler ekleyelim
  const [reconnectErrorCount, setReconnectErrorCount] = useState(0);
  const [lastReconnectAttempt, setLastReconnectAttempt] = useState<Date | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [pendingModalType, setPendingModalType] = useState<'edit' | 'create' | null>(null)
  const [isCopyMode, setIsCopyMode] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)
  const scrollYRef = useRef(0)
  // Ekle: Kopyalanan ürünü saklamak için yeni state
  const [productToCopy, setProductToCopy] = useState<Product | null>(null);

  // Add state for active tab in modals
  const [activeCreateTab, setActiveCreateTab] = useState('basic_info');
  const [activeEditTab, setActiveEditTab] = useState('basic_info');

  // ProductImage bileşenini daha güvenli hale getiriyorum:
  const ProductImage = ({ product }: { product: Product }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
    const [dragEndIndex, setDragEndIndex] = useState<number | null>(null);
    const [imagesReordered, setImagesReordered] = useState(false);
    const [newImages, setNewImages] = useState<any[]>([]);

  useEffect(() => {
      if (product.images && product.images.length > 0) {
        setNewImages(product.images);
      }
    }, [product.images]);

    const handleDragStart = (index: number) => {
      setIsDragging(true);
      setDragStartIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (dragStartIndex === null) return;
      setDragEndIndex(index);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (dragStartIndex === null || dragEndIndex === null) return;
      const images = [...newImages];
      const draggedImage = images[dragStartIndex];
      images.splice(dragStartIndex, 1);
      images.splice(dragEndIndex, 0, draggedImage);
      setNewImages(images);
      setImagesReordered(true);
      setDragStartIndex(null);
      setDragEndIndex(null);
    };

    return (
      <div className="relative">
        {product.images && product.images.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {newImages.map((image, index) => (
              <div
                key={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={handleDrop}
                className={`relative ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              >
                <img
                  src={image.url_570xN}
                  alt={image.alt_text || 'Product image'}
                  className="w-full h-32 object-cover rounded"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full h-32 bg-gray-200 rounded flex items-center justify-center">
            <span className="text-gray-500">No image available</span>
          </div>
        )}
      </div>
    );
  };
  
  useEffect(() => {
    loadProducts()
    loadTaxonomy()
    loadShippingProfiles()
    
    // İlk sayfa yüklendiğinde son yenileme zamanını ayarla
    setLastRefresh(new Date())
    
    // Otomatik yenileme için 3 saatlik timer başlat
    startAutoRefreshTimer()
    
    // Component unmount olduğunda timer'ı temizle
    return () => {
      if (autoRefreshTimerRef.current) {
        clearTimeout(autoRefreshTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    filterAndSortProducts()
  }, [searchTerm, sortBy, filterStatus, sortOrder, products])

  useEffect(() => {
    // Artık sahte analytics verisi yok, sadece gerçek Etsy verisi kullanılacak
  }, [products]);
  
  // Fetch store details for shop ID
  const fetchStoreDetails = async (shopId: number) => {
    try {
      const response = await fetch('/api/etsy/stores', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        console.error("Error fetching store details:", response.status);
        return;
      }
      
      const data = await response.json();
      
            // Yeni eklenen kısım: Resim yükleme
            if (imageFiles.length > 0 && data.listing_id) {
              alert("✅ Ürün başarıyla oluşturuldu! Resimler yükleniyor..."); // Kullanıcıya bilgi ver
              for (const file of imageFiles) {
                const formData = new FormData();
                formData.append('image', file); // 'image' anahtarının backend ile uyumlu olduğundan emin olun
    
                try {
                  // Resim yükleme API çağrısı
                  const uploadResponse = await fetch(`/api/etsy/listings/${data.listing_id}/images`, {
                    method: 'POST',
                    body: formData
                  });
    
                  if (!uploadResponse.ok) {
                    // Resim yükleme hatası durumunda loglama
                    const uploadErrorData = await uploadResponse.json().catch(() => ({ error: 'Unknown upload error' }));
                    console.error(`Resim yükleme hatası (${file.name}):`, uploadResponse.status, uploadErrorData);
                    // İsteğe bağlı: Kullanıcıya hangi resmin yüklenemediği hakkında bilgi verebilirsiniz
                  } else {
                    console.log(`Resim başarıyla yüklendi: ${file.name}`);
                  }
                } catch (uploadError) {
                  // Fetch sırasında bir hata oluşursa
                  console.error(`Resim yüklenirken beklenmeyen hata oluştu (${file.name}):`, uploadError);
                }
              }
              // Tüm resimler için yükleme denemeleri tamamlandıktan sonra
               // Resim yükleme tamamlandı mesajı (opsiyonel, toast kullanıldı)
               // Bu alert mesajını yukarıdaki alert ile birleştirdik.
              // toast({
              //   title: "Resimler Yüklendi",
              //   description: "Ürün resimleri başarıyla yüklendi.",
              // });
            } else {
               // Resim yoksa sadece ürünün başarıyla oluşturulduğunu belirt
               alert("✅ Ürün başarıyla oluşturuldu!")
            }
            // Resim yükleme bitişi

      if (data.stores && Array.isArray(data.stores) && data.stores.length > 0) {
        // Find the store with matching ID
        const matchingStore = data.stores.find((store: any) => 
          store.shop_id === shopId || parseInt(store.shop_id) === shopId
        );
        
        if (matchingStore) {
          setCurrentStore({
            shop_id: matchingStore.shop_id,
            shop_name: matchingStore.shop_name || `Mağaza #${matchingStore.shop_id}`
          });
          console.log("Store details updated:", matchingStore.shop_name);
        }
      }
    } catch (error) {
      console.error("Failed to fetch store details:", error);
    }
  };

  // Otomatik yenileme timer'ını başlat
  const startAutoRefreshTimer = useCallback(() => {
    // Önceki timer varsa temizle
    if (autoRefreshTimerRef.current) {
      clearTimeout(autoRefreshTimerRef.current)
    }
    
    // 3 saatlik timer ayarla (3 * 60 * 60 * 1000 = 10800000 ms)
    autoRefreshTimerRef.current = setTimeout(() => {
      console.log("Otomatik yenileme zamanı geldi")
      refreshProducts(false) // Sessiz yenileme (bildirim gösterme)
      // Timer'ı tekrar başlat
      startAutoRefreshTimer()
    }, 3 * 60 * 60 * 1000)
    
    console.log("Otomatik yenileme timer'ı başlatıldı - 3 saat sonra yenilenecek")
  }, [])
  
  // Veri yenileme fonksiyonu - skipReconnect parametresi ekleyerek iyileştirildi
  const refreshProducts = async (showNotification = true) => {
    try {
    setLoading(true);
      
      // First refresh Etsy connection data
      const refreshResponse = await fetch('/api/etsy/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          force_refresh: true,
          skip_reconnect: true // Yeni: Yeniden bağlanma isteğini azaltmak için
        })
      });
      
      // Yanıt durum kodunu kontrol et
      if (!refreshResponse.ok) {
        // HTTP yanıt kodu hatalıysa
        console.error("Etsy refresh API error:", refreshResponse.status, refreshResponse.statusText);
        
        // 401 veya 403 gibi yetkilendirme hatası ise
        if (refreshResponse.status === 401 || refreshResponse.status === 403) {
          // Son 30 dakikada çok fazla deneme yapıldıysa sınırlayalım
          if (reconnectErrorCount > 2 && lastReconnectAttempt) {
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
            if (lastReconnectAttempt > thirtyMinutesAgo) {
              console.log("Too many reconnect attempts in last 30 minutes, suppressing popup");
              // Hata bildirimini bastıralım ama state'i güncelleyelim
              setReconnectRequired(true);
              setEtsyConnected(false);
              setRefreshing(false);
              setReconnectErrorCount(prev => prev + 1);
              setLoading(false);
              return;
            }
          }
          
          setEtsyConnected(false);
          setReconnectRequired(true);
          setReconnectErrorCount(prev => prev + 1);
          
          toast({
            title: "Etsy bağlantısı gerekiyor",
            description: "Etsy mağazanıza yeniden bağlanmanız gerekiyor.",
            variant: "destructive",
            action: <ToastAction altText="Bağlan" onClick={handleReconnectEtsy}>Bağlan</ToastAction>
          });
          
          setLoading(false);
          return;
        }
        
        // Diğer API hataları için
        toast({
          title: "Yenileme başarısız",
          description: `API hatası: ${refreshResponse.status} ${refreshResponse.statusText}`,
          variant: "destructive"
        });
        
        setLoading(false);
        return;
      }
      
      // Yanıtı metin olarak al ve JSON'a çevirmeye çalış
      let refreshData;
      try {
        const textResponse = await refreshResponse.text();
        
        // Boş yanıt mı kontrol et
        if (!textResponse || textResponse.trim() === '') {
          console.log("Etsy API boş yanıt döndürdü, işleme devam ediliyor");
          refreshData = {}; // Boş nesne ile devam et
        } else {
          try {
            // JSON'a çevirmeyi dene
            refreshData = JSON.parse(textResponse);
          } catch (parseError) {
            console.error("JSON ayrıştırma hatası:", parseError);
            // JSON ayrıştırılamazsa metin olarak kullan
            refreshData = { error: textResponse };
          }
        }
      } catch (textError) {
        console.error("Yanıt metni okuma hatası:", textError);
        refreshData = { error: "Yanıt metni okunamadı" };
      }
      
      // refreshData değerini kontrol et
      if (refreshData && refreshData.reconnect_required) {
        console.error("Etsy bağlantısı yenileme başarısız, yeniden bağlantı gerekiyor:", refreshData);
        
        // Son 30 dakikada çok fazla deneme yapıldıysa sınırlayalım
        if (reconnectErrorCount > 2 && lastReconnectAttempt) {
          const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
          if (lastReconnectAttempt > thirtyMinutesAgo) {
            console.log("Too many reconnect attempts in last 30 minutes, suppressing popup");
            // Hata bildirimini bastıralım ama state'i güncelleyelim
            setReconnectRequired(true);
            setEtsyConnected(false);
            setRefreshing(false);
            setReconnectErrorCount(prev => prev + 1);
        setLoading(false);
        return;
          }
      }

        setReconnectRequired(true);
        setEtsyConnected(false);
        setReconnectErrorCount(prev => prev + 1);
        
        toast({
          title: "Etsy bağlantısı gerekiyor",
          description: "Etsy mağazanıza yeniden bağlanmanız gerekiyor.",
          variant: "destructive",
          action: <ToastAction altText="Bağlan" onClick={handleReconnectEtsy}>Bağlan</ToastAction>
        });
        
        setLoading(false);
        return;
      }
      
      // Buraya kadar geldiyse, bağlantı yenilemesi başarılı oldu demektir
      console.log("Etsy bağlantısı başarıyla yenilendi, ürünler yükleniyor");
      
      // Bağlantı sorunları hata sayacını sıfırla
      setReconnectErrorCount(0);
      setReconnectRequired(false);
      setEtsyConnected(true);
      
      try {
        // Ürünleri yükle
        await loadProducts(1);
        
      if (showNotification) {
          toast({
            title: "Ürünler yenilendi",
            description: "Ürün listesi başarıyla güncellendi."
          });
        }
      } catch (loadError) {
        console.error("Ürünleri yükleme hatası:", loadError);
        
        toast({
          title: "Ürünler yüklenemedi",
          description: "Bağlantı yenilendi ancak ürünler yüklenirken hata oluştu.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Yenileme işlemi sırasında beklenmeyen hata:", error);
      
      // Bağlantı sorunu olup olmadığını kontrol et
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      
      if (errorMessage.toLowerCase().includes("token") || 
          errorMessage.toLowerCase().includes("connection") || 
          errorMessage.toLowerCase().includes("unauthorized") ||
          errorMessage.toLowerCase().includes("yetki") ||
          errorMessage.toLowerCase().includes("bağlantı")) {
        
        // Son 30 dakikada çok fazla deneme yapıldıysa sınırlayalım
        if (reconnectErrorCount > 2 && lastReconnectAttempt) {
          const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
          if (lastReconnectAttempt > thirtyMinutesAgo) {
            console.log("Too many reconnect attempts in last 30 minutes, suppressing popup");
            // Hata bildirimini bastıralım ama state'i güncelleyelim
            setReconnectRequired(true);
            setEtsyConnected(false);
            setReconnectErrorCount(prev => prev + 1);
            setLoading(false);
            return;
          }
        }
        
        toast({
          title: "Etsy bağlantısı gerekiyor",
          description: "Etsy mağazanıza yeniden bağlanmanız gerekiyor.",
          variant: "destructive",
          action: <ToastAction altText="Bağlan" onClick={handleReconnectEtsy}>Bağlan</ToastAction>
        });
        
        setEtsyConnected(false);
        setReconnectRequired(true);
        setReconnectErrorCount(prev => prev + 1);
      } else {
        toast({
          title: "Yenileme başarısız",
          description: "Ürünler yenilenirken bir hata oluştu: " + errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async (page = currentPage) => {
    try {
      setLoading(true)
      setCurrentPage(page)
      setNoStoresFound(false) // Reset the no stores error state
      
      // Set up request parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        skip_cache: 'true', // Always skip cache to ensure fresh data
      });

      if (filterStatus !== 'all') {
        params.append('state', filterStatus);
      }
      
      const paramsString = params.toString();
      
      // Make API request with proper error handling
      const response = await fetch(`/api/etsy/listings?${paramsString}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      
      // If the response indicates unauthorized/token issues
      if (response.status === 401) {
        console.error("Unauthorized or token expired")
        setEtsyConnected(false)
        setReconnectRequired(true)
        toast({
          title: "Etsy bağlantısı gerekiyor",
          description: "Oturum süresi dolmuş. Etsy mağazanıza yeniden bağlanmanız gerekiyor.",
          variant: "destructive",
          action: <ToastAction altText="Bağlan" onClick={handleReconnectEtsy}>Bağlan</ToastAction>
        })
        setLoading(false)
        return
      }
      
      // For other API errors
      if (!response.ok) {
        let errorMessage = "Bilinmeyen bir hata oluştu"
        try {
          const textResponse = await response.text()
          try {
            const errorData = JSON.parse(textResponse)
            errorMessage = errorData.error || errorData.details || textResponse
          } catch {
            errorMessage = textResponse || `API error: ${response.status} ${response.statusText}`
          }
        } catch (e) {
          errorMessage = `API error: ${response.status} ${response.statusText}`
        }
        
        console.error("Product loading error:", errorMessage)
        
        // Special handling for "No stores found" error
        if (errorMessage === "No stores found") {
          setNoStoresFound(true)
          setEtsyConnected(false)
          toast({
            title: "Etsy mağazası bulunamadı",
            description: "Henüz Etsy mağazanızı bağlamamışsınız veya bağlantı kopmuş.",
            variant: "destructive",
            action: <ToastAction altText="Bağlan" onClick={handleReconnectEtsy}>Bağlan</ToastAction>
          })
          setLoading(false)
          return
        }
        
        // Check if it's a connection issue
        if (errorMessage.toLowerCase().includes('token') || 
            errorMessage.toLowerCase().includes('connect') || 
            errorMessage.toLowerCase().includes('auth')) {
          setReconnectRequired(true)
          setEtsyConnected(false)
          toast({
            title: "Etsy bağlantısı gerekiyor",
            description: "Bağlantı süresi dolmuş. Etsy mağazanıza yeniden bağlanmanız gerekiyor.",
            variant: "destructive",
            action: <ToastAction altText="Bağlan" onClick={handleReconnectEtsy}>Bağlan</ToastAction>
          })
        } else {
          toast({
            title: "Ürünler yüklenemedi",
            description: errorMessage,
            variant: "destructive"
          })
        }
        
        setLoading(false)
        return
      }
      
      // Process successful response
      const data = await response.json()
      
      if (data.listings && Array.isArray(data.listings)) {
        setProducts(data.listings)
        setTotalPages(data.total_pages || 1)
        setTotalCount(data.count || 0)
        
        if (data.shop_id) {
          setCurrentStore(prev => ({
            shop_id: data.shop_id,
            shop_name: prev?.shop_name || `Mağaza #${data.shop_id}`
          }))
          
          if (!currentStore?.shop_name || currentStore.shop_name.includes('#')) {
            fetchStoreDetails(data.shop_id)
          }
        }
        
        setReconnectRequired(false)
        setEtsyConnected(true)
        
        console.log(`Loaded ${data.listings.length} products (page ${page}/${data.total_pages})`)
      } else {
        console.error("No listings data in API response:", data)
        
        if (data.error && typeof data.error === 'string' && 
            (data.error.toLowerCase().includes('token') || 
             data.error.toLowerCase().includes('auth') || 
             data.error.toLowerCase().includes('connect'))) {
          setReconnectRequired(true)
          setEtsyConnected(false)
          toast({
            title: "Etsy bağlantısı gerekiyor",
            description: "Etsy mağazanıza yeniden bağlanmanız gerekiyor.",
            variant: "destructive",
            action: <ToastAction altText="Bağlan" onClick={handleReconnectEtsy}>Bağlan</ToastAction>
          })
        } else {
          toast({
            title: "Ürün bulunamadı",
            description: "Mağazanızda hiç ürün bulunamadı veya veri alınamadı.",
            variant: "destructive"
          })
        }
      }
    } catch (error) {
      console.error("Error loading products:", error)
      toast({
        title: "Hata",
        description: "Ürünler yüklenirken bir hata oluştu",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const loadTaxonomy = async () => {
    try {
      const response = await fetch('/api/etsy/taxonomy')
      if (response.ok) {
        const data = await response.json()
        if (data.taxonomy_nodes) {
          // Canvas/Art kategorilerini filtrele
          const artNodes = data.taxonomy_nodes.filter((node: TaxonomyNode) => 
            node.name.toLowerCase().includes('art') || 
            node.name.toLowerCase().includes('canvas') ||
            node.name.toLowerCase().includes('home') ||
            node.name.toLowerCase().includes('decor')
          )
          setTaxonomyNodes(artNodes.slice(0, 20)) // İlk 20 kategori
          setTaxonomyError(null)
        } else {
          console.log("Taxonomy data format not as expected:", data)
          setTaxonomyError('Kategori verileri uygun formatta değil, ancak ürün görüntüleme etkilenmeyecek.')
          // Use default taxonomy ID
          setCreateForm(prev => ({ ...prev, taxonomy_id: 1 }))
          }
        } else {
        console.log("Taxonomy API error:", response.status, response.statusText)
        setTaxonomyError('Kategori verileri yüklenemedi, ancak ürün görüntüleme etkilenmeyecek.')
        // Use default taxonomy ID
        setCreateForm(prev => ({ ...prev, taxonomy_id: 1 }))
      }
    } catch (error) {
      console.error("Taxonomy load error:", error)
      setTaxonomyError('Kategori verileri yüklenemedi, ancak ürün görüntüleme etkilenmeyecek.')
      // Use default taxonomy ID
      setCreateForm(prev => ({ ...prev, taxonomy_id: 1 }))
    }
  }

  // ... existing code ...
  const loadShippingProfiles = async () => {
    let shopId = null;
    try {
      // Kullanıcı ve mağaza id'sini çek - Bu adım her iki API için de gerekli
      const storesRes = await fetch('/api/etsy/stores');
      if (!storesRes.ok) {
        throw new Error('Mağaza bilgileri alınamadı');
      }

      const storesData = await storesRes.json();
      if (!storesData.stores || storesData.stores.length === 0) {
        // Mağaza bulunamadı durumunu yönet
        setNoStoresFound(true);
        setEtsyConnected(false);
        throw new Error('Mağaza bulunamadı');
      }

      shopId = storesData.stores[0].shop_id;

    } catch (err) {
       console.error("Mağaza bilgileri yüklenirken hata:", err);
       // Mağaza bilgisi alınamazsa her iki profil listesini de boşalt
       setShippingProfiles([]);
       setProcessingProfiles([]);
       setLoadingShippingProfiles(false);
       setLoadingProcessingProfiles(false);
       toast({
         title: "Hata",
         description: "Mağaza bilgileri yüklenemedi. Ürün oluşturma/düzenleme etkilenebilir.",
         variant: "destructive",
       });
       return; // Mağaza ID'si yoksa devam etme
    }

    // Kargo Profillerini Çek - Ayrı try-catch bloğu
    try {
      setLoadingShippingProfiles(true);
      const shippingProfilesRes = await fetch(`/api/etsy/shipping-profiles?shop_id=${shopId}`);

      if (!shippingProfilesRes.ok) {
        throw new Error('Kargo profilleri alınamadı');
      }

      const shippingProfilesData = await shippingProfilesRes.json();
      const profiles = shippingProfilesData.shipping_profiles || [];
      setShippingProfiles(profiles);
      console.log("Shipping profiles loaded successfully. Count:", profiles.length);

      if (profiles.length === 0) {
        toast({
          title: "Uyarı",
          description: "Kargo profili bulunamadı. Lütfen Etsy hesabınızda kargo profili oluşturun.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Kargo profilleri yüklenirken hata:", err);
      setShippingProfiles([]);
      toast({
        title: "Uyarı",
        description: "Kargo profilleri yüklenemedi.",
        variant: "default",
      });
    } finally {
      setLoadingShippingProfiles(false);
    }

    // Hazırlık Süresi Profillerini Çek - Ayrı try-catch bloğu
    try {
      setLoadingProcessingProfiles(true);
      const processingProfilesRes = await fetch(`/api/etsy/processing-profiles?shop_id=${shopId}`);

      if (!processingProfilesRes.ok) {
        throw new Error('Processing profilleri alınamadı');
      }

      const processingProfilesData = await processingProfilesRes.json();
      const processingProfilesList = processingProfilesData.readiness_state_definitions || [];
      setProcessingProfiles(processingProfilesList);
      console.log("Processing profiles loaded successfully. Count:", processingProfilesList.length);
    } catch (err) {
      console.error("Hazırlık profilleri yüklenirken hata:", err);
      setProcessingProfiles([]);
      // Hazırlık profili hatası için farklı bir uyarı gösterebilirsiniz
       toast({
         title: "Uyarı",
         description: "Hazırlık profilleri yüklenemedi.",
         variant: "default",
       });
    } finally {
      setLoadingProcessingProfiles(false);
    }
  };

  const filterAndSortProducts = () => {
    let filtered = [...products]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(product => 
        product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (Array.isArray(product.tags) && product.tags.some(tag => tag?.toLowerCase().includes(searchTerm.toLowerCase())))
      )
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(product => product.state === filterStatus)
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "title") {
        return sortOrder === 'asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      }
      if (sortBy === "price") {
          const aPrice = a.price.amount / a.price.divisor;
          const bPrice = b.price.amount / b.price.divisor;
        return sortOrder === 'asc' ? aPrice - bPrice : bPrice - aPrice;
      }
      if (sortBy === "quantity") {
        return sortOrder === 'asc' ? a.quantity - b.quantity : b.quantity - a.quantity;
      }
      if (sortBy === "views") {
        return sortOrder === 'asc'
          ? ((a.metrics?.views ?? a.views ?? 0) - (b.metrics?.views ?? b.views ?? 0))
          : ((b.metrics?.views ?? b.views ?? 0) - (a.metrics?.views ?? a.views ?? 0));
      }
      if (sortBy === "sold") {
        return sortOrder === 'asc'
          ? ((a.metrics?.sold ?? a.sold ?? 0) - (b.metrics?.sold ?? b.sold ?? 0))
          : ((b.metrics?.sold ?? b.sold ?? 0) - (a.metrics?.sold ?? a.sold ?? 0));
      }
      // created_timestamp veya default
      return sortOrder === 'asc'
        ? a.created_timestamp - b.created_timestamp
        : b.created_timestamp - a.created_timestamp;
    });

    // Eğer filtreleme veya sıralama aktifse, sayfalama butonlarını gizle
    const isFiltering = searchTerm || filterStatus !== "all" || sortBy !== "created_timestamp";
    
    // Filtrelenmiş ürünleri state'e kaydet
    setFilteredProducts(filtered)
  }

  // handleReconnectEtsy fonksiyonunu tamamen yeniden düzenleyelim
  const handleReconnectEtsy = async () => {
    try {
    setRefreshing(true); 
    setLastReconnectAttempt(new Date());
      
      // Kullanıcı manuel bağlanma istedi - bu sefer force_refresh ve manual_reconnect parametreleri ile istek yap
      const refreshRes = await fetch('/api/etsy/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          force_refresh: true,
          skip_reconnect: false, // Skip reconnect'i devre dışı bırak çünkü manuel bağlanma isteniyor
          manual_reconnect: true // Yeni parametre: Kullanıcı manuel bağlanma istedi
        })
      }).catch(e => null);
      
      if (!refreshRes || !refreshRes.ok) {
        // Direkt olarak auth URL'sini al
        const res = await fetch('/api/etsy/auth-url');
        
        if (!res.ok) {
          throw new Error(`Bağlantı URL'si alınamadı: ${res.status}`);
        }
        
        const data = await res.json();
        
        if (data.url) {
          toast({
            title: "Etsy bağlantısı yenileniyor",
            description: "Etsy sayfasına yönlendiriliyorsunuz. Lütfen Etsy hesabınıza izin verin.",
            variant: "default",
          });
          
          // Kısa bir süre bekleyip yönlendir
          setTimeout(() => {
            window.location.href = data.url;
          }, 1500);
          return;
        } else {
          throw new Error(data.error || "Bağlantı URL'si alınamadı");
        }
      }
      
      // refreshRes.ok durumunda, API yanıtını kontrol et
      try {
        const refreshData = await refreshRes.json();
        
        // API reconnect_required döndürdüyse, kullanıcıyı Etsy'ye yönlendir
        if (refreshData.reconnect_required) {
          const res = await fetch('/api/etsy/auth-url');
          
          if (!res.ok) {
            throw new Error(`Bağlantı URL'si alınamadı: ${res.status}`);
          }
          
          const data = await res.json();
          
          if (data.url) {
            toast({
              title: "Etsy bağlantısı yenileniyor",
              description: "Etsy sayfasına yönlendiriliyorsunuz. Lütfen Etsy hesabınıza izin verin.",
              variant: "default",
            });
            
            // Kısa bir süre bekleyip yönlendir
            setTimeout(() => {
              window.location.href = data.url;
            }, 1500);
          } else {
            throw new Error(data.error || "Bağlantı URL'si alınamadı");
          }
        } else {
          // Token yenilendi veya geçerli, ürünleri yükle
          toast({
            title: "Bağlantı yenilendi",
            description: "Etsy bağlantısı başarıyla yenilendi. Ürünler yükleniyor...",
            variant: "default",
          });
          
          // Reconnect sayacını sıfırla ve ürünleri yükle
          setReconnectErrorCount(0);
          setReconnectRequired(false);
          setEtsyConnected(true);
          
          await loadProducts();
        }
      } catch (parseError) {
        console.error("Failed to parse refresh response", parseError);
        throw new Error("Bağlantı yanıtı işlenemedi");
      }
    } catch (error) {
      console.error("Auth URL error:", error);
      
      toast({
        title: "Bağlantı Hatası",
        description: error instanceof Error ? error.message : "Bağlantı başlatılırken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateProduct = async () => {
    try {
      setSubmitting(true);
      console.log("Starting product creation...");

      // Validate required fields
      if (!createForm.title || !createForm.description || !createForm.price || !createForm.taxonomy_id) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      // Validate image files
      if (imageFiles.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please select at least one image",
          variant: "destructive",
        });
        return;
      }

      if (imageFiles.length > 10) {
        toast({
          title: "Validation Error",
          description: "Maximum 10 images allowed",
          variant: "destructive",
        });
        return;
      }

      // Validate shipping profile
      if (!createForm.shipping_profile_id) {
        toast({
          title: "Validation Error",
          description: "Please select a shipping profile.",
          variant: "destructive",
        });
        return;
      }

      console.log("Creating product with form data:", createForm);
      console.log("Number of images to upload:", imageFiles.length);

      const response = await fetch("/api/etsy/listings/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...createForm,
          price: Math.round(createForm.price * 100), // Convert to USD cents
        }),
      });

      console.log("Product creation response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        try {
          const errorData = JSON.parse(errorText);
          console.error("Parsed error response data:", errorData);
        } catch (e) {
          console.error("Failed to parse error response as JSON:", e);
        }
        throw new Error(errorText || "Failed to create product");
      }

      const data = await response.json();
      console.log("Product creation response data:", data);

      // Image upload logic - moved inside the success block
      console.log("Checking image files before upload loop. imageFiles count:", imageFiles.length, "Listing ID:", data.listing?.listing_id);
      if (imageFiles.length > 0 && data.listing && data.listing.listing_id) {
        console.log("Starting image uploads for listing:", data.listing.listing_id);
        let successCount = 0;
        let failureCount = 0;
        let errorMessages: string[] = [];

        for (let index = 0; index < imageFiles.length; index++) {
          const file = imageFiles[index];
          try {
            console.log(`Uploading image: ${file.name} (Sıra: ${index + 1})`);
            const formData = new FormData();
            formData.append('image', file);
            formData.append('rank', (index + 1).toString());

            const uploadResponse = await fetch(`/api/etsy/listings/${data.listing.listing_id}/images`, {
              method: "POST",
              body: formData,
            });

            const responseText = await uploadResponse.text();
            console.log("Image upload response text:", responseText);

            let uploadResponseData;
            try {
              uploadResponseData = JSON.parse(responseText);
            } catch (e) {
              console.error("Failed to parse response as JSON:", e);
              uploadResponseData = { error: responseText };
            }

            if (!uploadResponse.ok) {
              console.error("Image upload failed:", uploadResponseData);
              errorMessages.push(`Failed to upload ${file.name}: ${uploadResponseData.error || responseText}`);
              failureCount++;
              continue;
            }

            console.log("Image upload response:", uploadResponseData);
            successCount++;
          } catch (error) {
            console.error("Error uploading image:", error);
            errorMessages.push(`Error uploading ${file.name}: ${error instanceof Error ? error.message : "Unknown error"}`);
            failureCount++;
          }
        }

        // Show summary toast
        if (successCount > 0 || failureCount > 0) {
          toast({
            title: "Image Upload Summary",
            description: (
              <div>
                <p>Successfully uploaded {successCount} image(s).</p>
                {failureCount > 0 && (
                  <div>
                    <p>Failed to upload {failureCount} image(s):</p>
                    <ul>
                      {errorMessages.map((msg, i) => (
                        <li key={i}>{msg}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ),
            variant: failureCount > 0 ? "destructive" : "default",
            duration: 10000,
          });
        }
      }

      toast({
        title: "Success",
        description: "Product created successfully",
      });

      setShowCreateModal(false);
      setCreateForm({
        title: "",
        description: "",
        price: 0,
        quantity: 1,
        tags: [],
        materials: [],
        who_made: "i_did",
        when_made: "made_to_order",
        taxonomy_id: 1,
        processing_min: undefined,
        processing_max: undefined,
        processing_time_unit: "business_days" // Default to business days
      });
      setImageFiles([]);
      await loadProducts(1);
    } catch (error) {
      console.error("Error creating product:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create product",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // handleCopyProduct fonksiyonunu güncelle - Kopyalanan ürünü state'e kaydet
  const handleCopyProduct = (product: Product) => {
    scrollYRef.current = window.scrollY;
    // Etsy başlık sınırı 140 karakter
    const etsyTitleMaxLength = 140;
    const suffix = " (Kopya)";
    let newTitle = product.title + suffix;
    
    // Başlık uzunluğunu kontrol et ve gerekirse kısalt
    if (newTitle.length > etsyTitleMaxLength) {
      // Yeterli alan bırak ve kısalt
      newTitle = product.title.substring(0, etsyTitleMaxLength - suffix.length) + suffix;
    }

    // Resim ID'lerini çıkart
    const imageIds = product.images
      ?.filter(img => img.listing_image_id !== undefined)
      .map(img => img.listing_image_id) as number[] || [];

    console.log(`Kopyalanan ürün resim ID'leri: ${imageIds.join(', ')}`);
    
    // Tüm ürün detaylarını kopyala
    setCreateForm({
      title: newTitle,
      description: product.description,
      price: product.price.amount / product.price.divisor,
      quantity: product.quantity,
      tags: product.tags,
      materials: (product as any)?.materials || [],
      who_made: (product as any)?.who_made || "i_did",
      when_made: (product as any)?.when_made || "made_to_order",
      taxonomy_id: (product as any)?.taxonomy_id || 1,
      shipping_profile_id: (product as any)?.shipping_profile_id,
      processing_profile_id: (product as any)?.processing_profile_id,
      processing_min: (product as any)?.processing_min,
      processing_max: (product as any)?.processing_max,
      processing_time_unit: (product as any)?.processing_time_unit || "business_days",
      state: "draft", // Her zaman draft olarak başlat
      image_ids: imageIds.length > 0 ? imageIds : undefined,
      // Varyasyonları ve diğer metadata'ları kopyala
      variations: (product as any)?.variations?.map((variation: any) => ({
        ...variation,
        property_values: variation.property_values?.map((pv: any) => ({
          ...pv,
          scale_id: pv.scale_id,
          value_ids: pv.value_ids,
          values: pv.values
        }))
      })) || [],
      style: (product as any)?.style,
      non_taxable: (product as any)?.non_taxable,
      language: (product as any)?.language || "en-US",
      featured_rank: (product as any)?.featured_rank,
      taxonomy_path: (product as any)?.taxonomy_path,
      used_manufacturer: (product as any)?.used_manufacturer,
      is_supply: (product as any)?.is_supply,
      is_customizable: (product as any)?.is_customizable,
      is_digital: (product as any)?.is_digital,
      file_data: (product as any)?.file_data,
      has_variations: (product as any)?.has_variations,
      production_partners: (product as any)?.production_partners,
      section_id: (product as any)?.section_id,
      shop_section_id: (product as any)?.shop_section_id,
      // Envanter detaylarını kopyala
      inventory: (product as any)?.inventory ? {
        ...(product as any).inventory,
        products: (product as any).inventory.products?.map((p: any) => ({
          ...p,
          property_values: p.property_values?.map((pv: any) => ({
            ...pv,
            scale_id: pv.scale_id,
            value_ids: pv.value_ids,
            values: pv.values
          }))
        }))
      } : undefined,
      should_auto_renew: (product as any)?.should_auto_renew,
      is_personalizable: (product as any)?.is_personalizable,
      personalization_is_required: (product as any)?.personalization_is_required,
      personalization_instructions: (product as any)?.personalization_instructions,
      personalization_char_count_max: (product as any)?.personalization_char_count_max,
    });

    // Kopyalanan ürünü state'e kaydet
    setProductToCopy(product);

    // Yeni dosya yüklemeyi ve resim dosyası state'ini sıfırla
    setImageFile(null);
    setImageFiles([]);

    // Kopya modunu etkinleştir ve modalı aç
    setIsCopyMode(true);
    setShowCreateModal(true);
  };

  // Çoklu resim yükleme fonksiyonu
  const handleMultipleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setImageFiles(prev => [...prev, ...filesArray]);
    }
  };

  // Ekle - Drag and drop fonksiyonları
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (e.dataTransfer.files) {
      const filesArray = Array.from(e.dataTransfer.files).filter(
        file => file.type.startsWith('image/')
      );
      
      if (filesArray.length > 0) { 
        setImageFiles(prev => [...prev, ...filesArray]); 
      }
    }
  };

  // Ekle - resim sıralama fonksiyonu
  const reorderImages = (startIndex: number, endIndex: number) => {
    if (startIndex === endIndex) return;
    
    // Seçilen görsel için
    if (imageFiles.length > 0) { 
      const result = Array.from(imageFiles);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      setImageFiles(result);
    } 
    
    // Edit modal içindeki görsel sıralaması için
    if (showEditModal && showEditModal.images && showEditModal.images.length > 0) {
      const newImages = Array.from(showEditModal.images);
      const [removed] = newImages.splice(startIndex, 1);
      newImages.splice(endIndex, 0, removed);
      setShowEditModal(prev => prev ? {...prev, images: newImages} : null);
      setImagesReordered(true); 
    }
  };

  // Resim kaldırma fonksiyonu
  const removeImage = (index: number) => {
      setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Ürün güncelleme fonksiyonunu genişletelim - resim yükleme destekli
  const handleUpdateProduct = async (product: Product) => {
    setSubmitting(true);
    let success = true; // Başarı durumunu takip etmek için
    let errorMessage = ""; // Hata mesajını toplamak için
    let errorMessages: string[] = []; // Detaylı hata mesajları için

    try {
      // Ürün güncelleme
      const productToUpdate = {
        ...product,
        quantity: typeof product.quantity === 'string'
          ? parseInt(product.quantity, 10)
          : product.quantity
      };

      console.log("Ürün bilgileri güncelleniyor:", productToUpdate);

      // Ürünü güncelle
      const response = await fetch(`/api/etsy/listings/${productToUpdate.listing_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify(productToUpdate)
      });

      if (!response.ok) {
        success = false;
        const errorData = await response.json().catch(() => ({}));
        errorMessage += `Ürün güncelleme hatası (${response.status}): ${errorData.error || JSON.stringify(errorData)}. `;
        console.error("Ürün güncelleme hatası:", response.status, errorData);
      } else {
        console.log("Ürün bilgileri başarıyla güncellendi (API tarafında).");
      }

      // Yeni resimler varsa, bunları ekle
      if (imageFiles.length > 0) {
        console.log(`Yüklemek için ${imageFiles.length} resim bulundu.`);
        let successCount = 0;
        let failureCount = 0;

        for (let index = 0; index < imageFiles.length; index++) {
          const file = imageFiles[index];
          console.log(`Resim yükleniyor: ${file.name} (Sıra: ${index + 1})`);
          const formData = new FormData();
          formData.append('image', file);
          // Add the rank parameter based on the file's position in the array
          formData.append('rank', (index + 1).toString());

          try {
            const uploadResponse = await fetch(`/api/etsy/listings/${productToUpdate.listing_id}/images`, {
              method: 'POST',
              body: formData
            });

            const responseText = await uploadResponse.text();
            console.log("Image upload response text:", responseText);

            let uploadResponseData;
            try {
              uploadResponseData = JSON.parse(responseText);
            } catch (e) {
              console.error("Failed to parse response as JSON:", e);
              uploadResponseData = { error: responseText };
            }

            if (!uploadResponse.ok) {
              success = false;
              const errorDetail = uploadResponseData.error || uploadResponseData.message || responseText;
              errorMessages.push(`Failed to upload ${file.name}: ${errorDetail}`);
              console.error(`Resim yükleme hatası (${file.name}):`, uploadResponse.status, uploadResponseData);
              failureCount++;
            } else {
              console.log(`Resim başarıyla yüklendi: ${file.name}`, uploadResponseData);
              successCount++;
            }
          } catch (uploadError) {
            success = false;
            errorMessages.push(`Error uploading ${file.name}: ${uploadError instanceof Error ? uploadError.message : "Unknown error"}`);
            console.error(`Resim yükleme sırasında beklenmeyen hata (${file.name}):`, uploadError);
            failureCount++;
          }
        }

        // Show summary toast for image uploads
        if (successCount > 0 || failureCount > 0) {
          toast({
            title: "Image Upload Summary",
            description: (
              <div>
                <p>Successfully uploaded {successCount} image(s).</p>
                {failureCount > 0 && (
                  <div>
                    <p>Failed to upload {failureCount} image(s):</p>
                    <ul>
                      {errorMessages.map((msg, i) => (
                        <li key={i}>{msg}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ),
            variant: failureCount > 0 ? "destructive" : "default",
            duration: 10000,
          });
        }
      }

      // Resim sıralaması değiştiyse ve resimler varsa sıralamayı güncelle
      if (imagesReordered && showEditModal?.images && showEditModal.images.length > 1) {
        console.log("Resim sıralaması güncelleniyor...");
        try {
          const orderedImageIds = showEditModal.images
            .map(img => (img as any).listing_image_id || (img as any).image_id)
            .filter(Boolean);

          if (orderedImageIds.length > 0) {
            console.log("Resim sıralama isteği gönderiliyor:", orderedImageIds);
            const reorderResponse = await fetch(`/api/etsy/listings/${productToUpdate.listing_id}/images`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ image_ids: orderedImageIds })
            });

            const reorderResponseData = await reorderResponse.json().catch(() => ({}));

            if (!reorderResponse.ok) {
              success = false;
              const errorDetail = reorderResponseData.error || reorderResponseData.message || JSON.stringify(reorderResponseData);
              errorMessages.push(`Failed to reorder images: ${errorDetail}`);
              console.error("Resim sıralama hatası:", reorderResponse.status, reorderResponseData);
            } else {
              console.log("Resim sıralaması başarıyla güncellendi.");
            }
          }
        } catch (reorderError) {
          success = false;
          errorMessages.push(`Error reordering images: ${reorderError instanceof Error ? reorderError.message : "Unknown error"}`);
          console.error("Resim sıralama sırasında beklenmeyen hata:", reorderError);
        }

        setImagesReordered(false);
      }

      // UI güncelle
      if (success) {
        toast({
          title: "Başarılı",
          description: "Ürün ve resimler başarıyla güncellendi.",
          variant: "default",
        });
      } else {
        toast({
          title: "Güncelleme Tamamlandı, Ancak Hatalar Oluştu:",
          description: (
            <div>
              <p>{errorMessage}</p>
              {errorMessages.length > 0 && (
                <div>
                  <p>Detailed errors:</p>
                  <ul>
                    {errorMessages.map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ),
          variant: "destructive",
          duration: 10000,
        });
      }

      // Başarılı güncelleme sonrası state'i temizle
      setImageFiles([]);
      setShowEditModal(null);
      await loadProducts(1);

    } catch (error) {
      success = false;
      errorMessage = `Genel güncelleme hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}. `;
      console.error("Update product process error:", error);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 10000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (listingId: number) => {
    setConfirmDeleteProductId(listingId);
  };
  
  const cancelDelete = () => {
    setConfirmDeleteProductId(null);
  };
  
  const handleDeleteProduct = async (listingId: number) => {
    try {
      setDeletingProductId(listingId);
      console.log("Deleting product:", listingId);
      
      const response = await fetch(`/api/etsy/listings/${listingId}`, {
        method: 'DELETE',
      });

      let result;
      try {
        result = await response.json();
      } catch (err) {
        console.error("Error parsing response:", err);
        result = { error: "Invalid response format" };
      }
      
      console.log("Delete response:", response.status, result);

      if (response.ok && result.success) {
        toast({
          title: "Başarılı",
          description: "Ürün başarıyla silindi",
          variant: "default",
        });
        
        // Local state'i güncelle
        setProducts(prevProducts => prevProducts.filter(p => p.listing_id !== listingId));
        setFilteredProducts(prevFiltered => prevFiltered.filter(p => p.listing_id !== listingId));
        setConfirmDeleteProductId(null);
      } else {
        console.error("Error deleting product:", result);
        toast({
          title: "Silme Başarısız",
          description: result.details || result.error || "Bilinmeyen bir hata oluştu.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Exception deleting product:", error);
      toast({
        title: "Hata",
        description: `İşlem sırasında bir hata oluştu: ${error}`,
        variant: "destructive",
      });
    } finally {
      setDeletingProductId(null);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !createForm.tags.includes(tagInput.trim())) {
      setCreateForm(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setCreateForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const addMaterial = () => {
    if (materialInput.trim() && !createForm.materials.includes(materialInput.trim())) {
      setCreateForm(prev => ({
        ...prev,
        materials: [...prev.materials, materialInput.trim()]
      }))
      setMaterialInput("")
    }
  }

  const removeMaterial = (materialToRemove: string) => {
    setCreateForm(prev => ({
      ...prev,
      materials: prev.materials.filter(material => material !== materialToRemove)
    }))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800"
      case "inactive": return "bg-red-100 text-red-800"
      case "draft": return "bg-yellow-100 text-yellow-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const formatPrice = (price: { amount: number; divisor: number; currency_code: string }) => {
    return `${price.currency_code} ${(price.amount / price.divisor).toFixed(2)}`
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('tr-TR')
  }

  const handleCacheImages = async () => {
    if (cachingImages) return;
    
    setCachingImages(true);
    try {
      // Sadece ilk 50 ürünü önbelleğe al
      const response = await fetch('/api/etsy/image-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ limit: 50 })
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`✅ ${data.results.success} ürün resmi başarıyla önbelleğe alındı. (${data.duration})`);
      } else {
        const errorData = await response.json();
        alert(`❌ Resimler önbelleğe alınırken hata oluştu: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error caching images:", error);
      alert("❌ Resimler önbelleğe alınırken hata oluştu.");
    } finally {
      setCachingImages(false);
    }
  };
  
  const handleCacheAllImages = async () => {
    if (cachingAllImages) return;
    
    if (!confirm(`Bu işlem tüm ürünlerin resimlerini (${filteredProducts.length}) önbelleğe alacak. Bu işlem birkaç dakika sürebilir. Devam etmek istiyor musunuz?`)) {
      return;
    }
    
    setCachingAllImages(true);
    try {
      // Tüm ürünleri önbelleğe al (limit parametresi olmadan)
      const response = await fetch('/api/etsy/image-cache', {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`✅ ${data.results.success} ürün resmi başarıyla önbelleğe alındı. (${data.duration})`);
      } else {
        const errorData = await response.json();
        alert(`❌ Resimler önbelleğe alınırken hata oluştu: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error caching all images:", error);
      alert("❌ Tüm resimler önbelleğe alınırken hata oluştu.");
    } finally {
      setCachingAllImages(false);
    }
  };

  // Ürün oluşturma modalını açma fonksiyonu - kargo profillerini yüklemeyi ekledik
  const handleOpenCreateModal = async () => {
    scrollYRef.current = window.scrollY; // Scroll pozisyonunu kaydet
    setCreateForm({
      title: "",
      description: "",
      price: 0,
      quantity: 1,
      tags: [],
      materials: [],
      who_made: "i_did",
      when_made: "made_to_order",
      taxonomy_id: 1,
      shipping_profile_id: undefined, // Yeni ürün oluştururken shipping_profile_id'yi undefined yap
      image_ids: []
    });
    setImageFile(null); // Yeni dosya yüklemeyi sıfırla
    setImageFiles([]); // Yeni dosya yüklemeyi sıfırla
    setIsCopyMode(false); // Kopya modu kapalı
    await loadShippingProfiles(); // Kargo profillerini yükle
    setShowCreateModal(true);
  }

  // Ürün seçme/seçimi kaldırma fonksiyonu
  const toggleProductSelection = (listingId: number) => {
    setSelectedProducts(prev => {
      if (prev.includes(listingId)) {
        return prev.filter(id => id !== listingId);
      } else {
        return [...prev, listingId];
      }
    });
  };

  // Tüm ürünleri seçme/seçimi kaldırma fonksiyonu
  const toggleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      // Tüm seçimleri kaldır
      setSelectedProducts([]);
      setSelectAllChecked(false);
    } else {
      // Tüm ürünleri seç
      setSelectedProducts(filteredProducts.map(product => product.listing_id));
      setSelectAllChecked(true);
    }
  };

  // Toplu silme fonksiyonu
  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) {
      return;
    }

    if (!confirm(`Seçilen ${selectedProducts.length} ürünü silmek istediğinizden emin misiniz?`)) {
      return;
    }

    // Her bir seçili ürünü sırayla siliyoruz
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const listingId of selectedProducts) {
        try {
          const response = await fetch(`/api/etsy/listings/${listingId}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error(`Error deleting product ${listingId}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        alert(`✅ ${successCount} ürün başarıyla silindi. ${errorCount > 0 ? `\n❌ ${errorCount} ürün silinemedi.` : ''}`);
        loadProducts(); // Ürün listesini yenile
        setSelectedProducts([]); // Seçimleri temizle
        setSelectAllChecked(false);
      } else {
        alert("❌ Ürünler silinirken hata oluştu!");
      }
    } catch (error) {
      console.error("Bulk delete error:", error);
      alert("❌ Toplu silme işlemi sırasında bir hata oluştu!");
    }
  };

  // Filtered products değiştiğinde, select all checkbox durumunu güncelle
  useEffect(() => {
    setSelectAllChecked(
      filteredProducts.length > 0 && 
      selectedProducts.length === filteredProducts.length
    );
  }, [filteredProducts, selectedProducts]);

  const ProductCard = ({ product, listView = false }: { product: Product, listView?: boolean }) => {
    const isSelected = selectedProducts.includes(product.listing_id);

    if (listView) {
      // Modern sıralı liste görünümü
      return (
        <div
          className={`bg-white rounded-2xl shadow-sm overflow-hidden flex flex-row items-center min-h-[180px] hover:shadow-lg transition-shadow duration-300 border border-gray-100 ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}`}
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            if (
              (e.target as HTMLElement).tagName === 'BUTTON' ||
              (e.target as HTMLElement).closest('button') ||
              (e.target as HTMLElement).tagName === 'A' ||
              (e.target as HTMLElement).closest('a')
            ) {
              return;
            }
            toggleProductSelection(product.listing_id);
          }}
        >
          {/* Sadece ana görsel */}
          <div className="relative w-[140px] h-[140px] bg-gray-50 flex-shrink-0 flex items-center justify-center overflow-hidden">
            {product.images && product.images.length > 0 ? (
              <img
                src={product.images[0].url_570xN}
                alt={product.images[0].alt_text || 'Product image'}
                className="w-full h-full object-cover rounded"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">No image available</span>
              </div>
            )}
            <div className="absolute top-2 left-2 z-30">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleProductSelection(product.listing_id)}
                className="bg-white border-gray-300 rounded-sm"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          {/* Bilgi alanı ve butonlar ... (değişmeden kalacak) */}
          <div className="flex-1 flex flex-col justify-between px-6 py-4 min-w-0">
            <div className="flex flex-col gap-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900 truncate mb-1">{product.title}</h3>
              <div className="text-gray-500 text-sm truncate mb-2">{product.description?.slice(0, 80)}{product.description && product.description.length > 80 ? '...' : ''}</div>
              <div className="flex flex-row items-center gap-6 mb-2">
                <span className="text-xl font-bold text-primary">{formatPrice(product.price)}</span>
                <span className="text-xs text-gray-500">Stok: {product.quantity}</span>
                <span className="text-xs text-gray-500">Görüntüleme: {product.metrics?.views || 0}</span>
                <span className="text-xs text-gray-500">Favori: {product.metrics?.favorites || 0}</span>
                <span className="text-xs text-gray-500">Satış: {product.metrics?.sold || 0}</span>
              </div>
            </div>
            {/* Butonlar */}
            <div className="flex flex-row gap-2 mt-2 w-full justify-between">
              <Button
                variant="outline"
                size="icon"
                className="flex-1 min-w-0"
                title="Düzenle"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEditModal(product);
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="flex-1 min-w-0"
                title="Kopyala"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyProduct(product);
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="flex-1 min-w-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                title="Sil"
                onClick={(e) => {
                  e.stopPropagation();
                  confirmDelete(product.listing_id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={
                  'flex-1 min-w-0 ' +
                  (product.state === 'active'
                    ? 'text-green-600 hover:text-green-700'
                    : product.state === 'inactive'
                      ? 'text-red-600 hover:text-red-700'
                      : 'text-yellow-700 hover:text-yellow-800')
                }
                title={product.state === 'active' ? 'Aktif/Pasif Yap' : 'Aktif Yap'}
                onClick={(e) => {
                  e.stopPropagation();
                  const newState = product.state === 'active' ? 'inactive' : 'active';
                  handleUpdateProduct({ ...product, state: newState });
                }}
              >
                {product.state === 'active' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      );
    }
    // Grid (3'lü, 5'li) görünüm
    return (
      <div
        className={`bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col relative hover:shadow-lg transition-shadow duration-300 border border-gray-100 group ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}`}
        style={{ cursor: 'pointer', minHeight: 340 }}
        onClick={(e) => {
          if (
            (e.target as HTMLElement).tagName === 'BUTTON' ||
            (e.target as HTMLElement).closest('button') ||
            (e.target as HTMLElement).tagName === 'A' ||
            (e.target as HTMLElement).closest('a')
          ) {
            return;
          }
          toggleProductSelection(product.listing_id);
        }}
      >
        {/* Sağ üstte Etsy'de Göster butonu */}
        <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-all duration-200">
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white shadow px-3 py-1 rounded-full text-xs font-medium text-primary hover:bg-primary hover:text-white border border-primary hover:border-primary-dark transition-colors duration-200"
            title="Etsy'de Göster"
            onClick={e => e.stopPropagation()}
          >
            Etsy'de Göster
          </a>
        </div>
        {/* Checkbox ve durum etiketi */}
        <div className="absolute top-2 left-2 z-30">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleProductSelection(product.listing_id)}
            className="bg-white border-gray-300 rounded-sm"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        {/* Ürün görseli: sadece ana resim */}
        <div className="w-full aspect-square bg-gray-50 flex items-center justify-center overflow-hidden relative">
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0].url_570xN}
              alt={product.images[0].alt_text || 'Product image'}
              className="w-full h-full object-cover rounded"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500">No image available</span>
            </div>
          )}
        </div>
        {/* Bilgi alanı ve butonlar ... (değişmeden kalacak) */}
        <div className="flex-1 flex flex-col justify-between px-4 py-3">
          <h3 className="text-base font-bold text-gray-900 truncate mb-1">{product.title}</h3>
          <div className="text-gray-500 text-xs truncate mb-2">{product.description?.slice(0, 60)}{product.description && product.description.length > 60 ? '...' : ''}</div>
          <div className="flex flex-row items-center gap-3 mb-2">
            <span className="text-lg font-bold text-primary">{formatPrice(product.price)}</span>
            <span className="text-xs text-gray-500">Stok: {product.quantity}</span>
            <span className="text-xs text-gray-500">Görüntüleme: {product.metrics?.views ?? product.views ?? 0}</span>
            <span className="text-xs text-gray-500">Satış: {product.metrics?.sold ?? product.sold ?? 0}</span>
          </div>
          {/* Butonlar */}
          <div className="flex flex-row gap-2 mt-2 w-full justify-between">
            <Button
              variant="outline"
              size="icon"
              className="flex-1 min-w-0"
              title="Düzenle"
              onClick={(e) => {
                e.stopPropagation();
                setShowEditModal(product);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="flex-1 min-w-0"
              title="Kopyala"
              onClick={(e) => {
                e.stopPropagation();
                handleCopyProduct(product);
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="flex-1 min-w-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Sil"
              onClick={(e) => {
                e.stopPropagation();
                confirmDelete(product.listing_id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={
                'flex-1 min-w-0 ' +
                (product.state === 'active'
                  ? 'text-green-600 hover:text-green-700'
                  : product.state === 'inactive'
                    ? 'text-red-600 hover:text-red-700'
                    : 'text-yellow-700 hover:text-yellow-800')
              }
              title={product.state === 'active' ? 'Aktif/Pasif Yap' : 'Aktif Yap'}
              onClick={(e) => {
                e.stopPropagation();
                const newState = product.state === 'active' ? 'inactive' : 'active';
                handleUpdateProduct({ ...product, state: newState });
              }}
            >
              {product.state === 'active' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const ProductStatus = ({ status, grid }: { status: string, grid?: boolean }) => {
    if (grid) {
      // Oval, filled color modern badge
      let bg = 'bg-gray-300', text = 'text-white';
      if (status === 'active') {
        bg = 'bg-green-500'; text = 'text-white';
      } else if (status === 'inactive') {
        bg = 'bg-red-500'; text = 'text-white';
      } else if (status === 'draft') {
        bg = 'bg-yellow-300'; text = 'text-black';
      }
      const label = status === 'active' ? 'Aktif' : status === 'inactive' ? 'Pasif' : 'Taslak';
      return (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${bg} ${text} border border-white/70`} style={{letterSpacing: 0.5}}>
          {label}
        </span>
      );
    }
    // Old style (list view or other)
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'active':
          return 'bg-green-100 text-green-800';
        case 'inactive':
          return 'bg-gray-100 text-gray-800';
        case 'draft':
          return 'bg-yellow-100 text-yellow-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    };
    const getStatusText = (status: string) => {
      switch (status) {
        case 'active':
          return 'Aktif';
        case 'inactive':
          return 'Pasif';
        case 'draft':
          return 'Taslak';
        default:
          return status;
      }
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
        {getStatusText(status)}
      </span>
    );
  };

  // useEffect içinde reconnect banner gösterme mantığını iyileştirelim
  useEffect(() => {
    // Reconnect banner'ı daha az sıklıkla göster
    // Eğer hata sayacı düşükse veya son 30 dakikada çok fazla deneme yapıldıysa banner'ı gösterme
    if (reconnectRequired) {
      const shouldShowBanner = reconnectErrorCount <= 2 || !lastReconnectAttempt;
      
      if (!shouldShowBanner && lastReconnectAttempt) {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        if (lastReconnectAttempt < thirtyMinutesAgo) {
          // 30 dakika geçtiyse banner'ı tekrar göster
          setShowReconnectBanner(true);
        } else {
          // 30 dakika geçmediyse ve hata sayacı yüksekse banner'ı gizle
          setShowReconnectBanner(false);
        }
      } else {
        setShowReconnectBanner(shouldShowBanner);
      }
    }
  }, [reconnectRequired, reconnectErrorCount, lastReconnectAttempt]);

  // Manuel bağlantı koparma ve yenileme fonksiyonunu ekleyelim
  const handleManualReconnect = async () => {
    if (!confirm("Bu işlem Etsy bağlantınızı koparacak ve yeniden bağlanmanızı isteyecektir. Devam etmek istiyor musunuz?")) {
      return;
    }
    
    // Direkt olarak manuel bağlantı yenileme işlemini başlat
    handleReconnectEtsy();
  };

  // Modal kapanınca scroll pozisyonunu geri al
  useEffect(() => {
    if (!showCreateModal && !showEditModal && lastScrollY > 0) {
      setTimeout(() => {
        window.scrollTo({ top: lastScrollY, behavior: 'auto' });
      }, 0);
    }
  }, [showCreateModal, showEditModal]);

  useEffect(() => {
    if (showCreateModal || showEditModal) {
      window.history.scrollRestoration = 'manual';
      // Modal açılırken body'yi sabitle
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    } else {
      window.history.scrollRestoration = 'auto';
      // Modal kapanınca body'yi eski haline getir
      const top = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      // Scroll'u garanti şekilde eski pozisyona döndür
      setTimeout(() => {
        window.scrollTo({ top: scrollYRef.current, behavior: 'auto' });
      }, 30);
    }
  }, [showCreateModal, showEditModal]);

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Reconnect Banner - iyileştirildi ve manuel bağlantı yenileme seçeneği eklendi */}
      {reconnectRequired && showReconnectBanner && (
        <div className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-amber-500 mr-3" />
            <div>
              <h3 className="font-medium text-amber-800">Etsy bağlantısı gerekiyor</h3>
              <p className="text-sm text-amber-700">
                {reconnectErrorCount > 2 
                  ? "Etsy bağlantısı güncellenemiyor. Bağlanmak için 'Etsy'ye Bağlan' butonuna tıklayabilirsiniz."
                  : "Etsy mağazanıza yeniden bağlanmanız gerekiyor."}
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReconnectBanner(false)}
              className="border-amber-300 text-amber-600 hover:bg-amber-50"
            >
              Sonra
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleReconnectEtsy}
              className="bg-amber-500 hover:bg-amber-600"
              disabled={refreshing}
            >
              {refreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Bağlanıyor...
                </>
              ) : (
                'Etsy\'ye Bağlan'
              )}
            </Button>
          </div>
        </div>
      )}
      
      {/* No Stores Found Banner */}
      {noStoresFound && (
        <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Store className="h-5 w-5 text-blue-500 mr-3" />
              <div>
                <h3 className="font-medium text-blue-800">Etsy mağazası bulunamadı</h3>
                <p className="text-sm text-blue-700">Ürünleri görüntülemek için Etsy mağazanızı bağlamanız gerekiyor.</p>
              </div>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={handleReconnectEtsy}
              className="bg-blue-500 hover:bg-blue-600"
              disabled={refreshing}
            >
              {refreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Bağlanıyor...
                </>
              ) : (
                'Etsy\'ye Bağlan'
              )}
            </Button>
          </div>
        </div>
      )}
      
      {/* Kullanıcıya her zaman manuel olarak bağlantı yenileme seçeneği sunalım */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Ürünler</h1>
          <div className="flex items-center text-sm text-gray-500">
            {currentStore ? (
              <div className="flex items-center">
                <Store className="h-4 w-4 mr-1" />
                <span className="font-medium text-primary">{currentStore.shop_name}</span>
                
                {/* Etsy bağlantı durumu ve manuel yenileme butonu */}
                <span className="mx-2 text-gray-400">•</span>
                <div className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${etsyConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span>{etsyConnected ? 'Bağlı' : 'Bağlantı kopuk'}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 ml-1 text-gray-500 hover:text-primary"
                    title="Etsy bağlantısını yenile"
                    onClick={handleManualReconnect}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
                <span className="mx-2 text-gray-400">•</span>
                <span>{totalCount} ürün</span>
              </div>
            ) : (
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                <span>Mağaza bilgisi yükleniyor...</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={handleOpenCreateModal}
            size="sm"
            className="whitespace-nowrap"
          >
            <Plus className="mr-2 h-4 w-4" />
            Yeni Ürün Ekle
          </Button>
          
          {selectedProducts.length > 0 && (
            <Button 
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              className="whitespace-nowrap"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {selectedProducts.length} Ürünü Sil
            </Button>
          )}
        </div>
      </div>
      
      <Card className="mb-6">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Ürün ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Select
                value={filterStatus}
                onValueChange={setFilterStatus}
              >
                <SelectTrigger className="w-[160px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Pasif</SelectItem>
                  <SelectItem value="draft">Taslak</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={sortBy}
                onValueChange={setSortBy}
              >
                <SelectTrigger className="w-[160px]">
                  <ArrowDownUp className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Sıralama" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_timestamp">Eklenme Tarihi</SelectItem>
                  <SelectItem value="title">İsim</SelectItem>
                  <SelectItem value="price">Fiyat</SelectItem>
                  <SelectItem value="quantity">Stok</SelectItem>
                  <SelectItem value="views">Görüntülenme</SelectItem>
                  <SelectItem value="sold">Satış</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="h-10 w-10"
              >
                {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              </Button>
              
              <div className="flex rounded-md border">
                <Button
                  variant={gridType === 'grid3' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setGridType('grid3')}
                  className="h-10 w-10 rounded-none rounded-l-md"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={gridType === 'grid5' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setGridType('grid5')}
                  className="h-10 w-10 rounded-none"
                >
                  <div className="grid grid-cols-2 gap-px w-4 h-4">
                    <div className="bg-current rounded-sm" />
                    <div className="bg-current rounded-sm" />
                    <div className="bg-current rounded-sm" />
                    <div className="bg-current rounded-sm" />
                  </div>
                </Button>
                <Button
                  variant={gridType === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setGridType('list')}
                  className="h-10 w-10 rounded-none rounded-r-md"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* All Selected Checkbox */}
      <div className="flex items-center mb-4">
        <Checkbox
          id="selectAll"
          checked={selectAllChecked}
          onCheckedChange={toggleSelectAll}
          className="mr-2"
        />
        <label
          htmlFor="selectAll"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {filteredProducts.length > 0
            ? `${selectedProducts.length === filteredProducts.length
                ? 'Tümü seçili'
                : selectedProducts.length > 0
                  ? `${selectedProducts.length} ürün seçili`
                  : 'Tümünü seç'}`
            : 'Ürün bulunamadı'}
        </label>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className={gridType === 'list' ? 'space-y-4' : `grid grid-cols-1 md:grid-cols-${gridType === 'grid3' ? '3' : '5'} gap-4`}>
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className={`bg-white rounded-xl shadow-sm overflow-hidden ${gridType === 'list' ? 'flex' : ''}`}>
              <div className={`${gridType === 'list' ? 'w-[140px] h-[140px]' : 'w-full aspect-square'} bg-gray-100`}>
                <Skeleton className="h-full w-full" />
              </div>
              <div className="p-4 space-y-2 flex-1">
                <Skeleton className="h-6 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Products Grid/List */}
      {!loading && (
        <>
          {filteredProducts.length === 0 ? (
            <div className="bg-white p-8 rounded-xl shadow-sm text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <Package className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Ürün Bulunamadı</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm
                  ? `"${searchTerm}" araması için sonuç bulunamadı.`
                  : filterStatus !== "all"
                  ? `${filterStatus === "active" ? "Aktif" : filterStatus === "inactive" ? "Pasif" : "Taslak"} durumda ürün bulunamadı.`
                  : "Henüz hiç ürün eklenmemiş."}
              </p>
              <Button onClick={handleOpenCreateModal}>
                <Plus className="mr-2 h-4 w-4" />
                Yeni Ürün Ekle
              </Button>
            </div>
          ) : (
            <div className={gridType === 'list' ? 'space-y-4' : `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-${gridType === 'grid3' ? '3' : '5'} gap-4`}>
              {filteredProducts.map((product) => (
                <ProductCard 
                  key={product.listing_id} 
                  product={product}
                  listView={gridType === 'list'}
                />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && !searchTerm && filterStatus === 'all' && (
            <div className="mt-6 flex items-center justify-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadProducts(1)}
                disabled={currentPage === 1 || loading}
              >
                İlk
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadProducts(currentPage - 1)}
                disabled={currentPage === 1 || loading}
              >
                Önceki
              </Button>
              
              <span className="text-sm text-gray-500 mx-2">
                Sayfa {currentPage} / {totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadProducts(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
              >
                Sonraki
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadProducts(totalPages)}
                disabled={currentPage === totalPages || loading}
              >
                Son
              </Button>
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <>
          <Dialog 
            open={!!showEditModal} 
            onOpenChange={(open) => {
              if (!open) {
                setShowEditModal(null);
              }
            }}
          >
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Ürünü Düzenle: {showEditModal?.title}</DialogTitle>
                <DialogDescription>
                  Bu ürünün detaylarını düzenleyin.
                </DialogDescription>
              </DialogHeader>

              {/* Tek Parça Form İçeriği */}
              <div className="py-4 space-y-6">
                {/* Temel Bilgiler Bölümü */}
                <section className="space-y-4 border-b pb-6">
                  <h3 className="text-lg font-semibold">Temel Bilgiler</h3>
                  <div>
                    <Label htmlFor="edit-title">Başlık</Label>
                    <Input
                      id="edit-title"
                      value={showEditModal?.title}
                      onChange={(e) => setShowEditModal({ ...showEditModal, title: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-description">Açıklama</Label>
                    <Textarea
                      id="edit-description"
                      value={showEditModal?.description}
                      onChange={(e) => setShowEditModal({ ...showEditModal, description: e.target.value })}
                      required
                    />
                  </div>
                </section>

                {/* Görseller & Video Bölümü */}
                <section className="space-y-4 border-b pb-6">
                  <h3 className="text-lg font-semibold">Görseller & Video</h3>
                  <div>
                    <Label>Görseller ({showEditModal?.images.length || 0}/10)</Label>
                    <div className="mt-4 grid grid-cols-3 gap-4">
                      {showEditModal?.images.map((image, index) => (
                        <div
                          key={image.listing_image_id}
                          className="relative group"
                        >
                          <img src={image.url_570xN} alt={image.alt_text || `Görsel ${index + 1}`} className="w-full h-32 object-cover rounded" />
                          {index === 0 && <Badge className="absolute top-2 left-2">Ana Görsel</Badge>}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Fiyat & Envanter Bölümü */}
                <section className="space-y-4 border-b pb-6">
                  <h3 className="text-lg font-semibold">Fiyat & Envanter</h3>
                  <div>
                    <Label htmlFor="price">Fiyat (USD)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={createForm.price}
                      onChange={(e) => setCreateForm({ ...createForm, price: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                  {!createForm.has_variations && (
                    <div>
                      <Label htmlFor="quantity">Miktar</Label>
                      <Input
                        id="quantity"
                        type="number"
                        step="1"
                        value={createForm.quantity}
                        onChange={(e) => setCreateForm({ ...createForm, quantity: parseInt(e.target.value) })}
                        required
                      />
                    </div>
                  )}
                </section>

                {/* Detaylar & Nitelikler Bölümü */}
                <section className="space-y-4 border-b pb-6">
                  <h3 className="text-lg font-semibold">Detaylar & Nitelikler</h3>
                  <div>
                    <Label htmlFor="taxonomy_id">Kategori</Label>
                    <Select
                      onValueChange={(value) => setCreateForm({ ...createForm, taxonomy_id: parseInt(value) })}
                      value={createForm.taxonomy_id?.toString()}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Bir kategori seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {taxonomyNodes.map(node => (
                          <SelectItem key={node.id} value={node.id.toString()}>
                            {node.path.join(' > ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Etiketler */}
                  <div>
                    <Label htmlFor="tags">Etiketler (Max 13)</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="tagInput"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="Etiket ekle (örn: tablo, sanat)"
                        onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                      />
                      <Button type="button" onClick={addTag}>Ekle</Button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {createForm.tags.map(tag => (
                        <Badge key={tag} variant="secondary">
                          {tag} <button type="button" onClick={() => removeTag(tag)} className="ml-1 text-red-500"><X size={12} /></button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Malzemeler */}
                  <div>
                    <Label htmlFor="materials">Malzemeler (Max 13)</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="materialInput"
                        value={materialInput}
                        onChange={(e) => setMaterialInput(e.target.value)}
                        placeholder="Malzeme ekle (örn: tuval, yağlı boya)"
                        onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMaterial(); } }}
                      />
                      <Button type="button" onClick={addMaterial}>Ekle</Button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {createForm.materials.map(material => (
                        <Badge key={material} variant="secondary">
                          {material} <button type="button" onClick={() => removeMaterial(material)} className="ml-1 text-red-500"><X size={12} /></button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Kargo & Hazırlık Bölümü */}
                <section className="space-y-4 border-b pb-6">
                  <h3 className="text-lg font-semibold">Kargo & Hazırlık</h3>
                  <div>
                    <Label htmlFor="shipping_profile_id">Kargo Profili</Label>
                    <Select
                      onValueChange={(value) => setCreateForm({ ...createForm, shipping_profile_id: parseInt(value) })}
                      value={createForm.shipping_profile_id?.toString()}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Bir kargo profili seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {shippingProfiles.map(profile => (
                          <SelectItem key={profile.shipping_profile_id} value={profile.shipping_profile_id.toString()}>
                            {profile.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </section>

                {/* Kişiselleştirme Bölümü */}
                <section className="space-y-4">
                  <h3 className="text-lg font-semibold">Kişiselleştirme</h3>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_personalizable"
                      checked={createForm.is_personalizable}
                      onCheckedChange={(checked) => setCreateForm({ ...createForm, is_personalizable: checked as boolean })}
                    />
                    <Label htmlFor="is_personalizable">Kişiselleştirilebilir mi?</Label>
                  </div>

                  {createForm.is_personalizable && (
                    <div className="space-y-4 pl-4 border-l">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="personalization_is_required"
                          checked={createForm.personalization_is_required}
                          onCheckedChange={(checked) => setCreateForm({ ...createForm, personalization_is_required: checked as boolean })}
                        />
                        <Label htmlFor="personalization_is_required">Alıcıdan kişiselleştirme bilgisini zorunlu kıl</Label>
                      </div>
                      <div>
                        <Label htmlFor="personalization_instructions">Alıcıya Talimatlar</Label>
                        <Textarea
                          id="personalization_instructions"
                          value={createForm.personalization_instructions || ''}
                          onChange={(e) => setCreateForm({ ...createForm, personalization_instructions: e.target.value })}
                          placeholder="Alıcıya kişiselleştirme için vermesi gereken bilgileri yazın"
                        />
                      </div>
                    </div>
                  )}
                </section>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>İptal</Button>
                <Button onClick={handleCreateProduct} disabled={submitting}>
                  {submitting ? ( <Loader2 className="mr-2 h-4 w-4 animate-spin" /> ) : (isCopyMode ? 'Kopyayı Oluştur' : 'Oluştur')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Kapatma onayı */}
          <AlertDialog open={showCloseConfirm && pendingModalType === 'create'} onOpenChange={setShowCloseConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Değişiklikler kaybolacak</AlertDialogTitle>
                <AlertDialogDescription>Yeni ürün eklemeden çıkmak istediğinize emin misiniz?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setShowCloseConfirm(false)}>Hayır</AlertDialogCancel>
                <AlertDialogAction onClick={() => { setShowCreateModal(false); setShowCloseConfirm(false); setPendingModalType(null); }}>Evet, Çık</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
      
      {confirmDeleteProductId && (
        <AlertDialog open={true}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ürünü Sil</AlertDialogTitle>
              <AlertDialogDescription>
                Bu ürünü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve Etsy'den de kaldırılacaktır.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelDelete}>İptal</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => handleDeleteProduct(confirmDeleteProductId)}
                disabled={deletingProductId === confirmDeleteProductId}
                className="bg-red-500 hover:bg-red-600"
              >
                {deletingProductId === confirmDeleteProductId ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Siliniyor...
                  </>
                ) : (
                  "Evet, Sil"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
} 