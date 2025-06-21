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
  GripVertical, // Sürükleme ikonunu ekledim
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
  state?: "active" | "draft"
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
    taxonomy_id: 1
  })
  const [tagInput, setTagInput] = useState("")
  const [materialInput, setMaterialInput] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [cachingImages, setCachingImages] = useState(false)
  const [cachingAllImages, setCachingAllImages] = useState(false)
  const [analytics, setAnalytics] = useState<Record<number, { view: number; sale: number; revenue: number }>>({});
  const [shippingProfiles, setShippingProfiles] = useState<{ shipping_profile_id: number; title: string }[]>([]);
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

  // ProductImage bileşenini daha güvenli hale getiriyorum:
  const ProductImage = ({ product }: { product: Product }) => {
    const [imageSrc, setImageSrc] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [isVideo, setIsVideo] = useState(false);
    
    // Client-side'da resim URL'sini ayarlıyoruz (SSR/client hydration uyumsuzluğunu önlemek için)
    useEffect(() => {
      if (Array.isArray(product.images) && product.images.length > 0 && product.images[0].url_570xN) {
        // Check if it's a video by looking for more indicators
        const url = product.images[0].url_570xN;
        const isVideoUrl = Boolean(
          url.includes('.mp4') || 
          url.includes('.mov') || 
          url.includes('.avi') || 
          url.includes('.webm') || 
          url.toLowerCase().includes('video') ||
          (product.images[0].alt_text && product.images[0].alt_text.toLowerCase().includes('video'))
        );
        
        setIsVideo(isVideoUrl);
        // API'den gelen resim URL'sini kullan
        setImageSrc(url);
      } else if (product.listing_id) {
        // Etsy'nin standart listing ID formatını kullan
        setImageSrc(`https://i.etsystatic.com/isla/etc/placeholder.jpg?listing_id=${product.listing_id}`);
        setIsVideo(false);
      } else {
        // Varsayılan placeholder
        setImageSrc("https://via.placeholder.com/570x570.png?text=No+Image");
        setIsVideo(false);
      }
      
      // Yükleme durumunu güncelle
      setIsLoading(false);
    }, [product]);
    
    return (
      <div className="relative w-full h-full">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        {imageSrc && isVideo ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 relative">
            <Video className="h-16 w-16 text-white opacity-80" />
            <div className="mt-2 px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
              Video İçeriği
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-2">
              {product.title}
            </div>
          </div>
        ) : imageSrc && (
          <img 
            src={imageSrc}
            alt={product.title}
            className={`w-full h-full object-cover transform hover:scale-105 transition-transform duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
            loading="lazy"
            onLoad={() => setIsLoading(false)}
            onError={(e) => {
              setHasError(true);
              setIsLoading(false);
              const target = e.target as HTMLImageElement;
              target.onerror = null; // Sonsuz döngüyü engelle
              
              // Alternatif resim dene
              if (target.src !== `https://i.etsystatic.com/isla/etc/placeholder.jpg?listing_id=${product.listing_id}`) {
                setImageSrc(`https://i.etsystatic.com/isla/etc/placeholder.jpg?listing_id=${product.listing_id}`);
              } else {
                setImageSrc("https://via.placeholder.com/570x570.png?text=No+Image");
              }
            }}
          />
        )}
        
        {hasError && process.env.NODE_ENV === 'development' && !isVideo && (
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-1 truncate">
            ID: {product.listing_id}
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
  
  // Veri yenileme fonksiyonu
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
          force_refresh: true
        })
      });
      
      const refreshData = await refreshResponse.json();
      
      // Check if reconnection is required
      if (!refreshResponse.ok || (refreshData && refreshData.reconnect_required)) {
        console.error("Etsy connection refresh failed or reconnection required:", refreshData);
        
        if (refreshData.reconnect_required) {
          toast({
            title: "Etsy bağlantısı gerekiyor",
            description: "Etsy mağazanıza yeniden bağlanmanız gerekiyor.",
            variant: "destructive",
            action: <ToastAction altText="Bağlan" onClick={handleReconnectEtsy}>Bağlan</ToastAction>
          });
          setEtsyConnected(false);
          setLoading(false);
          return;
        }
        
        toast({
          title: "Yenileme başarısız",
          description: "Ürünler yenilenirken bir hata oluştu.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      // Now load the products
      await loadProducts(1);
      
      if (showNotification) {
        toast({
          title: "Ürünler yenilendi",
          description: "Ürün listesi başarıyla güncellendi."
        });
      }
    } catch (error) {
      console.error("Error refreshing products:", error);
      
      // Check if there's a connection issue
      if (error instanceof Error && 
          (error.message.includes("token") || 
           error.message.includes("connection") || 
           error.message.includes("unauthorized"))) {
        toast({
          title: "Etsy bağlantısı gerekiyor",
          description: "Etsy mağazanıza yeniden bağlanmanız gerekiyor.",
          variant: "destructive",
          action: <ToastAction altText="Bağlan" onClick={handleReconnectEtsy}>Bağlan</ToastAction>
        });
        setEtsyConnected(false);
      } else {
        toast({
          title: "Yenileme başarısız",
          description: "Ürünler yenilenirken bir hata oluştu.",
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
      
      // Set up request parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        state: filterStatus === 'all' ? 'active' : filterStatus,
        skip_cache: 'true', // Always skip cache to ensure fresh data
      }).toString()
      
      // Make API request with proper error handling
      const response = await fetch(`/api/etsy/listings?${params}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      
      // If the response indicates unauthorized/token issues
      if (response.status === 401) {
        console.error("Unauthorized or token expired")
        
        // Try to automatically refresh the token
        const refreshResponse = await fetch('/api/etsy/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            force_refresh: true
          })
        }).catch(e => {
          console.error("Token refresh failed:", e);
          return null;
        });
        
        if (refreshResponse && refreshResponse.ok) {
          console.log("Token refreshed successfully, retrying product load");
          
          // Try again with the new token
          const retryResponse = await fetch(`/api/etsy/listings?${params}`, {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          
          if (retryResponse.ok) {
            console.log("Retry successful after token refresh");
            const data = await retryResponse.json();
            
            if (data.listings && Array.isArray(data.listings)) {
              setProducts(data.listings);
              setTotalPages(data.total_pages || 1);
              setTotalCount(data.count || 0);
              setReconnectRequired(false);
              setEtsyConnected(true);
              
              setLoading(false);
              return;
            }
          }
        }
        
        setEtsyConnected(false);
        setReconnectRequired(true);
        
        toast({
          title: "Etsy bağlantısı gerekiyor",
          description: "Oturum süresi dolmuş. Etsy mağazanıza yeniden bağlanmanız gerekiyor.",
          variant: "destructive",
          action: <ToastAction altText="Bağlan" onClick={handleReconnectEtsy}>Bağlan</ToastAction>
        });
        
        setLoading(false);
        return;
      }
      
      // For other API errors
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: "API yanıtı okunamadı" };
        }
        
        console.error("Product loading error:", errorData);
        
        // Check if it's a connection issue
        if (errorData.reconnect_required || 
           (errorData.error && typeof errorData.error === 'string' && 
           (errorData.error.includes('token') || 
            errorData.error.includes('connect') || 
            errorData.error.includes('auth')))) {
          
          setReconnectRequired(true);
          setEtsyConnected(false);
          
          toast({
            title: "Etsy bağlantısı gerekiyor",
            description: "Bağlantı süresi dolmuş. Etsy mağazanıza yeniden bağlanmanız gerekiyor.",
            variant: "destructive",
            action: <ToastAction altText="Bağlan" onClick={handleReconnectEtsy}>Bağlan</ToastAction>
          });
          
          setLoading(false);
          return;
        }
        
        toast({
          title: "Ürünler yüklenemedi",
          description: errorData.error || "Bilinmeyen bir hata oluştu",
          variant: "destructive"
        });
        
        setLoading(false);
        return;
      }
      
      // Process successful response
      const data = await response.json();
      
      if (data.listings && Array.isArray(data.listings)) {
        // Update state with API data
        setProducts(data.listings);
        setTotalPages(data.total_pages || 1);
        setTotalCount(data.count || 0);
        
        // Update store information if available
        if (data.shop_id) {
          setCurrentStore(prev => {
            // If store name already exists, keep it
            return {
              shop_id: data.shop_id,
              shop_name: prev?.shop_name || `Mağaza #${data.shop_id}`
            }
          });
          
          // Also fetch store details if we don't have them
          if (!currentStore?.shop_name || currentStore.shop_name.includes('#')) {
            fetchStoreDetails(data.shop_id);
          }
        }
        
        // Reset connection-related errors since we successfully got data
        setReconnectRequired(false);
        setEtsyConnected(true);
        
        console.log(`Loaded ${data.listings.length} products (page ${page}/${data.total_pages})`);
      } else {
        console.error("No listings data in API response:", data);
        
        // Check if reconnection error is indicated
        if (data.error && typeof data.error === 'string' && 
            (data.error.includes('token') || data.error.includes('auth') || data.error.includes('connect'))) {
          setReconnectRequired(true);
          setEtsyConnected(false);
          
          toast({
            title: "Etsy bağlantısı gerekiyor",
            description: "Etsy mağazanıza yeniden bağlanmanız gerekiyor.",
            variant: "destructive",
            action: <ToastAction altText="Bağlan" onClick={handleReconnectEtsy}>Bağlan</ToastAction>
          });
        } else {
          toast({
            title: "Ürün bulunamadı",
            description: "Mağazanızda hiç ürün bulunamadı veya veri alınamadı.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error("Error loading products:", error);
      toast({
        title: "Hata",
        description: "Ürünler yüklenirken bir hata oluştu",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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

  const loadShippingProfiles = async () => {
    try {
      // Kullanıcı ve mağaza id'sini çek
      const storesRes = await fetch('/api/etsy/stores');
      if (storesRes.ok) {
        const storesData = await storesRes.json();
        if (storesData.stores && storesData.stores.length > 0) {
          const shopId = storesData.stores[0].shop_id;
          const profilesRes = await fetch(`/api/etsy/shipping-profiles?shop_id=${shopId}`);
          if (profilesRes.ok) {
            const profilesData = await profilesRes.json();
            setShippingProfiles(profilesData.shipping_profiles || []);
          }
        }
      }
    } catch (err) {
      setShippingProfiles([]);
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

  const handleCreateProduct = async () => {
    if (!createForm.title || !createForm.description || createForm.price <= 0) {
      alert("Lütfen tüm gerekli alanları doldurun!")
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/etsy/listings/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...createForm,
          price: Math.round(createForm.price * 100), // USD cents'e çevir
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert("✅ Ürün başarıyla oluşturuldu!")
        setShowCreateModal(false)
        setCreateForm({
          title: "",
          description: "",
          price: 0,
          quantity: 1,
          tags: [],
          materials: [],
          who_made: "i_did",
          when_made: "made_to_order",
          taxonomy_id: 1
        })
        loadProducts() // Listeyi yenile
      } else {
        const errorData = await response.json()
        alert(`❌ Hata: ${errorData.details || errorData.error}`)
      }
    } catch (error) {
      console.error("Create product error:", error)
      alert("❌ Ürün oluşturulurken hata oluştu!")
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateProduct = async (product: Product) => {
    setSubmitting(true);
    try {
      // Ensure quantity is properly parsed as a number
      const quantityValue = typeof product.quantity === 'string' 
        ? parseInt(product.quantity, 10) 
        : product.quantity;
      
      // Create a copy of the product with the parsed quantity and ensure price is properly formatted
      const productToUpdate = {
        ...product,
        quantity: quantityValue
      };
      
      console.log("Updating product:", productToUpdate.listing_id, "Quantity:", quantityValue, "Type:", typeof quantityValue);
      
      // Update the product in our local state first for immediate UI feedback
      setProducts(prevProducts => {
        return prevProducts.map(p => {
          if (p.listing_id === productToUpdate.listing_id) {
            return { ...p, quantity: quantityValue };
          }
          return p;
        });
      });
      
      setFilteredProducts(prevProducts => {
        return prevProducts.map(p => {
          if (p.listing_id === productToUpdate.listing_id) {
            return { ...p, quantity: quantityValue };
          }
          return p;
        });
      });
      
      // Send the update to the API
      const response = await fetch(`/api/etsy/listings/${productToUpdate.listing_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify(productToUpdate)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }
      
      const updatedProduct = await response.json();
      console.log("Product updated successfully:", updatedProduct);
      
      // Show success message
      toast({
        title: "Ürün güncellendi",
        description: "Ürün başarıyla güncellendi",
        variant: "default",
      });
      
      // Set submitting to false before showing any modal dialogs
      setSubmitting(false);
      
      // Close any edit modals that might be open
      if (showEditModal && showEditModal.listing_id === productToUpdate.listing_id) {
        setShowEditModal(null);
      }
      
    } catch (error) {
      console.error("Update product error:", error);
      toast({
        title: "Ürün güncelleme hatası",
        description: error instanceof Error ? error.message : "Ürün güncellenirken bir hata oluştu",
        variant: "destructive",
      });
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

  const handleOpenCreateModal = () => {
    setCreateForm({
      title: "",
      description: "",
      price: 0,
      quantity: 1,
      tags: [],
      materials: [],
      who_made: "i_did",
      when_made: "made_to_order",
      taxonomy_id: 1
    });
    setShowCreateModal(true);
  };

  const handleCopyProduct = (product: Product) => {
    setCreateForm({
      title: product.title + " (Kopya)",
      description: product.description,
      price: product.price.amount / product.price.divisor,
      quantity: product.quantity,
      tags: product.tags,
      materials: [],
      who_made: "i_did",
      when_made: "made_to_order",
      taxonomy_id: 1
    });
    setShowCreateModal(true);
  };

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
          {/* Görsel */}
          <div className="relative w-[140px] h-[140px] bg-gray-50 flex-shrink-0 flex items-center justify-center overflow-hidden">
            <ProductImage product={product} />
            <div className="absolute top-2 left-2 z-30">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleProductSelection(product.listing_id)}
                className="bg-white border-gray-300 rounded-sm"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            {Array.isArray(product.images) && product.images.length > 0 && 
             (product.images[0].url_570xN.includes('.mp4') || 
              product.images[0].url_570xN.includes('.mov') || 
              product.images[0].url_570xN.includes('.avi') || 
              product.images[0].url_570xN.includes('.webm') || 
              product.images[0].url_570xN.toLowerCase().includes('video') ||
              (product.images[0].alt_text && product.images[0].alt_text.toLowerCase().includes('video'))) && (
              <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs py-1 px-2 rounded-full z-20">
                <Video className="h-3 w-3 inline mr-1" />
                Video
              </div>
            )}
          </div>
          {/* Bilgi alanı */}
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
        className={`bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col relative hover:shadow-lg transition-shadow duration-300 border border-gray-100 ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}`}
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
        {/* Checkbox ve durum etiketi */}
        <div className="absolute top-2 left-2 z-30">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleProductSelection(product.listing_id)}
            className="bg-white border-gray-300 rounded-sm"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        {/* <div className="absolute top-2 right-2 z-30">
          <ProductStatus status={product.state} grid />
        </div> */}
        {/* Ürün görseli */}
        <div className="w-full aspect-square bg-gray-50 flex items-center justify-center overflow-hidden relative">
          <ProductImage product={product} />
          {Array.isArray(product.images) && product.images.length > 0 && 
           (product.images[0].url_570xN.includes('.mp4') || 
            product.images[0].url_570xN.includes('.mov') || 
            product.images[0].url_570xN.includes('.avi') || 
            product.images[0].url_570xN.includes('.webm') || 
            product.images[0].url_570xN.toLowerCase().includes('video') ||
            (product.images[0].alt_text && product.images[0].alt_text.toLowerCase().includes('video'))) && (
            <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs py-1 px-2 rounded-full z-20">
              <Video className="h-3 w-3 inline mr-1" />
              Video
            </div>
          )}
        </div>
        {/* Bilgi alanı */}
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

  // Etsy yeniden bağlantı fonksiyonu
  const handleReconnectEtsy = async () => {
    try {
      setRefreshing(true);
      
      // First try to refresh the token automatically
      const refreshRes = await fetch('/api/etsy/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          force_refresh: true
        })
      }).catch(e => null);
      
      if (refreshRes && refreshRes.ok) {
        const refreshData = await refreshRes.json();
        
        if (!refreshData.reconnect_required) {
          // Token refreshed successfully, reload products
          toast({
            title: "Bağlantı yenilendi",
            description: "Etsy bağlantısı başarıyla yenilendi. Ürünler yükleniyor...",
            variant: "default",
          });
          
          await loadProducts();
          setRefreshing(false);
          return;
        }
      }
      
      // If automatic refresh failed, get the Etsy OAuth URL for manual reconnection
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

  {/* Edit Modal */}
  {showEditModal && (
    <Dialog open={!!showEditModal} onOpenChange={() => setShowEditModal(null)}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Ürün Düzenle</DialogTitle>
          <DialogDescription>
            {showEditModal.title} ürününü düzenleyin
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sol Kolon - Ana Bilgiler */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Ürün Başlığı</Label>
              <Input
                id="edit-title"
                value={showEditModal.title}
                onChange={(e) => setShowEditModal(prev => prev ? { ...prev, title: e.target.value } : null)}
              />
            </div>

            <div>
              <Label htmlFor="edit-description">Açıklama</Label>
              <Textarea
                id="edit-description"
                value={showEditModal.description}
                onChange={(e) => setShowEditModal(prev => prev ? { ...prev, description: e.target.value } : null)}
                rows={8}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-price">Fiyat (USD)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  value={showEditModal.price.amount / showEditModal.price.divisor}
                  onChange={(e) => setShowEditModal(prev => prev ? {
                    ...prev,
                    price: {
                      ...prev.price,
                      amount: Math.round(parseFloat(e.target.value) * prev.price.divisor)
                    }
                  } : null)}
                />
              </div>
              <div>
                <Label htmlFor="edit-quantity">Stok</Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  min="0"
                  value={showEditModal.quantity}
                  onChange={(e) => setShowEditModal(prev => prev ? { 
                    ...prev, 
                    quantity: parseInt(e.target.value) || 0 
                  } : null)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-state">Durum</Label>
              <Select 
                value={showEditModal.state} 
                onValueChange={(value: any) => setShowEditModal(prev => prev ? { ...prev, state: value } : null)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Pasif</SelectItem>
                  <SelectItem value="draft">Taslak</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Etiketler düzenleme */}
            <div className="mt-4">
              <Label className="block mb-2">Etiketler</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {showEditModal.tags?.map((tag, index) => (
                  <Badge key={index} className="flex items-center gap-1 px-3 py-1">
                    {tag}
                    <Button 
                      type="button" 
                      size="icon" 
                      variant="ghost" 
                      className="h-4 w-4"
                      onClick={() => {
                        setShowEditModal(prev => {
                          if (!prev) return null;
                          const newTags = [...prev.tags];
                          newTags.splice(index, 1);
                          return { ...prev, tags: newTags };
                        });
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
                <div className="flex gap-2 min-w-[300px] mt-2">
                  <Input
                    placeholder="Yeni etiket ekle..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && tagInput.trim()) {
                        e.preventDefault();
                        setShowEditModal(prev => {
                          if (!prev) return null;
                          const newTags = [...prev.tags];
                          if (!newTags.includes(tagInput.trim())) {
                            newTags.push(tagInput.trim());
                          }
                          return { ...prev, tags: newTags };
                        });
                        setTagInput('');
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    onClick={() => {
                      if (tagInput.trim()) {
                        setShowEditModal(prev => {
                          if (!prev) return null;
                          const newTags = [...prev.tags];
                          if (!newTags.includes(tagInput.trim())) {
                            newTags.push(tagInput.trim());
                          }
                          return { ...prev, tags: newTags };
                        });
                        setTagInput('');
                      }
                    }}
                  >
                    Ekle
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sağ Kolon - Resimler ve Diğer Özellikler */}
          <div className="space-y-4">
            <div>
              <Label className="block mb-2 flex items-center justify-between">
                <span>Ürün Resimleri ve Videolar</span>
                <span className="text-xs text-gray-500">Sürükleyerek sıralayabilirsiniz</span>
              </Label>
              {showEditModal.images && showEditModal.images.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {showEditModal.images.map((image, index) => (
                    <div 
                      key={index} 
                      className={`relative group rounded-md overflow-hidden border ${index === 0 ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', index.toString());
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
                        if (draggedIndex !== index) {
                          setShowEditModal(prev => {
                            if (!prev) return null;
                            const newImages = [...prev.images];
                            const temp = newImages[draggedIndex];
                            // Diğer resimleri kaydır
                            if (draggedIndex < index) {
                              for (let i = draggedIndex; i < index; i++) {
                                newImages[i] = newImages[i + 1];
                              }
                            } else {
                              for (let i = draggedIndex; i > index; i--) {
                                newImages[i] = newImages[i - 1];
                              }
                            }
                            newImages[index] = temp;
                            return { ...prev, images: newImages };
                          });
                        }
                      }}
                    >
                      {index === 0 && (
                        <div className="absolute top-2 left-2 z-10 bg-blue-600 text-white text-xs py-1 px-2 rounded-sm font-medium">
                          Primary
                        </div>
                      )}
                      <div className="absolute top-2 right-2 z-10 cursor-grab opacity-60 hover:opacity-100">
                        <GripVertical className="h-5 w-5 text-white drop-shadow-md" />
                      </div>
                      
                      {image.url_570xN.includes('.mp4') || image.url_570xN.toLowerCase().includes('video') ? (
                        <div className="w-full h-40 flex flex-col items-center justify-center bg-gray-800">
                          <Video className="h-12 w-12 text-white opacity-80 mb-2" />
                          <div className="bg-blue-600 text-white text-xs py-1 px-3 rounded-full font-medium">
                            Video
                          </div>
                          <div className="mt-2 text-xs text-gray-300 px-2 text-center">
                            {image.alt_text || "Ürün videosu"}
                          </div>
                        </div>
                      ) : (
                        <img 
                          src={image.url_570xN} 
                          alt={image.alt_text || `Ürün resmi ${index + 1}`} 
                          className="w-full h-40 object-cover"
                        />
                      )}
                      
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex gap-2">
                            {index !== 0 && (
                              <Button 
                                variant="secondary" 
                                size="sm" 
                                className="bg-blue-500 hover:bg-blue-600 text-white"
                                title="Ana resim yap"
                                onClick={() => {
                                  setShowEditModal(prev => {
                                    if (!prev) return null;
                                    const newImages = [...prev.images];
                                    // Seçilen resmi çıkar ve başa ekle
                                    const [selected] = newImages.splice(index, 1);
                                    newImages.unshift(selected);
                                    return { ...prev, images: newImages };
                                  });
                                }}
                              >
                                Ana Resim Yap
                              </Button>
                            )}
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              className="bg-red-600/90 hover:bg-red-700"
                              title="Resmi kaldır"
                              onClick={() => {
                                setShowEditModal(prev => {
                                  if (!prev) return null;
                                  const newImages = [...prev.images];
                                  newImages.splice(index, 1);
                                  return { ...prev, images: newImages };
                                });
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="p-2 bg-gray-50 text-xs truncate">
                        <span className="font-medium text-gray-600 block mb-1">
                          {image.url_570xN.includes('.mp4') || image.url_570xN.toLowerCase().includes('video') ? 
                            'Video Dosyası' : 
                            `Resim ${index + 1}`
                          }
                        </span>
                        <Input 
                          value={image.alt_text || ''} 
                          placeholder={image.url_570xN.includes('.mp4') || image.url_570xN.toLowerCase().includes('video') ? 
                            "Video açıklaması" : 
                            "Resim açıklaması"
                          }
                          onChange={(e) => {
                            setShowEditModal(prev => {
                              if (!prev) return null;
                              const newImages = [...prev.images];
                              newImages[index] = { ...newImages[index], alt_text: e.target.value };
                              return { ...prev, images: newImages };
                            });
                          }}
                          className="mt-1 text-xs p-1 h-6"
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-center h-40 border-2 border-dashed border-gray-300 rounded-md">
                    <Label htmlFor="edit-add-image" className="cursor-pointer flex flex-col items-center p-4">
                      <Upload className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">Yeni Resim/Video Ekle</span>
                      <span className="text-xs text-gray-400 mt-1">Maks. 10 dosya</span>
                      <Input 
                        id="edit-add-image" 
                        type="file" 
                        accept="image/*,video/*"
                        multiple
                        className="hidden" 
                        onChange={(e) => {
                          // Resim ekleme işlemi
                          // Gerçek bir uygulamada burası API'ye yükleme yapacaktır
                          if (e.target.files && e.target.files.length > 0) {
                            toast({
                              title: "Dosya yükleme",
                              description: `${e.target.files.length} dosya yüklenmeye hazır (API entegrasyonu gerekiyor)`,
                            });
                          }
                        }}
                      />
                    </Label>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 border-2 border-dashed border-gray-300 rounded-md">
                  <Label htmlFor="edit-add-image" className="cursor-pointer flex flex-col items-center p-4">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Henüz Resim/Video Yok</span>
                    <span className="text-xs text-gray-400 mt-1">Dosya eklemek için tıklayın</span>
                    <Input 
                      id="edit-add-image" 
                      type="file" 
                      accept="image/*,video/*"
                      multiple
                      className="hidden" 
                      onChange={(e) => {
                        // Resim ekleme işlemi
                        if (e.target.files && e.target.files.length > 0) {
                          toast({
                            title: "Dosya yükleme",
                            description: `${e.target.files.length} dosya yüklenmeye hazır (API entegrasyonu gerekiyor)`,
                          });
                        }
                      }}
                    />
                  </Label>
                </div>
              )}
            </div>
            
            <div className="mt-4">
              <Label className="block mb-2">Harici Bağlantılar</Label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                <ExternalLink className="h-5 w-5 text-gray-500" />
                <a 
                  href={showEditModal.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm truncate"
                >
                  Etsy'de Görüntüle
                </a>
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-600 mb-2">Ürün Bilgileri</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Ürün ID:</span> 
                  <span className="font-medium ml-1">{showEditModal.listing_id}</span>
                </div>
                <div>
                  <span className="text-gray-500">Mağaza ID:</span> 
                  <span className="font-medium ml-1">{showEditModal.shop_id}</span>
                </div>
                <div>
                  <span className="text-gray-500">Oluşturulma:</span> 
                  <span className="font-medium ml-1">{formatDate(showEditModal.created_timestamp)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Son Güncelleme:</span> 
                  <span className="font-medium ml-1">{formatDate(showEditModal.last_modified_timestamp)}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Görüntülenme:</span> 
                  <span className="font-medium ml-1">{showEditModal.metrics?.views || 0}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Satış:</span> 
                  <span className="font-medium ml-1">{showEditModal.metrics?.sold || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => setShowEditModal(null)}>
            İptal
          </Button>
          <Button onClick={() => showEditModal && handleUpdateProduct(showEditModal)} disabled={submitting}>
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Güncelleniyor...</> : "Güncelle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )}

  {/* Create Modal */}
  {showCreateModal && (
    <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Yeni Ürün Ekle</DialogTitle>
          <DialogDescription>Yeni bir ürün oluşturun</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="create-title">Ürün Başlığı</Label>
            <Input
              id="create-title"
              value={createForm.title}
              onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="create-description">Açıklama</Label>
            <Textarea
              id="create-description"
              value={createForm.description}
              onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="create-price">Fiyat (USD)</Label>
              <Input
                id="create-price"
                type="number"
                step="0.01"
                value={createForm.price}
                onChange={(e) => setCreateForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label htmlFor="create-quantity">Stok</Label>
              <Input
                id="create-quantity"
                type="number"
                value={createForm.quantity}
                onChange={(e) => setCreateForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="create-taxonomy">Kategori</Label>
            <Select
              value={String(createForm.taxonomy_id)}
              onValueChange={(val) => setCreateForm(prev => ({ ...prev, taxonomy_id: parseInt(val) }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Kategori seçin" />
              </SelectTrigger>
              <SelectContent>
                {taxonomyNodes.map((node) => (
                  <SelectItem key={node.id} value={String(node.id)}>{node.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="create-shipping-profile">Kargo Profili</Label>
            <Select
              value={String(createForm.shipping_profile_id || "")}
              onValueChange={(val) => setCreateForm(prev => ({ ...prev, shipping_profile_id: parseInt(val) }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Kargo profili seçin" />
              </SelectTrigger>
              <SelectContent>
                {shippingProfiles.map((profile) => (
                  <SelectItem key={profile.shipping_profile_id} value={String(profile.shipping_profile_id)}>{profile.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="create-who-made">Kim Yaptı?</Label>
              <Select
                value={createForm.who_made}
                onValueChange={(val) => setCreateForm(prev => ({ ...prev, who_made: val as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kim yaptı?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="i_did">Ben yaptım</SelectItem>
                  <SelectItem value="someone_else">Bir başkası</SelectItem>
                  <SelectItem value="collective">Kolektif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="create-when-made">Ne Zaman Yapıldı?</Label>
              <Select
                value={createForm.when_made}
                onValueChange={(val) => setCreateForm(prev => ({ ...prev, when_made: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ne zaman yapıldı?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="made_to_order">Siparişe özel</SelectItem>
                  <SelectItem value="2020_2024">2020-2024</SelectItem>
                  <SelectItem value="2010_2019">2010-2019</SelectItem>
                  <SelectItem value="2000_2009">2000-2009</SelectItem>
                  <SelectItem value="1990s">1990'lar</SelectItem>
                  <SelectItem value="1980s">1980'ler</SelectItem>
                  <SelectItem value="1970s">1970'ler</SelectItem>
                  <SelectItem value="1960s">1960'lar</SelectItem>
                  <SelectItem value="1950s">1950'ler</SelectItem>
                  <SelectItem value="before_1950">1950'den önce</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="create-state">Durum</Label>
            <Select
              value={createForm.state || "active"}
              onValueChange={(val) => setCreateForm(prev => ({ ...prev, state: val as any }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Durum seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="draft">Taslak</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="create-image">Görsel Yükle</Label>
            <Input
              id="create-image"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />
            {imageFile && <div className="mt-2 text-xs text-gray-500">Seçilen dosya: {imageFile.name}</div>}
          </div>
          <div>
            <Label htmlFor="create-tags">Etiketler</Label>
            <div className="flex gap-2 mb-2">
              <Input
                id="create-tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Etiket ekle..."
              />
              <Button type="button" onClick={addTag}>Ekle</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {createForm.tags.map((tag) => (
                <Badge key={tag} className="flex items-center gap-1">
                  {tag}
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeTag(tag)}><X className="w-3 h-3" /></Button>
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="create-materials">Malzemeler</Label>
            <div className="flex gap-2 mb-2">
              <Input
                id="create-materials"
                value={materialInput}
                onChange={(e) => setMaterialInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMaterial())}
                placeholder="Malzeme ekle..."
              />
              <Button type="button" onClick={addMaterial}>Ekle</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {createForm.materials.map((mat) => (
                <Badge key={mat} className="flex items-center gap-1">
                  {mat}
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeMaterial(mat)}><X className="w-3 h-3" /></Button>
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCreateModal(false)}>
            İptal
          </Button>
          <Button onClick={handleCreateProduct} disabled={submitting}>
            {submitting ? "Ekleniyor..." : "Ekle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
