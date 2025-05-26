"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  TrendingUp,
  Target,
  BarChart3,
  RefreshCw,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Lightbulb,
  Users,
  Eye,
  ShoppingCart,
  Clock,
  Calendar,
  ChevronRight
} from "lucide-react"

// Trend verileri
interface Trend {
  id: string
  name: string
  description: string
  confidence: number
  predictedGrowth: string
  currentPopularity: string
  targetDemographic: string
  seasonality: string
  keywords: string[]
  examples: string[]
}

// Fırsat verileri
interface Opportunity {
  id: string
  title: string
  description: string
  demand: string
  competition: string
  profitMargin: string
  opportunityScore: number
  targetAudience: string
  implementationDifficulty: string
  seasonality: string
  keywords: string[]
  marketGap: string
  marketInsight: string
}

// Ürün verileri
interface Product {
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

export default function MarketAdvisorPage() {
  const [activeTab, setActiveTab] = useState("trends")
  const [trends, setTrends] = useState<Trend[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState({
    trends: false,
    opportunities: false,
    products: false
  })
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  
  // Trend verileri yükleme
  const fetchTrends = async () => {
    setLoading(prev => ({ ...prev, trends: true }))
    
    try {
      const response = await fetch('/api/ai/trend-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: "canvas_art",
          timeRange: "next_90_days"
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setTrends(data.trends || [])
        setLastUpdate(new Date())
      } else {
        console.error("Failed to fetch trends:", await response.text())
      }
    } catch (error) {
      console.error("Error fetching trends:", error)
    } finally {
      setLoading(prev => ({ ...prev, trends: false }))
    }
  }
  
  // Fırsat verileri yükleme
  const fetchOpportunities = async () => {
    setLoading(prev => ({ ...prev, opportunities: true }))
    
    try {
      const response = await fetch('/api/ai/market-opportunity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: "canvas_wall_art",
          competition: "medium"
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setOpportunities(data.opportunities || [])
        setLastUpdate(new Date())
      } else {
        console.error("Failed to fetch opportunities:", await response.text())
      }
    } catch (error) {
      console.error("Error fetching opportunities:", error)
    } finally {
      setLoading(prev => ({ ...prev, opportunities: false }))
    }
  }
  
  // Ürün verileri yükleme
  const fetchProducts = async () => {
    setLoading(prev => ({ ...prev, products: true }))
    
    try {
      const response = await fetch('/api/ai/product-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopId: 1,
          timeframe: "last_30_days"
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
        setLastUpdate(new Date())
      } else {
        console.error("Failed to fetch products:", await response.text())
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoading(prev => ({ ...prev, products: false }))
    }
  }
  
  // Aktif tab değiştiğinde ilgili verileri yükle
  useEffect(() => {
    if (activeTab === "trends" && trends.length === 0) {
      fetchTrends()
    } else if (activeTab === "opportunities" && opportunities.length === 0) {
      fetchOpportunities()
    } else if (activeTab === "products" && products.length === 0) {
      fetchProducts()
    }
  }, [activeTab])
  
  // Güven seviyesi rengi
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return "bg-green-100 text-green-800"
    if (confidence >= 70) return "bg-blue-100 text-blue-800"
    return "bg-yellow-100 text-yellow-800"
  }
  
  // Fırsat puanı rengi
  const getScoreColor = (score: number) => {
    if (score >= 85) return "bg-green-100 text-green-800"
    if (score >= 75) return "bg-blue-100 text-blue-800"
    return "bg-yellow-100 text-yellow-800"
  }
  
  // Performans seviyesi rengi
  const getPerformanceColor = (performance: string) => {
    if (performance === "excellent") return "bg-green-100 text-green-800"
    if (performance === "good") return "bg-blue-100 text-blue-800"
    if (performance === "average") return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }
  
  // Türkçe metinler
  const getPerformanceText = (performance: string) => {
    if (performance === "excellent") return "Mükemmel"
    if (performance === "good") return "İyi" 
    if (performance === "average") return "Ortalama"
    return "Zayıf"
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Pazar Danışmanı</h1>
              <p className="text-gray-600">Trendleri, fırsatları ve ürün performansınızı tek bir gösterge panelinde analiz edin</p>
            </div>
            
            <div className="flex items-center">
              {lastUpdate && (
                <span className="text-gray-500 mr-4 text-sm flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  Son güncelleme: {lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList className="grid grid-cols-3 w-[400px]">
              <TabsTrigger value="trends" className="flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                Trendler
              </TabsTrigger>
              <TabsTrigger value="opportunities" className="flex items-center">
                <Lightbulb className="h-4 w-4 mr-2" />
                Fırsatlar
              </TabsTrigger>
              <TabsTrigger value="products" className="flex items-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                Ürünler
              </TabsTrigger>
            </TabsList>
            
            <Button
              variant="outline"
              size="sm"
              disabled={loading.trends || loading.opportunities || loading.products}
              onClick={() => {
                if (activeTab === "trends") fetchTrends()
                else if (activeTab === "opportunities") fetchOpportunities()
                else if (activeTab === "products") fetchProducts()
              }}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${(loading.trends || loading.opportunities || loading.products) ? 'animate-spin' : ''}`} />
              Yenile
            </Button>
          </div>
          
          {/* Trendler Tabı */}
          <TabsContent value="trends" className="space-y-4">
            {loading.trends ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 mx-auto mb-4 text-blue-500 animate-spin" />
                <p className="text-gray-600">Trend analizi yükleniyor...</p>
              </div>
            ) : trends.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-8 w-8 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Henüz trend verisi yok</p>
                <Button className="mt-4" onClick={fetchTrends}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Trendleri Yükle
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {trends.map((trend) => (
                  <Card key={trend.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">{trend.name}</CardTitle>
                          <CardDescription className="mt-1 line-clamp-2">{trend.description}</CardDescription>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <Badge className={getConfidenceColor(trend.confidence)}>
                            {trend.confidence}% Güven
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="flex items-center">
                          <TrendingUp className="h-4 w-4 text-gray-500 mr-2" />
                          <div>
                            <p className="text-xs text-gray-500">Büyüme Tahmini</p>
                            <p className="text-sm font-medium">{trend.predictedGrowth}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 text-gray-500 mr-2" />
                          <div>
                            <p className="text-xs text-gray-500">Hedef Kitle</p>
                            <p className="text-sm line-clamp-1">{trend.targetDemographic}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-4">
                        {trend.keywords.map((keyword, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="mt-4 pt-2 border-t flex justify-end">
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                          <span>Detayları Gör</span>
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                <Card className="border-dashed border-2 border-gray-200 flex flex-col items-center justify-center p-6 hover:border-blue-300 transition-colors">
                  <Button variant="outline" onClick={() => window.location.href = "/dolphin-ai/trend-predictor"} className="bg-white">
                    <Sparkles className="h-4 w-4 mr-2 text-blue-500" />
                    <span>Tüm Trendleri Görüntüle</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Card>
              </div>
            )}
          </TabsContent>
          
          {/* Fırsatlar Tabı */}
          <TabsContent value="opportunities" className="space-y-4">
            {loading.opportunities ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 mx-auto mb-4 text-blue-500 animate-spin" />
                <p className="text-gray-600">Pazar fırsatları analiz ediliyor...</p>
              </div>
            ) : opportunities.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-8 w-8 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Henüz fırsat verisi yok</p>
                <Button className="mt-4" onClick={fetchOpportunities}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Fırsatları Yükle
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {opportunities.slice(0, 3).map((opportunity) => (
                  <Card key={opportunity.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">{opportunity.title}</CardTitle>
                          <CardDescription className="mt-1 line-clamp-2">{opportunity.description}</CardDescription>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <Badge className={getScoreColor(opportunity.opportunityScore)}>
                            Fırsat Puanı: {Math.round(opportunity.opportunityScore)}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="flex items-center">
                          <Target className="h-4 w-4 text-gray-500 mr-2" />
                          <div>
                            <p className="text-xs text-gray-500">Rekabet</p>
                            <p className="text-sm font-medium">{opportunity.competition === "low" ? "Düşük" : opportunity.competition === "medium" ? "Orta" : "Yüksek"}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <TrendingUp className="h-4 w-4 text-gray-500 mr-2" />
                          <div>
                            <p className="text-xs text-gray-500">Talep</p>
                            <p className="text-sm font-medium">{opportunity.demand === "high" ? "Yüksek" : opportunity.demand === "medium" ? "Orta" : "Yükseliyor"}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-4">
                        {opportunity.keywords.slice(0, 4).map((keyword, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                        {opportunity.keywords.length > 4 && (
                          <Badge variant="outline" className="text-xs">+{opportunity.keywords.length - 4}</Badge>
                        )}
                      </div>
                      
                      <div className="mt-4 pt-2 border-t flex justify-end">
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                          <span>Detayları Gör</span>
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                <Card className="border-dashed border-2 border-gray-200 flex flex-col items-center justify-center p-6 hover:border-blue-300 transition-colors">
                  <Button variant="outline" onClick={() => window.location.href = "/dolphin-ai/opportunity-finder"} className="bg-white">
                    <Lightbulb className="h-4 w-4 mr-2 text-green-500" />
                    <span>Tüm Fırsatları Görüntüle</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Card>
              </div>
            )}
          </TabsContent>
          
          {/* Ürünler Tabı */}
          <TabsContent value="products" className="space-y-4">
            {loading.products ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 mx-auto mb-4 text-blue-500 animate-spin" />
                <p className="text-gray-600">Ürün analizi yükleniyor...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-8 w-8 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Henüz ürün verisi yok</p>
                <Button className="mt-4" onClick={fetchProducts}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Ürünleri Yükle
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {products.slice(0, 3).map((product) => (
                  <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl line-clamp-1">{product.title}</CardTitle>
                          <CardDescription className="mt-1">{product.price.toFixed(2)} TL</CardDescription>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <Badge className={getPerformanceColor(product.performance)}>
                            {getPerformanceText(product.performance)}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="bg-gray-50 p-3 rounded-lg flex flex-col items-center">
                          <Eye className="h-4 w-4 text-gray-500 mb-1" />
                          <p className="text-lg font-bold">{product.views}</p>
                          <p className="text-xs text-gray-500">Görüntülenme</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg flex flex-col items-center">
                          <ShoppingCart className="h-4 w-4 text-gray-500 mb-1" />
                          <p className="text-lg font-bold">{product.sales}</p>
                          <p className="text-xs text-gray-500">Satış</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg flex flex-col items-center">
                          <Target className="h-4 w-4 text-gray-500 mb-1" />
                          <p className="text-lg font-bold">{product.conversionRate}%</p>
                          <p className="text-xs text-gray-500">Dönüşüm</p>
                        </div>
                      </div>
                      
                      {product.recommendations.length > 0 && (
                        <div className="bg-blue-50 p-3 rounded-lg mb-2">
                          <p className="text-sm font-medium text-blue-800">
                            {product.recommendations[0].title}
                          </p>
                          <p className="text-xs text-gray-700">{product.recommendations[0].description}</p>
                        </div>
                      )}
                      
                      <div className="mt-4 pt-2 border-t flex justify-end">
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                          <span>Detayları Gör</span>
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                <Card className="border-dashed border-2 border-gray-200 flex flex-col items-center justify-center p-6 hover:border-blue-300 transition-colors">
                  <Button variant="outline" onClick={() => window.location.href = "/dolphin-ai/product-analyzer"} className="bg-white">
                    <BarChart3 className="h-4 w-4 mr-2 text-purple-500" />
                    <span>Tüm Ürünleri Analiz Et</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <div className="mt-12 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg p-6">
          <div className="flex items-start mb-4">
            <div className="mr-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full p-3">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Yapay Zeka ile Pazar Analizi</h3>
              <p className="text-gray-700 mb-4">
                Bu pazar danışmanı, gelişmiş yapay zeka algoritmaları kullanarak e-ticaret verilerinizi analiz eder. Böylece satışlarınızı artırmak için hangi trendleri takip etmeniz gerektiğini, hangi pazar fırsatlarına odaklanmanız gerektiğini ve mevcut ürünlerinizin performansını nasıl iyileştirebileceğinizi öğrenebilirsiniz.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white bg-opacity-60 rounded-lg p-4 flex flex-col items-center text-center">
              <div className="bg-blue-100 rounded-full p-3 mb-3">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <h4 className="font-medium mb-2">Trend Analizi</h4>
              <p className="text-sm text-gray-600">Pazar trendlerini önceden tahmin edin ve gelecek satış fırsatlarını kaçırmayın.</p>
            </div>
            
            <div className="bg-white bg-opacity-60 rounded-lg p-4 flex flex-col items-center text-center">
              <div className="bg-green-100 rounded-full p-3 mb-3">
                <Lightbulb className="h-5 w-5 text-green-600" />
              </div>
              <h4 className="font-medium mb-2">Pazar Fırsatları</h4>
              <p className="text-sm text-gray-600">Yüksek büyüme potansiyeline sahip niche pazar fırsatlarını keşfedin.</p>
            </div>
            
            <div className="bg-white bg-opacity-60 rounded-lg p-4 flex flex-col items-center text-center">
              <div className="bg-purple-100 rounded-full p-3 mb-3">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
              <h4 className="font-medium mb-2">Ürün Optimizasyonu</h4>
              <p className="text-sm text-gray-600">Mevcut ürünlerinizin performansını artırmak için öneriler alın.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 