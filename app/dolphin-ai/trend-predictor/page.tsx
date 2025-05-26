"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  TrendingUp,
  Sparkles,
  Search,
  RefreshCw,
  AlertCircle,
  Calendar,
  Users,
  Percent,
  Info,
  ArrowRight,
  ExternalLink,
} from "lucide-react"

// Trend analizi veri yapısı
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

export default function TrendPredictorPage() {
  const [category, setCategory] = useState("canvas_art")
  const [timeRange, setTimeRange] = useState("next_90_days")
  const [trends, setTrends] = useState<Trend[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState("cards")
  const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null)

  // Trend verileri yükleme
  const fetchTrends = async () => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/ai/trend-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category,
          timeRange
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
      setLoading(false)
    }
  }

  // Sayfa yüklendiğinde veri yükle
  useEffect(() => {
    fetchTrends()
  }, [category, timeRange])

  // Güven seviyesi rengi
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return "bg-green-100 text-green-800"
    if (confidence >= 70) return "bg-blue-100 text-blue-800"
    return "bg-yellow-100 text-yellow-800"
  }

  // Popülerlik seviyesini Türkçeleştir
  const getPopularityText = (popularity: string) => {
    switch (popularity) {
      case "high":
        return "Yüksek"
      case "medium":
        return "Orta"
      case "rising":
        return "Yükseliyor"
      case "low":
        return "Düşük"
      default:
        return popularity
    }
  }

  // Detaylı trendi göster
  const handleTrendClick = (trend: Trend) => {
    setSelectedTrend(trend)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Trend Tahmin Analizi</h1>
              <p className="text-gray-600">Yapay zeka ile öne çıkan ve yükselen trendleri keşfedin</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <p className="mb-2 text-sm font-medium">Kategori</p>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="canvas_art">Canvas Wall Art</SelectItem>
                  <SelectItem value="photography">Fotoğraf Baskıları</SelectItem>
                  <SelectItem value="digital_art">Dijital Sanat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <p className="mb-2 text-sm font-medium">Zaman Aralığı</p>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="next_30_days">Önümüzdeki 30 Gün</SelectItem>
                  <SelectItem value="next_90_days">Önümüzdeki 90 Gün</SelectItem>
                  <SelectItem value="next_180_days">Önümüzdeki 180 Gün</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Görünüm</p>
              <Tabs 
                value={viewMode} 
                onValueChange={setViewMode}
                className="w-[200px]"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="cards">Kartlar</TabsTrigger>
                  <TabsTrigger value="list">Liste</TabsTrigger>
                </TabsList>
              </Tabs>
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
              onClick={fetchTrends}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Yenile
            </Button>
          </div>
        </div>
        
        {loading ? (
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
        ) : viewMode === "cards" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {trends.map((trend) => (
              <Card 
                key={trend.id} 
                className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleTrendClick(trend)}
              >
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
                      <Badge variant="outline" className="bg-blue-50">
                        Beklenen Büyüme: {trend.predictedGrowth}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 text-gray-500 mr-2" />
                      <div>
                        <p className="text-xs text-gray-500">Popülerlik</p>
                        <p className="text-sm">{getPopularityText(trend.currentPopularity)}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-gray-500 mr-2" />
                      <div>
                        <p className="text-xs text-gray-500">Hedef Kitle</p>
                        <p className="text-sm">{trend.targetDemographic}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                      <div>
                        <p className="text-xs text-gray-500">Mevsimsellik</p>
                        <p className="text-sm">{trend.seasonality}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Info className="h-4 w-4 text-gray-500 mr-2" />
                      <div>
                        <p className="text-xs text-gray-500">Detaylar</p>
                        <p className="text-sm text-blue-600">Detayları Gör</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {trends.map((trend) => (
              <div 
                key={trend.id} 
                className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleTrendClick(trend)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <TrendingUp className="h-5 w-5 text-blue-500 mr-3" />
                    <div>
                      <h3 className="font-medium">{trend.name}</h3>
                      <p className="text-gray-500 text-sm line-clamp-1">{trend.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className={getConfidenceColor(trend.confidence)}>
                      {trend.confidence}%
                    </Badge>
                    <Badge variant="outline" className="bg-blue-50">
                      {trend.predictedGrowth}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detaylı trend görünümü */}
        {selectedTrend && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold">{selectedTrend.name}</h2>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedTrend(null)}>
                    <span className="sr-only">Kapat</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </Button>
                </div>

                <div className="mb-6">
                  <p className="text-gray-700">{selectedTrend.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium mb-2 flex items-center">
                        <Percent className="h-4 w-4 mr-2 text-green-600" />
                        Güven ve Büyüme
                      </h3>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Güven Seviyesi:</span>
                        <Badge className={getConfidenceColor(selectedTrend.confidence)}>
                          {selectedTrend.confidence}%
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Beklenen Büyüme:</span>
                        <Badge variant="outline" className="bg-blue-50">
                          {selectedTrend.predictedGrowth}
                        </Badge>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium mb-2 flex items-center">
                        <Users className="h-4 w-4 mr-2 text-indigo-600" />
                        Hedef Pazar
                      </h3>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Popülerlik:</span>
                        <span>{getPopularityText(selectedTrend.currentPopularity)}</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Hedef Kitle:</span>
                        <span>{selectedTrend.targetDemographic}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Mevsimsellik:</span>
                        <span>{selectedTrend.seasonality}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium mb-2 flex items-center">
                        <Search className="h-4 w-4 mr-2 text-purple-600" />
                        Anahtar Kelimeler
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedTrend.keywords.map((keyword, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium mb-2 flex items-center">
                        <ExternalLink className="h-4 w-4 mr-2 text-blue-600" />
                        Örnek Ürünler
                      </h3>
                      <div className="space-y-2">
                        {selectedTrend.examples.map((example, idx) => (
                          <a
                            key={idx}
                            href={example}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline block text-sm truncate"
                          >
                            {example}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg mb-6">
                  <h3 className="font-medium mb-2 flex items-center">
                    <Sparkles className="h-4 w-4 mr-2 text-amber-600" />
                    İş Fırsatı
                  </h3>
                  <p className="text-gray-700 text-sm">
                    Bu trend, Etsy ve benzeri platformlarda {selectedTrend.targetDemographic} hedef kitlesine yönelik ürünler oluşturmak için önemli bir fırsat sunmaktadır. Özellikle {selectedTrend.keywords.join(", ")} anahtar kelimelerini içeren ürünler oluşturarak bu yükselen trendi değerlendirebilirsiniz.
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button variant="ghost" onClick={() => setSelectedTrend(null)}>
                    Kapat
                  </Button>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Sparkles className="h-3 w-3 mr-2" />
                    İlham Al
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
} 