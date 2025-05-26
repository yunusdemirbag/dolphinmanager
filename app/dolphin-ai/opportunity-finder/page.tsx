"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Lightbulb,
  Target,
  BarChart3,
  RefreshCw,
  AlertCircle,
  Users,
  TrendingUp,
  Calendar,
  Tag,
  Clock,
  Info,
  Settings,
  Sparkles,
  ArrowRight,
} from "lucide-react"

// Pazar fırsatları veri yapısı
interface MarketOpportunity {
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

export default function OpportunityFinderPage() {
  const [category, setCategory] = useState("canvas_wall_art")
  const [competition, setCompetition] = useState("medium")
  const [opportunities, setOpportunities] = useState<MarketOpportunity[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [selectedOpportunity, setSelectedOpportunity] = useState<MarketOpportunity | null>(null)
  const [difficultyFilter, setDifficultyFilter] = useState("all")

  // Pazar fırsatları yükleme
  const fetchOpportunities = async () => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/ai/market-opportunity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category,
          competition
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
      setLoading(false)
    }
  }

  // Sayfa yüklendiğinde veri yükle
  useEffect(() => {
    fetchOpportunities()
  }, [category, competition])

  // Talep seviyesi rengi
  const getDemandColor = (demand: string) => {
    if (demand === "high") return "bg-green-100 text-green-800"
    if (demand === "rising") return "bg-blue-100 text-blue-800"
    return "bg-yellow-100 text-yellow-800"
  }
  
  // Rekabet seviyesi rengi
  const getCompetitionColor = (comp: string) => {
    if (comp === "low") return "bg-green-100 text-green-800"
    if (comp === "medium") return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  // Kâr marjı rengi
  const getProfitMarginColor = (margin: string) => {
    if (margin === "high") return "bg-green-100 text-green-800"
    if (margin === "medium-high" || margin === "medium") return "bg-blue-100 text-blue-800"
    return "bg-yellow-100 text-yellow-800"
  }

  // Zorluk seviyesi rengi
  const getDifficultyColor = (difficulty: string) => {
    if (difficulty === "low") return "bg-green-100 text-green-800"
    if (difficulty === "medium") return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  // Fırsat puanı rengi
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800"
    if (score >= 70) return "bg-blue-100 text-blue-800"
    if (score >= 60) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  // Türkçe metinler
  const getDemandText = (demand: string) => {
    if (demand === "high") return "Yüksek"
    if (demand === "rising") return "Yükseliyor"
    if (demand === "medium") return "Orta"
    return "Düşük"
  }

  const getCompetitionText = (comp: string) => {
    if (comp === "low") return "Düşük"
    if (comp === "medium") return "Orta" 
    if (comp === "medium-high") return "Orta-Yüksek"
    return "Yüksek"
  }

  const getProfitMarginText = (margin: string) => {
    if (margin === "high") return "Yüksek"
    if (margin === "medium-high") return "Orta-Yüksek"
    if (margin === "medium") return "Orta"
    return "Düşük"
  }

  const getDifficultyText = (difficulty: string) => {
    if (difficulty === "low") return "Kolay"
    if (difficulty === "medium") return "Orta"
    if (difficulty === "medium-high") return "Orta-Zor"
    return "Zor"
  }

  // Filtreleme
  const filteredOpportunities = opportunities.filter(opp => {
    if (difficultyFilter === "all") return true
    return opp.implementationDifficulty === difficultyFilter
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Pazar Fırsatı Bulucu</h1>
              <p className="text-gray-600">AI tarafından tespit edilen niche pazar fırsatlarını keşfedin</p>
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
                  <SelectItem value="canvas_wall_art">Canvas Wall Art</SelectItem>
                  <SelectItem value="wall_decor">Duvar Dekorasyonu</SelectItem>
                  <SelectItem value="art_prints">Sanat Baskıları</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <p className="mb-2 text-sm font-medium">Rekabet</p>
              <Select value={competition} onValueChange={setCompetition}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Düşük Rekabet</SelectItem>
                  <SelectItem value="medium">Orta Rekabet</SelectItem>
                  <SelectItem value="high">Yüksek Rekabet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Zorluk Filtresi</p>
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="low">Kolay</SelectItem>
                  <SelectItem value="medium">Orta</SelectItem>
                  <SelectItem value="medium-high">Orta-Zor</SelectItem>
                  <SelectItem value="high">Zor</SelectItem>
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
              onClick={fetchOpportunities}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Yenile
            </Button>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 mx-auto mb-4 text-blue-500 animate-spin" />
            <p className="text-gray-600">Pazar fırsatları analiz ediliyor...</p>
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Seçilen kriterlere uygun fırsat bulunamadı</p>
            <Button className="mt-4" onClick={fetchOpportunities}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Fırsatları Yenile
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOpportunities.map((opp) => (
              <Card 
                key={opp.id} 
                className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedOpportunity(opp)}
              >
                <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{opp.title}</CardTitle>
                      <CardDescription className="mt-1 line-clamp-2">{opp.description}</CardDescription>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <Badge className={getScoreColor(opp.opportunityScore)}>
                        Fırsat Puanı: {Math.round(opp.opportunityScore)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 text-gray-500 mr-2" />
                      <div>
                        <p className="text-xs text-gray-500">Talep</p>
                        <p className="text-sm font-medium">
                          <Badge className={getDemandColor(opp.demand)} variant="secondary">
                            {getDemandText(opp.demand)}
                          </Badge>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Target className="h-4 w-4 text-gray-500 mr-2" />
                      <div>
                        <p className="text-xs text-gray-500">Rekabet</p>
                        <p className="text-sm font-medium">
                          <Badge className={getCompetitionColor(opp.competition)} variant="secondary">
                            {getCompetitionText(opp.competition)}
                          </Badge>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <BarChart3 className="h-4 w-4 text-gray-500 mr-2" />
                      <div>
                        <p className="text-xs text-gray-500">Kâr Marjı</p>
                        <p className="text-sm font-medium">
                          <Badge className={getProfitMarginColor(opp.profitMargin)} variant="secondary">
                            {getProfitMarginText(opp.profitMargin)}
                          </Badge>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Settings className="h-4 w-4 text-gray-500 mr-2" />
                      <div>
                        <p className="text-xs text-gray-500">Zorluk</p>
                        <p className="text-sm font-medium">
                          <Badge className={getDifficultyColor(opp.implementationDifficulty)} variant="secondary">
                            {getDifficultyText(opp.implementationDifficulty)}
                          </Badge>
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {opp.keywords.slice(0, 5).map((keyword, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                    {opp.keywords.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{opp.keywords.length - 5}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded-lg mt-3">
                    <p className="text-sm text-gray-700 font-medium">
                      <Info className="h-3 w-3 inline mr-1" />
                      {opp.marketInsight}
                    </p>
                  </div>
                  
                  <div className="mt-4 pt-2 flex justify-end">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                      <Sparkles className="h-3 w-3 mr-2" />
                      Detayları Görüntüle
                      <ArrowRight className="h-3 w-3 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Detaylı fırsat görünümü */}
        {selectedOpportunity && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold">{selectedOpportunity.title}</h2>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedOpportunity(null)}>
                    <span className="sr-only">Kapat</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </Button>
                </div>

                <div className="mb-6">
                  <p className="text-gray-700">{selectedOpportunity.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium mb-3 flex items-center">
                        <Target className="h-4 w-4 mr-2 text-green-600" />
                        Pazar Değerlendirmesi
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Fırsat Puanı:</span>
                          <Badge className={getScoreColor(selectedOpportunity.opportunityScore)}>
                            {Math.round(selectedOpportunity.opportunityScore)}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Talep:</span>
                          <Badge className={getDemandColor(selectedOpportunity.demand)} variant="secondary">
                            {getDemandText(selectedOpportunity.demand)}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Rekabet:</span>
                          <Badge className={getCompetitionColor(selectedOpportunity.competition)} variant="secondary">
                            {getCompetitionText(selectedOpportunity.competition)}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Kâr Marjı:</span>
                          <Badge className={getProfitMarginColor(selectedOpportunity.profitMargin)} variant="secondary">
                            {getProfitMarginText(selectedOpportunity.profitMargin)}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium mb-3 flex items-center">
                        <Settings className="h-4 w-4 mr-2 text-orange-600" />
                        Uygulama Detayları
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Zorluk:</span>
                          <Badge className={getDifficultyColor(selectedOpportunity.implementationDifficulty)} variant="secondary">
                            {getDifficultyText(selectedOpportunity.implementationDifficulty)}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Mevsimsellik:</span>
                          <span>{selectedOpportunity.seasonality}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium mb-3 flex items-center">
                        <Users className="h-4 w-4 mr-2 text-indigo-600" />
                        Hedef Kitle
                      </h3>
                      <p className="text-gray-700 text-sm">{selectedOpportunity.targetAudience}</p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium mb-3 flex items-center">
                        <Tag className="h-4 w-4 mr-2 text-purple-600" />
                        Anahtar Kelimeler
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedOpportunity.keywords.map((keyword, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-2 flex items-center">
                      <Lightbulb className="h-4 w-4 mr-2 text-amber-600" />
                      Pazar Açığı
                    </h3>
                    <p className="text-gray-700 text-sm">{selectedOpportunity.marketGap}</p>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-2 flex items-center">
                      <Sparkles className="h-4 w-4 mr-2 text-green-600" />
                      Strateji Önerisi
                    </h3>
                    <p className="text-gray-700 text-sm">{selectedOpportunity.marketInsight}</p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button variant="ghost" onClick={() => setSelectedOpportunity(null)}>
                    Kapat
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    <Sparkles className="h-3 w-3 mr-2" />
                    Bu Fırsatı Değerlendir
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