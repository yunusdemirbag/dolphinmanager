"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Plus,
  Copy,
  Trash2,
  Edit,
  Sparkles,
  TrendingDown,
  Eye,
  ShoppingCart,
  AlertTriangle,
  Upload,
  Zap,
  DollarSign,
  Package,
} from "lucide-react"
import { createClient } from "@/lib/supabase"

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
  seo_score: number
  created_at: string
  last_updated: string
  needs_optimization: boolean
  traffic_score: number
  conversion_rate: number
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("created_at")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [filterStatus, setFilterStatus] = useState("all")
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showAIPanel, setShowAIPanel] = useState<string | null>(null)

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    filterAndSortProducts()
  }, [products, searchTerm, sortBy, sortOrder, filterStatus])

  const loadProducts = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { data: productsData } = await supabase.from("products").select("*").eq("user_id", user.id)

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
          seo_score: 85,
          created_at: "2024-01-15",
          last_updated: "2024-01-20",
          needs_optimization: false,
          traffic_score: 78,
          conversion_rate: 3.6,
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
          seo_score: 42,
          created_at: "2024-01-10",
          last_updated: "2024-01-10",
          needs_optimization: true,
          traffic_score: 25,
          conversion_rate: 1.8,
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
          seo_score: 92,
          created_at: "2024-01-05",
          last_updated: "2024-01-22",
          needs_optimization: false,
          traffic_score: 95,
          conversion_rate: 4.2,
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
          seo_score: 28,
          created_at: "2024-01-25",
          last_updated: "2024-01-25",
          needs_optimization: true,
          traffic_score: 5,
          conversion_rate: 0,
        },
      ]

      setProducts(mockProducts)
    }
  }

  const filterAndSortProducts = () => {
    const filtered = products.filter((product) => {
      const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = filterStatus === "all" || product.status === filterStatus
      return matchesSearch && matchesStatus
    })

    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Product]
      let bValue: any = b[sortBy as keyof Product]

      if (sortBy === "created_at" || sortBy === "last_updated") {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredProducts(filtered)
  }

  const generateAISuggestions = async (productId: string) => {
    setIsLoading(true)
    setShowAIPanel(productId)

    const product = products.find((p) => p.id === productId)
    if (!product) return

    try {
      const response = await fetch("/api/ai/product-optimization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product: product,
          businessType: "canvas_wall_art",
        }),
      })

      if (response.ok) {
        const suggestions = await response.json()
        // Önerileri göster
        console.log("AI Önerileri:", suggestions)
      }
    } catch (error) {
      console.error("AI önerileri alınırken hata:", error)
    }

    setIsLoading(false)
  }

  const applyAISuggestions = async (productId: string, suggestions: any) => {
    // AI önerilerini ürüne uygula
    const updatedProducts = products.map((product) => {
      if (product.id === productId) {
        return {
          ...product,
          title: suggestions.title || product.title,
          description: suggestions.description || product.description,
          tags: suggestions.tags || product.tags,
          seo_score: suggestions.seo_score || product.seo_score,
          last_updated: new Date().toISOString(),
        }
      }
      return product
    })

    setProducts(updatedProducts)
    setShowAIPanel(null)
  }

  const duplicateProduct = (productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (product) {
      const newProduct = {
        ...product,
        id: Date.now().toString(),
        title: `${product.title} (Kopya)`,
        status: "draft" as const,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        views: 0,
        sales: 0,
      }
      setProducts([newProduct, ...products])
    }
  }

  const deleteProduct = (productId: string) => {
    setProducts(products.filter((p) => p.id !== productId))
  }

  const getSEOScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50"
    if (score >= 60) return "text-yellow-600 bg-yellow-50"
    return "text-red-600 bg-red-50"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "inactive":
        return "bg-gray-100 text-gray-800"
      case "draft":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const needsOptimizationCount = products.filter((p) => p.needs_optimization).length
  const lowTrafficCount = products.filter((p) => p.traffic_score < 30).length
  const noSalesCount = products.filter((p) => p.sales === 0).length

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-8 w-8 text-orange-500" />
            Ürün Yönetimi
          </h1>
          <p className="text-gray-600 mt-2">Canvas wall art ürünlerinizi yönetin ve optimize edin</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Toplu Yükle
          </Button>
          <Button className="bg-orange-500 hover:bg-orange-600">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Ürün
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Toplam Ürün</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
              <Package className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Optimizasyon Gerekli</p>
                <p className="text-2xl font-bold text-red-600">{needsOptimizationCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Düşük Trafik</p>
                <p className="text-2xl font-bold text-yellow-600">{lowTrafficCount}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Satış Yok</p>
                <p className="text-2xl font-bold text-blue-600">{noSalesCount}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
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
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Durum filtrele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Pasif</SelectItem>
                <SelectItem value="draft">Taslak</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sırala" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="title">İsme Göre</SelectItem>
                <SelectItem value="created_at">Ekleme Tarihi</SelectItem>
                <SelectItem value="sales">Satış Adedi</SelectItem>
                <SelectItem value="seo_score">SEO Puanı</SelectItem>
                <SelectItem value="traffic_score">Trafik Puanı</SelectItem>
                <SelectItem value="views">Görüntülenme</SelectItem>
                <SelectItem value="price">Fiyat</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="w-24"
            >
              {sortOrder === "asc" ? "A→Z" : "Z→A"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <Badge className={getStatusColor(product.status)}>{product.status}</Badge>
                <div className="flex items-center space-x-1">
                  <Badge className={`${getSEOScoreColor(product.seo_score)} border-0`}>SEO: {product.seo_score}</Badge>
                  {product.needs_optimization && <AlertTriangle className="h-4 w-4 text-red-500" />}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Product Image */}
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={product.images[0] || "/placeholder.svg"}
                  alt={product.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform"
                />
              </div>

              {/* Product Info */}
              <div>
                <h3 className="font-semibold text-lg line-clamp-2 mb-2">{product.title}</h3>
                <p className="text-gray-600 text-sm line-clamp-2 mb-3">{product.description}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {product.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {product.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{product.tags.length - 3}
                    </Badge>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center">
                    <Eye className="h-3 w-3 mr-1" />
                    {product.views}
                  </div>
                  <div className="flex items-center">
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    {product.sales}
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="h-3 w-3 mr-1" />${product.price}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col space-y-2">
                  <Button
                    onClick={() => generateAISuggestions(product.id)}
                    disabled={isLoading && showAIPanel === product.id}
                    className="w-full bg-orange-500 hover:bg-orange-600"
                  >
                    {isLoading && showAIPanel === product.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        AI Analiz Ediyor...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        AI Önerisi Al
                      </>
                    )}
                  </Button>

                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="h-3 w-3 mr-1" />
                      Düzenle
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => duplicateProduct(product.id)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteProduct(product.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Suggestions Panel */}
      {showAIPanel && (
        <Card className="fixed bottom-4 right-4 w-96 max-h-96 overflow-y-auto shadow-xl z-50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Sparkles className="h-5 w-5 mr-2 text-orange-500" />
                AI Önerileri
              </span>
              <Button variant="ghost" size="sm" onClick={() => setShowAIPanel(null)}>
                ×
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 bg-orange-50 rounded-lg">
                <h4 className="font-semibold text-orange-800 mb-2">Başlık Önerisi</h4>
                <p className="text-sm text-orange-700">
                  "Minimalist Mountain Canvas Wall Art Print - Modern Home Decor 16x20"
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Tag Önerileri</h4>
                <p className="text-sm text-blue-700">wall art, canvas print, mountain art, minimalist decor, 16x20</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">SEO Puanı</h4>
                <p className="text-sm text-green-700">Öneriler uygulandığında: 95/100</p>
              </div>
              <Button className="w-full bg-orange-500 hover:bg-orange-600">
                <Zap className="h-4 w-4 mr-2" />
                Önerileri Uygula
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
