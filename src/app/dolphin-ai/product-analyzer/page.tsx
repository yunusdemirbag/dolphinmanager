"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart3,
  RefreshCw,
  AlertCircle,
  Eye,
  ShoppingCart,
  Hash,
  Lightbulb,
  ExternalLink,
  ArrowUpRight,
  TrendingUp,
  ArrowDown,
  Search,
  Filter,
} from "lucide-react"

// Ürün analizi veri yapısı
interface ProductAnalysis {
  id: string
  title: string
  url: string
  price: number
  views: number
  sales: number
  conversionRate: string
  performance: string
  keywords: string[]
  recommendations: {
    type: string
    title: string
    description: string
  }[]
}

export default function ProductAnalyzerPage() {
  const [timeframe, setTimeframe] = useState("last_30_days")
  const [products, setProducts] = useState<ProductAnalysis[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [sortBy, setSortBy] = useState("performance")
  const [filterPerformance, setFilterPerformance] = useState("all")

  // Ürün analizi yükleme
  const fetchProductAnalysis = async () => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/ai/product-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopId: 1, // Varsayılan mağaza ID'si
          timeframe: timeframe
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
        setLastUpdate(new Date())
      } else {
        console.error("Failed to fetch product analysis:", await response.text())
      }
    } catch (error) {
      console.error("Error fetching product analysis:", error)
    } finally {
      setLoading(false)
    }
  }

  // Sayfa yüklendiğinde veri yükle
  useEffect(() => {
    fetchProductAnalysis()
  }, [timeframe])

  // Performans seviyesi rengi
  const getPerformanceColor = (performance: string) => {
    if (performance === "excellent") return "bg-green-100 text-green-800"
    if (performance === "good") return "bg-blue-100 text-blue-800"
    if (performance === "average") return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  // Performans türkçe karşılığı
  const getPerformanceText = (performance: string) => {
    if (performance === "excellent") return "Mükemmel"
    if (performance === "good") return "İyi" 
    if (performance === "average") return "Ortalama"
    return "Zayıf"
  }

  // Öneri tipi ikonu
  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case "conversion":
        return <TrendingUp className="h-4 w-4 text-blue-600" />
      case "price":
        return <ArrowUpRight className="h-4 w-4 text-green-600" />
      case "seo":
        return <Search className="h-4 w-4 text-purple-600" />
      case "bundle":
        return <ShoppingCart className="h-4 w-4 text-orange-600" />
      case "variant":
        return <Filter className="h-4 w-4 text-indigo-600" />
      case "expand":
        return <ArrowUpRight className="h-4 w-4 text-cyan-600" />
      case "promote":
        return <TrendingUp className="h-4 w-4 text-pink-600" />
      default:
        return <Lightbulb className="h-4 w-4 text-amber-600" />
    }
  }

  // Ürünleri sırala
  const sortProducts = (products: ProductAnalysis[]) => {
    return [...products].sort((a, b) => {
      if (sortBy === "performance") {
        const perfOrder = { excellent: 4, good: 3, average: 2, poor: 1 }
        return perfOrder[b.performance as keyof typeof perfOrder] - perfOrder[a.performance as keyof typeof perfOrder]
      } else if (sortBy === "views") {
        return b.views - a.views
      } else if (sortBy === "sales") {
        return b.sales - a.sales
      } else if (sortBy === "conversion") {
        return parseFloat(b.conversionRate) - parseFloat(a.conversionRate)
      } else if (sortBy === "price") {
        return b.price - a.price
      }
      return 0
    })
  }

  // Ürünleri filtrele
  const filterProducts = (products: ProductAnalysis[]) => {
    if (filterPerformance === "all") return products
    
    return products.filter(product => product.performance === filterPerformance)
  }

  // İşlenecek ürünler
  const processedProducts = filterProducts(sortProducts(products))

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Ürün Performans Analizi</h1>
              <p className="text-gray-600">AI destekli ürün analizi ile satışlarınızı optimize edin</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <p className="mb-2 text-sm font-medium">Zaman Aralığı</p>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_7_days">Son 7 Gün</SelectItem>
                  <SelectItem value="last_30_days">Son 30 Gün</SelectItem>
                  <SelectItem value="last_90_days">Son 90 Gün</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Sıralama</p>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="performance">Performans</SelectItem>
                  <SelectItem value="views">Görüntülenme</SelectItem>
                  <SelectItem value="sales">Satış</SelectItem>
                  <SelectItem value="conversion">Dönüşüm Oranı</SelectItem>
                  <SelectItem value="price">Fiyat</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Performans Filtresi</p>
              <Select value={filterPerformance} onValueChange={setFilterPerformance}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="excellent">Mükemmel</SelectItem>
                  <SelectItem value="good">İyi</SelectItem>
                  <SelectItem value="average">Ortalama</SelectItem>
                  <SelectItem value="poor">Zayıf</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center">
            {lastUpdate && (
              <span className="text-gray-500 mr-2 text-sm">
                Son güncelleme: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            
            <Button 
              variant="outline" 
              size="sm"
              disabled={loading}
              onClick={fetchProductAnalysis}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Yenile
            </Button>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 mx-auto mb-4 text-blue-500 animate-spin" />
            <p className="text-gray-600">Ürün analizi yükleniyor...</p>
          </div>
        ) : processedProducts.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Henüz ürün verisi yok</p>
            <Button className="mt-4" onClick={fetchProductAnalysis}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Ürün Analizini Yükle
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {processedProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl flex items-center">
                        {product.title}
                        <a href={product.url} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-500 hover:text-blue-700">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </CardTitle>
                      <CardDescription className="mt-1 flex items-center">
                        {product.price.toFixed(2)} TL
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <Badge className={getPerformanceColor(product.performance)}>
                        {getPerformanceText(product.performance)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded-lg flex flex-col items-center">
                      <Eye className="h-4 w-4 text-gray-500 mb-1" />
                      <p className="text-xl font-bold">{product.views}</p>
                      <p className="text-xs text-gray-500">Görüntülenme</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg flex flex-col items-center">
                      <ShoppingCart className="h-4 w-4 text-gray-500 mb-1" />
                      <p className="text-xl font-bold">{product.sales}</p>
                      <p className="text-xs text-gray-500">Satış</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg flex flex-col items-center">
                      <Hash className="h-4 w-4 text-gray-500 mb-1" />
                      <p className="text-xl font-bold">{product.conversionRate}%</p>
                      <p className="text-xs text-gray-500">Dönüşüm Oranı</p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-500 mb-2">Anahtar Kelimeler</p>
                    <div className="flex flex-wrap gap-2">
                      {product.keywords.map((keyword, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {product.recommendations.length > 0 && (
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium text-gray-700 mb-3">AI Önerileri</p>
                      <div className="space-y-3">
                        {product.recommendations.map((rec, idx) => (
                          <div key={idx} className="bg-blue-50 p-3 rounded-lg">
                            <p className="font-medium text-blue-800 flex items-center">
                              {getRecommendationIcon(rec.type)}
                              <span className="ml-2">{rec.title}</span>
                            </p>
                            <p className="text-sm text-gray-700 mt-1">{rec.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
} 