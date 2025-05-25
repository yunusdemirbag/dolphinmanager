"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
  Info
} from "lucide-react"
import { createClientSupabase } from "@/lib/supabase"

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
    alt_text: string
    cache_key?: string
  }>
  tags: string[]
  state: "active" | "inactive" | "draft"
  views?: number
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
  const [isDemoData, setIsDemoData] = useState(false);
  const [demoMessage, setDemoMessage] = useState("");

  // getProductImage fonksiyonunu sadeleştiriyorum:
  const getProductImage = (product: Product): string | null => {
    if (product.images && product.images.length > 0 && product.images[0].url_570xN) {
      return product.images[0].url_570xN;
    }
    return null;
  }

  // ProductImage bileşenini daha güvenli hale getiriyorum:
  const ProductImage = ({ product }: { product: Product }) => {
    const imageSrc = Array.isArray(product.images) && product.images.length > 0 && product.images[0]?.url_570xN ? product.images[0].url_570xN : null;
    if (!imageSrc) return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
        <ImageIcon className="w-10 h-10" />
      </div>
    );
    return (
      <img 
        src={imageSrc}
        alt={product.title}
        className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
        loading="lazy"
      />
    );
  };

  useEffect(() => {
    loadProducts()
    loadTaxonomy()
    loadShippingProfiles()
  }, [])

  useEffect(() => {
    filterAndSortProducts()
  }, [products, searchTerm, sortBy, filterStatus])

  useEffect(() => {
    async function loadAnalytics() {
      // Burada Supabase'den analytics verilerini çekebilirsin
      // Örnek: /api/analytics/products endpointi ile
      // Şimdilik sahte veri ile dolduruyorum
      const fake: Record<number, { view: number; sale: number; revenue: number }> = {};
      products.forEach((p) => {
        fake[p.listing_id] = { view: Math.floor(Math.random() * 1000), sale: Math.floor(Math.random() * 50), revenue: Math.floor(Math.random() * 10000) };
      });
      setAnalytics(fake);
    }
    if (products.length > 0) loadAnalytics();
  }, [products]);

  const loadProducts = async () => {
    setLoading(true)
    setIsDemoData(false)
    setDemoMessage("")

    try {
      // Gerçek Etsy ürünlerini çekmeye çalış
      const response = await fetch('/api/etsy/products')
      
      if (response.ok) {
        const data = await response.json()
        console.log("Products API response:", data)
        
        if (data.products && data.products.length > 0) {
          // Demo veri mi kontrol et
          if (data.source === "demo") {
            setIsDemoData(true)
            setDemoMessage(data.message || "Etsy API'ye erişilemedi, demo ürünler gösteriliyor")
          }
          
          // Normalize product data to ensure consistent format
          const normalizedProducts = data.products.map((product: any) => {
            // Handle price field which could be a string or an object
            let price = product.price;
            if (typeof price === 'string') {
              price = {
                amount: parseFloat(price) * 100,
                divisor: 100,
                currency_code: product.currency_code || 'USD'
              };
            } else if (!price || typeof price !== 'object') {
              price = {
                amount: 0,
                divisor: 1,
                currency_code: product.currency_code || 'USD'
              };
            }
            
            // Handle missing timestamps
            const now = Date.now() / 1000;
            
            // Handle missing or malformed images with more robust approach
            let images = product.images || [];
            if (!Array.isArray(images)) {
              images = [];
            }
            
            // Orijinal Etsy resim URL'sini koruyalım, proxy'de kullanacağız
            if (images.length > 0) {
              images = images.map((img: any) => {
                if (img && img.url_570xN) {
                  return {
                    ...img,
                    url_570xN: img.url_570xN // Orijinal URL'yi koru
                  };
                }
                return img;
              });
            }
            
            return {
              ...product,
              price,
              tags: product.tags || [],
              state: product.state || 'active',
              views: product.views || 0,
              created_timestamp: product.creation_timestamp || product.created_timestamp || now,
              last_modified_timestamp: product.last_modified_timestamp || now,
              images: images,
              url: product.url || `https://www.etsy.com/listing/${product.listing_id}`,
              metrics: product.metrics || { views: 0, favorites: 0, sold: 0 }
            };
          });
          
          setProducts(normalizedProducts);
          
          // Log success message with source information
          if (data.source === "etsy_api") {
            console.log(`✅ Loaded ${normalizedProducts.length} products from Etsy API (${data.total || "unknown"} total)`);
          } else if (data.source === "database") {
            console.log(`✅ Loaded ${normalizedProducts.length} products from database`);
          } else {
            console.log(`✅ Loaded ${normalizedProducts.length} demo products`);
          }
        } else {
          console.log("No products found");
          setProducts([]);
        }
      } else {
        console.error("Products API error:", response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error("Error details:", errorData);
        setProducts([]);
      }
    } catch (apiError) {
      console.error("API error:", apiError);
      setProducts([]);
    }
    
    setLoading(false);
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
        product.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(product => product.state === filterStatus)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title)
        case "price":
          return (b.price.amount / b.price.divisor) - (a.price.amount / a.price.divisor)
        case "quantity":
          return b.quantity - a.quantity
        case "created_timestamp":
        default:
          return b.created_timestamp - a.created_timestamp
      }
    })

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
    setSubmitting(true)
    try {
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
      })

      if (response.ok) {
        alert("✅ Ürün başarıyla güncellendi!")
        setShowEditModal(null)
        loadProducts()
      } else {
        const errorData = await response.json()
        alert(`❌ Hata: ${errorData.details || errorData.error}`)
      }
    } catch (error) {
      console.error("Update product error:", error)
      alert("❌ Ürün güncellenirken hata oluştu!")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteProduct = async (listingId: number) => {
    if (!confirm("Bu ürünü silmek istediğinizden emin misiniz?")) {
      return
    }

    try {
      const response = await fetch(`/api/etsy/listings/${listingId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert("✅ Ürün başarıyla silindi!")
        loadProducts()
      } else {
        const errorData = await response.json()
        alert(`❌ Hata: ${errorData.details || errorData.error}`)
      }
    } catch (error) {
      console.error("Delete product error:", error)
      alert("❌ Ürün silinirken hata oluştu!")
    }
  }

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

  const ProductCard = ({ product }: { product: Product }) => {
    return (
      <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col hover:shadow-lg transition-shadow duration-300">
        <div className="relative aspect-square bg-gray-50">
          <ProductImage product={product} />
        </div>
        <div className="p-4 flex flex-col flex-1">
          <h3 className="text-base font-semibold text-gray-800 mb-1 line-clamp-2 min-h-[48px]">
            {product.title}
          </h3>
          <div className="flex items-center justify-between mb-1">
            <span className="text-lg font-bold text-primary">
              {formatPrice(product.price)}
            </span>
            <span className="text-xs text-gray-500">
              Stok: {product.quantity}
            </span>
          </div>
          {/* Metrics */}
          <div className="grid grid-cols-3 gap-2 mt-2 mb-2">
            <div className="text-center">
              <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><Eye className="w-3 h-3" />Views</div>
              <div className="font-semibold text-sm">{product.metrics?.views || 0}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><Star className="w-3 h-3" />Favorites</div>
              <div className="font-semibold text-sm">{product.metrics?.favorites || 0}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><ShoppingCart className="w-3 h-3" />Sold</div>
              <div className="font-semibold text-sm">{product.metrics?.sold || 0}</div>
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-auto">
            <ProductStatus status={product.state} />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => window.open(product.url, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" /> Etsy'de Gör
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => handleCopyProduct(product)}
            >
              <Copy className="h-4 w-4 mr-2" /> Kopyala
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowEditModal(product)}
            >
              <Edit className="h-4 w-4 mr-2" /> Düzenle
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const ProductStatus = ({ status }: { status: string }) => {
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Ürünler</h1>
        <Button onClick={handleOpenCreateModal} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          Ürün Ekle
        </Button>
      </div>
      
      {isDemoData && (
        <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 mb-6 rounded">
          <div className="flex items-center">
            <Info className="w-5 h-5 mr-2" />
            <p>{demoMessage}</p>
          </div>
          <p className="text-sm mt-1">Not: Bu demo ürünler sadece arayüzü göstermek için oluşturulmuştur ve Etsy'de gerçek değildir.</p>
        </div>
      )}
      
      {taxonomyError && (
        <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 mb-6 rounded">
          <p>{taxonomyError}</p>
        </div>
      )}

      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Ürün ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Sırala" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_timestamp">Yeni Eklenen</SelectItem>
              <SelectItem value="title">Başlık</SelectItem>
              <SelectItem value="price">Fiyat</SelectItem>
              <SelectItem value="quantity">Stok</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Durumlar</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="inactive">Pasif</SelectItem>
              <SelectItem value="draft">Taslak</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadProducts}>
            <Filter className="h-4 w-4 mr-2" />
            Yenile
          </Button>
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-lg bg-gray-50">
          <Package className="mx-auto h-14 w-14 text-blue-400 mb-4" />
          <h3 className="mt-2 text-lg font-semibold text-gray-800">Henüz ürününüz yok</h3>
          <p className="mt-1 text-base text-gray-500 max-w-xl mx-auto">Etsy mağazanızda hiç ürün bulunamadı. Hemen ilk ürününüzü ekleyin!</p>
          <div className="mt-6">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg" onClick={handleOpenCreateModal}>
              <Plus className="h-5 w-5 mr-2" /> Ürün Ekle
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.listing_id} product={product} />
          ))}
        </div>
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
    </div>
  )
} 