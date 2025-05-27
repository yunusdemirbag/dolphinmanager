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

  // ProductImage bileşenini daha güvenli hale getiriyorum:
  const ProductImage = ({ product }: { product: Product }) => {
    const [imageSrc, setImageSrc] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    
    // Client-side'da resim URL'sini ayarlıyoruz (SSR/client hydration uyumsuzluğunu önlemek için)
    useEffect(() => {
      if (Array.isArray(product.images) && product.images.length > 0 && product.images[0].url_570xN) {
        // API'den gelen resim URL'sini kullan
        setImageSrc(product.images[0].url_570xN);
      } else if (product.listing_id) {
        // Etsy'nin standart listing ID formatını kullan
        setImageSrc(`https://i.etsystatic.com/isla/etc/placeholder.jpg?listing_id=${product.listing_id}`);
      } else {
        // Varsayılan placeholder
        setImageSrc("https://via.placeholder.com/570x570.png?text=No+Image");
      }
    }, [product]);
    
    return (
      <div className="relative w-full h-full">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        {imageSrc && (
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
        
        {hasError && process.env.NODE_ENV === 'development' && (
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
  }, [searchTerm, sortBy, filterStatus, sortOrder])

  useEffect(() => {
    // Artık sahte analytics verisi yok, sadece gerçek Etsy verisi kullanılacak
  }, [products]);

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
      if (refreshing) return // Zaten yenileme işlemi devam ediyorsa çık
      
      // Son yenilemeden bu yana 5 dakika geçmediyse kullanıcıya sor
      if (lastRefresh && (Date.now() - lastRefresh.getTime() < 5 * 60 * 1000)) {
        const confirmRefresh = confirm(
          "Son yenilemeden henüz 5 dakika geçmedi. API çağrı limitlerini aşmamak için gereksiz yenilemeler yapmamaya özen gösterilmelidir. Yine de yenilemek istiyor musunuz?"
        );
        
        if (!confirmRefresh) return;
      }
      
      setRefreshing(true)
      if (showNotification) {
        setRefreshStatus({ message: "Ürün verileri yenileniyor..." })
      }
      
      // API'ye istek gönder
      const response = await fetch("/api/etsy/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          forceRefresh: true // Önbelleği temizle ve yeni veri çek
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Başarılı yenileme sonrası ürünleri yeniden yükle
        await loadProducts()
        setLastRefresh(new Date())
        
        if (showNotification) {
          setRefreshStatus({
            success: true,
            message: "Ürünler başarıyla yenilendi"
          })
        }
      } else {
        if (showNotification) {
          setRefreshStatus({
            success: false,
            message: `Yenileme hatası: ${result.message}`
          })
        }
        console.error("Ürün yenileme hatası:", result.message)
      }
    } catch (error) {
      if (showNotification) {
        setRefreshStatus({
          success: false,
          message: "Ürün yenileme sırasında bir hata oluştu"
        })
      }
      console.error("Ürün yenileme hatası:", error)
    } finally {
      setRefreshing(false)
      
      // 5 saniye sonra bildirim mesajını temizle (sadece bildirim gösteriliyorsa)
      if (showNotification) {
        setTimeout(() => {
          setRefreshStatus({})
        }, 5000)
      }
    }
  }

  const loadProducts = async (page = currentPage) => {
    setLoading(true);
    setReconnectRequired(false); // Reset reconnect flag
    setSessionExpired(false); // Reset session expired flag
    setCurrentStore(null); // Reset current store
    
    // Debug log ekleyelim
    console.log("Loading products - page:", page, "currentPage:", currentPage);
    
    // Sadece ilk sayfa yüklenirken tüm ürünleri temizle
    if (page === 1) {
      setProducts([]); // Clear products initially
      setFilteredProducts([]);
    }
    
    try {
      // 1. Önce mağaza bilgisini al
      console.log("Fetching Etsy stores...");
      const storesRes = await fetch('/api/etsy/stores', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Skip-Cache': 'true' // Her zaman taze veri iste
        }
      });
      
      console.log("Etsy stores API response status:", storesRes.status);
      
      if (!storesRes.ok) {
        console.error(`Stores API error: ${storesRes.status}`);
        if (storesRes.status === 401) {
          setSessionExpired(true);
        } else {
          setReconnectRequired(true);
        }
        setLoading(false);
        return;
      }
      
      const storesData = await storesRes.json();
      console.log("Stores API response:", JSON.stringify(storesData, null, 2));
      
      // Etsy hesabına bağlı değilse veya Etsy'ye yeniden bağlanması gerekiyorsa
      if (storesData.error === 'RECONNECT_REQUIRED') {
        console.log("Store reconnection required");
        setReconnectRequired(true);
        setLoading(false);
        return;
      }
      
      if (!storesData.stores || storesData.stores.length === 0) {
        console.log("No stores found in response:", storesData);
        if (storesData.connected === false) {
          setReconnectRequired(true);
        } else {
          toast({
            title: "Mağaza bulunamadı",
            description: "Etsy hesabınızda aktif bir mağaza bulunamadı. Lütfen Etsy'de bir mağaza oluşturun.",
            variant: "destructive"
          });
        }
        setLoading(false);
        return;
      }
      
      // 2. İlk mağazayı seç ve ürünleri çek
      const firstStore = storesData.stores[0];
      console.log("Selected store:", JSON.stringify(firstStore, null, 2));
      setCurrentStore(firstStore);
      
      if (!firstStore.shop_id) {
        console.error("No valid shop_id in store data:", firstStore);
        toast({
          title: "Mağaza ID bulunamadı",
          description: "Mağaza bilgisinde geçerli bir ID bulunamadı. Lütfen tekrar Etsy'ye bağlanın.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      // 3. Ürünleri çek
      console.log(`Fetching products for shop: ${firstStore.shop_id}, page: ${page}, limit: ${pageSize}`);
      try {
        const listingsRes = await fetch(`/api/etsy/listings?shop_id=${firstStore.shop_id}&page=${page}&limit=${pageSize}`);
        
        if (!listingsRes.ok) {
          console.error(`Listings API error: ${listingsRes.status}`);
          if (listingsRes.status === 401) {
            setSessionExpired(true);
          } else {
            toast({
              title: "Ürünler yüklenemedi",
              description: `Hata kodu: ${listingsRes.status}. Lütfen tekrar deneyin.`,
              variant: "destructive"
            });
          }
          setLoading(false);
          return;
        }
        
        const listingsData = await listingsRes.json();
        console.log("Listings API response:", listingsData);
        
        if (listingsData.error) {
          console.error("Listings API returned error:", listingsData.error);
          toast({
            title: "Etsy API Hatası",
            description: listingsData.message || listingsData.error,
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
        
        if (!listingsData.listings || !Array.isArray(listingsData.listings)) {
          console.error("Invalid listings data format:", listingsData);
          toast({
            title: "Veri formatı hatası",
            description: "Ürün verileri beklendiği formatta değil. Teknik destek ile iletişime geçin.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
        
        // 4. Ürünleri işle ve state'e ata
        const productsData = listingsData.listings.map((listing: any) => ({
          ...listing,
          // Eksik alanları varsayılan değerlerle doldur
          created_timestamp: listing.created_timestamp || Date.now() / 1000,
          last_modified_timestamp: listing.last_modified_timestamp || Date.now() / 1000,
          metrics: listing.metrics || { views: 0, favorites: 0, sold: 0 }
        }));
        
        // Sayfalama bilgilerini güncelle
        setCurrentPage(listingsData.page || page);
        setTotalPages(listingsData.total_pages || 1);
        setTotalCount(listingsData.count || 0);
        
        // İlk sayfa ise products state'ini sıfırla, değilse mevcut ürünlere ekle
        if (page === 1) {
          setProducts(productsData);
          setFilteredProducts(productsData);
        } else {
          setProducts(prevProducts => [...prevProducts, ...productsData]);
          setFilteredProducts(prevProducts => [...prevProducts, ...productsData]);
        }
        
        if (page === 1 && productsData.length === 0) {
          toast({
            title: "Ürün bulunamadı",
            description: "Etsy mağazanızda aktif ürün bulunamadı veya API erişim izni yok.",
            variant: "default"
          });
        } else if (page === 1) {
          toast({
            title: "Ürünler yüklendi",
            description: `${productsData.length} ürün başarıyla yüklendi. Toplam: ${listingsData.count || productsData.length}`,
            variant: "default"
          });
        }
        
      } catch (listingsError) {
        console.error("Listings API fetch error:", listingsError);
        toast({
          title: "Ürünler yüklenemedi",
          description: "Etsy API ile iletişimde bir sorun oluştu. Bu genellikle yanlış shop_id kullanıldığında veya API izni olmadığında görülür.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error loading products:", error);
      toast({
        title: "Ürünler yüklenirken hata",
        description: error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu.",
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
      console.log("Updating product:", product.listing_id, product);
      
      const response = await fetch(`/api/etsy/listings/${product.listing_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: product.title,
          description: product.description,
          price: Math.round((product.price.amount / product.price.divisor) * 100),
          quantity: product.quantity,
          state: product.state
        })
      });

      let result;
      try {
        result = await response.json();
      } catch (err) {
        console.error("Error parsing response:", err);
        result = { error: "Invalid response format" };
      }
      
      console.log("Update response:", response.status, result);

      if (response.ok && result.success) {
        toast({
          title: "Başarılı",
          description: "Ürün başarıyla güncellendi",
          variant: "default",
        });
        
        // Local state'i başarılı sonuçla güncelle
        setProducts(prevProducts => {
          const newProducts = [...prevProducts];
          const index = newProducts.findIndex(p => p.listing_id === product.listing_id);
          if (index !== -1) {
            newProducts[index] = { ...newProducts[index], ...product };
          }
          return newProducts;
        });
        
        // Filtrelenmiş listeyi de güncelle
        setFilteredProducts(prevFiltered => {
          const newFiltered = [...prevFiltered];
          const index = newFiltered.findIndex(p => p.listing_id === product.listing_id);
          if (index !== -1) {
            newFiltered[index] = { ...newFiltered[index], ...product };
          }
          return newFiltered;
        });
        
        setShowEditModal(null);
      } else {
        console.error("Error updating product:", result);
        toast({
          title: "Güncelleme Başarısız",
          description: result.details || result.error || "Bilinmeyen bir hata oluştu.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Exception updating product:", error);
      toast({
        title: "Hata",
        description: `İşlem sırasında bir hata oluştu: ${error}`,
        variant: "destructive",
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
        <div className="w-full aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
          <ProductImage product={product} />
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
      // Etsy OAuth bağlantı URL'sini al
      const res = await fetch('/api/etsy/auth-url');
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
        toast({
          title: "Hata",
          description: "Bağlantı URL'si alınamadı: " + (data.error || "Bilinmeyen hata"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Auth URL error:", error);
      toast({
        title: "Hata",
        description: "Bağlantı başlatılırken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Uyarı balonunu ürünler yoksa ve reconnectRequired true ise de göster
  if ((reconnectRequired && showReconnectBanner) || (products.length === 0 && reconnectRequired && showReconnectBanner)) {
    return (
      <div>
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md">
          <div className="flex items-center bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-lg px-4 py-3 shadow-md">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <span className="flex-1">Etsy bağlantınızda sorun var, lütfen hesabınızı tekrar bağlayın.</span>
            <Button size="sm" className="bg-black text-white ml-2" onClick={handleReconnectEtsy} disabled={refreshing}>
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Bağlantıyı Yenile"}
            </Button>
            <button className="ml-2 text-yellow-800 hover:text-yellow-900" onClick={() => setShowReconnectBanner(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {/* Sayfanın geri kalanı gri arka planla kapalı */}
        <div className="min-h-screen bg-gray-50 flex items-center justify-center opacity-60 pointer-events-none select-none">
          <div className="text-center">
            <Store className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">Etsy Bağlantısı Gerekli</h2>
            <p className="text-gray-500 max-w-md">Ürünleri görüntülemek ve yönetmek için Etsy hesabınıza yeniden bağlanmanız gerekiyor.</p>
          </div>
        </div>
      </div>
    );
  }

  // Oturum süresi dolduysa uyarı göster
  if (sessionExpired) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-8 text-center max-w-md">
          <AlertTriangle className="w-10 h-10 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Oturumunuz sona erdi</h2>
          <p className="mb-4">Devam edebilmek için tekrar giriş yapmanız gerekiyor.</p>
          <Button className="bg-black text-white px-6 py-3 text-lg" onClick={() => window.location.href = '/auth/login'}>
            Giriş Yap
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 animate-pulse text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Ürünler yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="w-full px-8 py-8">
        <div className="flex flex-col items-start mb-6">
          <h1 className="text-2xl font-bold">Ürünler</h1>
          <div className="flex items-center gap-2 mt-2">
            <CurrentStoreNameBadge shopName={currentStore?.shop_name} />
          </div>
          <div className="text-gray-500 text-base mt-2 mb-2">Etsy Mağazanızdaki Tüm Ürünleri Buradan Yönetin.</div>
        </div>
      </div>
      
      {/* Yenileme durumu bildirimi */}
      {refreshStatus.message && (
        <div className={`mb-4 p-3 rounded border flex items-center ${
          refreshStatus.success === undefined
            ? 'bg-blue-50 border-blue-200 text-blue-700'  // Bilgi
            : refreshStatus.success
              ? 'bg-green-50 border-green-200 text-green-700'  // Başarılı
              : 'bg-red-50 border-red-200 text-red-700'  // Hata
        }`}>
          {refreshStatus.success === undefined ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : refreshStatus.success ? (
            <CheckCircle className="w-4 h-4 mr-2" />
          ) : (
            <AlertTriangle className="w-4 h-4 mr-2" />
          )}
          <span>{refreshStatus.message}</span>
        </div>
      )}
      
      {taxonomyError && (
        <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 mb-6 rounded">
          <p>{taxonomyError}</p>
        </div>
      )}

      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-2 w-full">
          {/* Arama kutusu */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
            <Input
              placeholder="Ürün adı, etiket veya açıklama ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-full border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-gray-50 text-sm shadow-none"
            />
          </div>
          {/* Sıralama dropdown + artan/azalan toggle */}
          <div className="flex items-center gap-2 min-w-[180px]">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="rounded-full border border-gray-200 bg-gray-50 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20">
                <SelectValue placeholder="Sırala" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-lg">
                <SelectItem value="created_timestamp">
                  <Clock className="inline w-4 h-4 mr-2 text-gray-400" /> Yeni Eklenen
                </SelectItem>
                <SelectItem value="title">
                  <ArrowDownUp className="inline w-4 h-4 mr-2 text-gray-400" /> Başlık
                </SelectItem>
                <SelectItem value="price">
                  <BarChart3 className="inline w-4 h-4 mr-2 text-gray-400" /> Fiyat
                </SelectItem>
                <SelectItem value="quantity">
                  <Package className="inline w-4 h-4 mr-2 text-gray-400" /> Stok
                </SelectItem>
                <SelectItem value="views">
                  <Eye className="inline w-4 h-4 mr-2 text-gray-400" /> Görüntüleme
                </SelectItem>
                <SelectItem value="sold">
                  <ShoppingCart className="inline w-4 h-4 mr-2 text-gray-400" /> Satış
                </SelectItem>
              </SelectContent>
            </Select>
            <button
              type="button"
              className={`ml-1 rounded-full border border-gray-200 bg-gray-50 p-2 hover:bg-primary/10 transition-colors ${sortOrder === 'asc' ? 'text-primary' : 'text-gray-500'}`}
              onClick={() => setSortOrder((prev) => prev === 'asc' ? 'desc' : 'asc')}
              title={sortOrder === 'asc' ? 'Artan Sırala' : 'Azalan Sırala'}
            >
              {sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            </button>
          </div>
          {/* Durum filtresi dropdown */}
          <div className="min-w-[140px]">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="rounded-full border border-gray-200 bg-gray-50 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-lg">
                <SelectItem value="all">
                  <List className="inline w-4 h-4 mr-2 text-gray-400" /> Tüm Durumlar
                </SelectItem>
                <SelectItem value="active">
                  <CheckCircle className="inline w-4 h-4 mr-2 text-green-500" /> Aktif
                </SelectItem>
                <SelectItem value="inactive">
                  <X className="inline w-4 h-4 mr-2 text-red-500" /> Pasif
                </SelectItem>
                <SelectItem value="draft">
                  <Clock className="inline w-4 h-4 mr-2 text-yellow-500" /> Taslak
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Yenile butonu */}
          <div className="flex items-center">
            <Button
              variant="ghost"
              className="rounded-full p-2 hover:bg-primary/10 transition-colors"
              onClick={() => loadProducts()}
              title="Yenile"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <RefreshCw className="h-5 w-5 text-gray-500" />
              )}
            </Button>
          </div>
          {/* Görünüm seçici */}
          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              className={`rounded-full p-2 border ${gridType === 'grid3' ? 'bg-primary/10 border-primary text-primary' : 'bg-gray-50 border-gray-200 text-gray-500'} hover:bg-primary/10 transition-colors`}
              onClick={() => setGridType('grid3')}
              title="3'lü Izgara"
            >
              {/* 3'lü grid için tek satırda 3 kare ikon */}
              <span className="inline-flex items-center h-5">
                <span className="bg-current rounded-sm w-1.5 h-1.5 mx-[1.5px]" />
                <span className="bg-current rounded-sm w-1.5 h-1.5 mx-[1.5px]" />
                <span className="bg-current rounded-sm w-1.5 h-1.5 mx-[1.5px]" />
              </span>
            </button>
            <button
              type="button"
              className={`rounded-full p-2 border ${gridType === 'grid5' ? 'bg-primary/10 border-primary text-primary' : 'bg-gray-50 border-gray-200 text-gray-500'} hover:bg-primary/10 transition-colors`}
              onClick={() => setGridType('grid5')}
              title="5'li Izgara"
            >
              {/* 5'li grid için tek satırda 5 kare ikon */}
              <span className="inline-flex items-center h-5">
                <span className="bg-current rounded-sm w-1.5 h-1.5 mx-[1px]" />
                <span className="bg-current rounded-sm w-1.5 h-1.5 mx-[1px]" />
                <span className="bg-current rounded-sm w-1.5 h-1.5 mx-[1px]" />
                <span className="bg-current rounded-sm w-1.5 h-1.5 mx-[1px]" />
                <span className="bg-current rounded-sm w-1.5 h-1.5 mx-[1px]" />
              </span>
            </button>
            <button
              type="button"
              className={`rounded-full p-2 border ${gridType === 'list' ? 'bg-primary/10 border-primary text-primary' : 'bg-gray-50 border-gray-200 text-gray-500'} hover:bg-primary/10 transition-colors`}
              onClick={() => setGridType('list')}
              title="Liste Görünümü"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Üst Filtreleme ve İşlem Butonları */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2 items-center w-full">
          <Checkbox 
            id="select-all"
            checked={selectAllChecked}
            onCheckedChange={toggleSelectAll}
            className="border-gray-300"
          />
          <Label htmlFor="select-all" className="cursor-pointer">
            {selectAllChecked ? 'Seçimi Kaldır' : 'Tümünü Seç'} ({selectedProducts.length}/{filteredProducts.length})
          </Label>
          {selectedProducts.length > 0 && (
            <>
              <div className="h-6 border-l border-gray-300 mx-2"></div>
              <div className="text-base font-semibold text-gray-700">
                {selectedProducts.length} ürün seçildi
              </div>
              {/* Kırmızı Seçilenleri Sil butonu kaldırıldı */}
              <div className="flex items-center gap-2 ml-2">
                <Select value={''} onValueChange={(val) => {/* toplu işlem state */}}>
                  <SelectTrigger className="rounded-lg border border-gray-200 bg-gray-50 text-sm min-w-[140px]">
                    <SelectValue placeholder="Toplu İşlem" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg shadow-lg">
                    <SelectItem value="activate">Aktif Yap</SelectItem>
                    <SelectItem value="deactivate">Pasif Yap</SelectItem>
                    <SelectItem value="draft">Taslağa Al</SelectItem>
                    <SelectItem value="copy">Kopyala</SelectItem>
                    <SelectItem value="delete">Sil</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" className="rounded-lg bg-primary text-white px-5 py-2 font-semibold shadow hover:bg-primary/90 transition-colors">
                  Uygula
                </Button>
              </div>
            </>
          )}
          <div className="flex gap-2 items-center ml-auto">
            <Button
              size="sm"
              onClick={handleOpenCreateModal}
              className="bg-black hover:bg-gray-800 text-white rounded-lg px-5 py-2 font-semibold shadow"
            >
              <Plus className="w-4 h-4 mr-2" />
              Yeni Ürün
            </Button>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-lg bg-gray-50">
          <Package className="mx-auto h-14 w-14 text-blue-400 mb-4" />
          <h3 className="mt-2 text-lg font-semibold text-gray-800">Henüz ürününüz yok</h3>
          <p className="mt-1 text-base text-gray-500 max-w-xl mx-auto">Etsy mağazanızda hiç ürün bulunamadı. Hemen ilk ürününüzü ekleyin!</p>
          <div className="mt-6">
            <Button size="lg" className="bg-black hover:bg-gray-800 text-white px-8 py-3 text-lg" onClick={handleOpenCreateModal}>
              <Plus className="h-5 w-5 mr-2" /> Ürün Ekle
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div
            className={
              gridType === 'list'
                ? 'flex flex-col gap-6'
                : gridType === 'grid5'
                  ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6'
                  : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            }
          >
            {filteredProducts.map((product) => (
              <ProductCard key={product.listing_id} product={product} listView={gridType === 'list'} />
            ))}
          </div>
          
          {/* Sayfalama Kontrolleri */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-8 border-t pt-6">
              <div className="text-sm text-gray-500">
                {searchTerm || filterStatus !== "all" ? (
                  <>Filtrelenmiş sonuçlar: {filteredProducts.length} ürün</>
                ) : (
                  <>Toplam {totalCount} ürün • Sayfa {currentPage} / {totalPages}</>
                )}
              </div>
              <div className="flex gap-2">
                {!(searchTerm || filterStatus !== "all") && (
                  <>
                    <Button 
                      variant="outline" 
                      disabled={currentPage <= 1}
                      onClick={() => loadProducts(currentPage - 1)}
                    >
                      Önceki Sayfa
                    </Button>
                    {currentPage < totalPages && (
                      <Button 
                        variant="outline"
                        onClick={() => loadProducts(currentPage + 1)}
                      >
                        Sonraki Sayfa
                      </Button>
                    )}
                    {currentPage < totalPages && (
                      <Button 
                        variant="default"
                        className="bg-black text-white hover:bg-gray-800"
                        onClick={() => {
                          const confirmed = confirm(`Bu işlem tüm sayfaları yükleyecek. Toplam ${totalCount} ürün için ${totalPages - currentPage} sayfa daha yüklenecek. Devam etmek istiyor musunuz?`);
                          if (confirmed) {
                            toast({
                              title: "Tüm ürünler yükleniyor",
                              description: "Bu işlem biraz zaman alabilir...",
                            });
                            // Tüm sayfaları yükle
                            const loadAllPages = async () => {
                              for (let p = currentPage + 1; p <= totalPages; p++) {
                                await loadProducts(p);
                              }
                              toast({
                                title: "Tüm ürünler yüklendi",
                                description: `${totalCount} ürün başarıyla yüklendi.`,
                              });
                            };
                            loadAllPages();
                          }
                        }}
                      >
                        Tüm Ürünleri Yükle
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <Dialog open={!!showEditModal} onOpenChange={() => setShowEditModal(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ürün Düzenle</DialogTitle>
              <DialogDescription>
                {showEditModal.title} ürününü düzenleyin
              </DialogDescription>
            </DialogHeader>
            
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
                  rows={4}
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
                    value={showEditModal.quantity}
                    onChange={(e) => setShowEditModal(prev => prev ? { ...prev, quantity: parseInt(e.target.value) || 0 } : null)}
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
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditModal(null)}>
                İptal
              </Button>
              <Button onClick={() => showEditModal && handleUpdateProduct(showEditModal)} disabled={submitting}>
                {submitting ? "Güncelleniyor..." : "Güncelle"}
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
  )
} 