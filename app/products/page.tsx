"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  BarChart3
} from "lucide-react"
import { createClientSupabase } from "@/lib/supabase"

interface Product {
  id: string
  title: string
  description: string
  price: number
  images: string[]
  tags: string[]
  status: "active" | "inactive" | "draft"
  views: number
  sales: number
  seoScore: number
  created_at: string
  last_updated: string
  needs_optimization: boolean
  traffic_score: number
  conversion_rate: number
  store_name: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("created_at")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterStore, setFilterStore] = useState("all")
  const [showAIModal, setShowAIModal] = useState<string | null>(null)

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    filterAndSortProducts()
  }, [products, searchTerm, sortBy, filterStatus, filterStore])

  const loadProducts = async () => {
    const supabase = createClientSupabase()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      try {
        // Gerçek Etsy ürünlerini çekmeye çalış
        const response = await fetch('/api/etsy/products', {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.products && data.products.length > 0) {
            setProducts(data.products)
          } else {
            // Mock data for canvas wall art products
            const mockProducts: Product[] = [
              {
                id: "1",
                title: "Minimalist Mountain Canvas Wall Art - 16x20 inch",
                description: "Beautiful minimalist mountain landscape perfect for modern home decor. High quality canvas print with premium materials.",
                price: 25.99,
                images: ["/api/placeholder/400/300"],
                tags: ["wall art", "canvas print", "mountain", "minimalist", "home decor", "16x20"],
                status: "active",
                views: 1250,
                sales: 45,
                seoScore: 85,
                created_at: "2024-12-15",
                last_updated: "2024-12-20",
                needs_optimization: false,
                traffic_score: 78,
                conversion_rate: 3.6,
                store_name: "Canvas Dreams Studio"
              },
              {
                id: "2", 
                title: "Abstract Geometric Art Print",
                description: "Modern abstract geometric design for contemporary spaces.",
                price: 19.99,
                images: ["/api/placeholder/400/300"],
                tags: ["abstract", "geometric", "modern"],
                status: "active",
                views: 890,
                sales: 23,
                seoScore: 62,
                created_at: "2024-12-10",
                last_updated: "2024-12-18",
                needs_optimization: true,
                traffic_score: 45,
                conversion_rate: 2.6,
                store_name: "Modern Wall Art Co"
              },
              {
                id: "3",
                title: "Vintage Botanical Canvas - Nature Wall Decor",
                description: "Vintage style botanical illustration perfect for nature lovers.",
                price: 32.99,
                images: ["/api/placeholder/400/300"],
                tags: ["vintage", "botanical", "nature", "wall decor"],
                status: "active",
                views: 2100,
                sales: 67,
                seoScore: 91,
                created_at: "2024-12-05",
                last_updated: "2024-12-22",
                needs_optimization: false,
                traffic_score: 92,
                conversion_rate: 3.2,
                store_name: "Nature Canvas Art"
              },
              {
                id: "4",
                title: "Motivational Quote Canvas",
                description: "Inspirational quote design for office or bedroom.",
                price: 22.99,
                images: ["/api/placeholder/400/300"],
                tags: ["motivational", "quote", "inspiration"],
                status: "draft",
                views: 0,
                sales: 0,
                seoScore: 35,
                created_at: "2024-12-23",
                last_updated: "2024-12-23",
                needs_optimization: true,
                traffic_score: 0,
                conversion_rate: 0,
                store_name: "Minimalist Canvas"
              },
              {
                id: "5",
                title: "Ocean Waves Canvas Print - Coastal Decor",
                description: "Serene ocean waves perfect for coastal themed rooms.",
                price: 28.99,
                images: ["/api/placeholder/400/300"],
                tags: ["ocean", "waves", "coastal", "blue", "canvas print"],
                status: "inactive",
                views: 450,
                sales: 12,
                seoScore: 58,
                created_at: "2024-11-28",
                last_updated: "2024-12-01",
                needs_optimization: true,
                traffic_score: 32,
                conversion_rate: 2.7,
                store_name: "Vintage Prints Hub"
              }
            ]
            setProducts(mockProducts)
          }
        }
      } catch (apiError) {
        console.log("Using mock data due to API error:", apiError)
        loadMockProducts()
      }
    }
  }

  const loadMockProducts = () => {
    // Mock data ile gerçek veriler karıştır
    const mockProducts: Product[] = [
      {
        id: "1",
        title: "Minimalist Mountain Canvas Wall Art",
        description: "Beautiful minimalist mountain landscape perfect for modern home decor",
        price: 29.99,
        images: ["/placeholder.svg?height=300&width=300"],
        tags: ["minimalist", "mountain", "landscape", "wall art", "canvas"],
        status: "active",
        views: 1250,
        sales: 45,
        seoScore: 85,
        created_at: "2024-01-15",
        last_updated: "2024-01-20",
        needs_optimization: false,
        traffic_score: 78,
        conversion_rate: 3.6,
        store_name: "Canvas Dreams Studio"
      },
      {
        id: "2",
        title: "Abstract Geometric Art Print",
        description: "Modern abstract geometric design",
        price: 24.99,
        images: ["/placeholder.svg?height=300&width=300"],
        tags: ["abstract", "geometric", "modern"],
        status: "active",
        views: 450,
        sales: 8,
        seoScore: 42,
        created_at: "2024-01-10",
        last_updated: "2024-01-10",
        needs_optimization: true,
        traffic_score: 25,
        conversion_rate: 1.8,
        store_name: "Modern Wall Art Co"
      },
      {
        id: "3",
        title: "Boho Sunset Canvas Print 16x20",
        description:
          "Stunning boho-style sunset canvas print perfect for bedroom or living room. High-quality canvas material with vibrant colors that won't fade.",
        price: 34.99,
        images: ["/placeholder.svg?height=300&width=300"],
        tags: ["boho", "sunset", "canvas print", "16x20", "bedroom decor", "living room", "wall art"],
        status: "active",
        views: 2100,
        sales: 89,
        seoScore: 92,
        created_at: "2024-01-05",
        last_updated: "2024-01-22",
        needs_optimization: false,
        traffic_score: 95,
        conversion_rate: 4.2,
        store_name: "Nature Canvas Art"
      },
      {
        id: "4",
        title: "Vintage Car Poster",
        description: "Classic vintage car poster",
        price: 19.99,
        images: ["/placeholder.svg?height=300&width=300"],
        tags: ["vintage", "car"],
        status: "draft",
        views: 12,
        sales: 0,
        seoScore: 28,
        created_at: "2024-01-25",
        last_updated: "2024-01-25",
        needs_optimization: true,
        traffic_score: 5,
        conversion_rate: 0,
        store_name: "Minimalist Canvas"
      },
    ]

    setProducts(mockProducts)
  }

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
      filtered = filtered.filter(product => product.status === filterStatus)
    }

    // Store filter
    if (filterStore !== "all") {
      filtered = filtered.filter(product => product.store_name === filterStore)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title)
        case "price":
          return b.price - a.price
        case "sales":
          return b.sales - a.sales
        case "seo_score":
          return b.seoScore - a.seoScore
        case "traffic_score":
          return b.traffic_score - a.traffic_score
        case "views":
          return b.views - a.views
        case "created_at":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

    setFilteredProducts(filtered)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800"
      case "inactive": return "bg-red-100 text-red-800"
      case "draft": return "bg-yellow-100 text-yellow-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getSEOScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const handleAIOptimization = async (productId: string) => {
    setShowAIModal(productId)
    // AI optimization logic here
  }

  const getUniqueStores = () => {
    return [...new Set(products.map(p => p.store_name))]
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
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Package className="h-8 w-8 text-blue-600 mr-3" />
              Ürünler
            </h1>
            <p className="text-gray-600 mt-2">Canvas wall art ürünlerinizi yönetin ve optimize edin</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Toplu Yükle
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Yeni Ürün
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Ürün ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sırala" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Eklenme Tarihi</SelectItem>
                  <SelectItem value="title">İsim (A-Z)</SelectItem>
                  <SelectItem value="price">Fiyat (Yüksek-Düşük)</SelectItem>
                  <SelectItem value="sales">Satış Adedi</SelectItem>
                  <SelectItem value="seo_score">SEO Puanı</SelectItem>
                  <SelectItem value="traffic_score">Trafik Puanı</SelectItem>
                  <SelectItem value="views">Görüntülenme</SelectItem>
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
              <Select value={filterStore} onValueChange={setFilterStore}>
                <SelectTrigger>
                  <SelectValue placeholder="Mağaza" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Mağazalar</SelectItem>
                  {getUniqueStores().map(store => (
                    <SelectItem key={store} value={store}>{store}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Toplam Ürün</p>
                  <p className="text-2xl font-bold text-gray-900">{products.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Aktif Ürün</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {products.filter(p => p.status === 'active').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Optimizasyon Gerekli</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {products.filter(p => p.needs_optimization).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Ortalama SEO</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round(products.reduce((sum, p) => sum + p.seoScore, 0) / products.length)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">{product.title}</CardTitle>
                    <CardDescription className="mt-1">
                      <Badge variant="outline" className="mr-2">{product.store_name}</Badge>
                      <Badge className={getStatusColor(product.status)}>
                        {product.status === 'active' ? 'Aktif' : product.status === 'inactive' ? 'Pasif' : 'Taslak'}
                      </Badge>
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">${product.price}</div>
                    <div className={`text-sm font-semibold ${getSEOScoreColor(product.seoScore)}`}>
                      SEO: {product.seoScore}/100
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Product Image */}
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                    <Package className="h-12 w-12 text-gray-400" />
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Eye className="h-4 w-4 text-gray-400 mr-1" />
                      </div>
                      <div className="font-semibold">{product.views}</div>
                      <div className="text-gray-500">Görüntülenme</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <ShoppingCart className="h-4 w-4 text-gray-400 mr-1" />
                      </div>
                      <div className="font-semibold">{product.sales}</div>
                      <div className="text-gray-500">Satış</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <TrendingUp className="h-4 w-4 text-gray-400 mr-1" />
                      </div>
                      <div className="font-semibold">{product.conversion_rate.toFixed(1)}%</div>
                      <div className="text-gray-500">Dönüşüm</div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {product.tags.slice(0, 3).map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {product.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{product.tags.length - 3}
                      </Badge>
                    )}
                  </div>

                  {/* Optimization Alert */}
                  {product.needs_optimization && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                        <span className="text-sm text-yellow-800">Optimizasyon gerekli</span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleAIOptimization(product.id)}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredProducts.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ürün bulunamadı</h3>
              <p className="text-gray-600 mb-4">Arama kriterlerinize uygun ürün bulunamadı.</p>
              <Button onClick={() => {
                setSearchTerm("")
                setFilterStatus("all")
                setFilterStore("all")
              }}>
                Filtreleri Temizle
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
