"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sparkles,
  Calendar,
  TrendingUp,
  Target,
  Lightbulb,
  Heart,
  Gift,
  Snowflake,
  Sun,
  Leaf,
  Flower,
  RefreshCw,
  Bot,
  Clock
} from "lucide-react"

interface AIRecommendation {
  id: string
  type: "size" | "style" | "theme" | "seo" | "seasonal"
  title: string
  description: string
  confidence: number
  priority: "high" | "medium" | "low"
  data?: any
}

interface CalendarEvent {
  date: string
  name: string
  description: string
  themes: string[]
  colors: string[]
  daysUntil: number
  priority: "high" | "medium" | "low"
  businessImpact: string
}

export default function DolphinAIPage() {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([])
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [aiSource, setAiSource] = useState<"openai" | "fallback" | null>(null)

  useEffect(() => {
    // Sayfa yüklendiğinde localStorage'dan verileri yükle
    loadDataFromStorage()
  }, [])

  const loadDataFromStorage = () => {
    try {
      // AI önerilerini yükle
      const storedRecommendations = localStorage.getItem('aiRecommendations')
      if (storedRecommendations) {
        setRecommendations(JSON.parse(storedRecommendations))
      }

      // Takvim etkinliklerini yükle
      const storedEvents = localStorage.getItem('calendarEvents')
      if (storedEvents) {
        setCalendarEvents(JSON.parse(storedEvents))
      }

      // Son güncelleme zamanını yükle
      const storedLastUpdate = localStorage.getItem('lastAIUpdate')
      if (storedLastUpdate) {
        setLastUpdate(new Date(storedLastUpdate))
      }

      // AI kaynağını yükle
      const storedAiSource = localStorage.getItem('aiSource')
      if (storedAiSource) {
        setAiSource(storedAiSource as "openai" | "fallback")
      }
    } catch (error) {
      console.error("Error loading data from storage:", error)
    }
  }

  const saveDataToStorage = (recommendations: AIRecommendation[], events: CalendarEvent[], source: "openai" | "fallback") => {
    try {
      localStorage.setItem('aiRecommendations', JSON.stringify(recommendations))
      localStorage.setItem('calendarEvents', JSON.stringify(events))
      localStorage.setItem('lastAIUpdate', new Date().toISOString())
      localStorage.setItem('aiSource', source)
    } catch (error) {
      console.error("Error saving data to storage:", error)
    }
  }

  const generateAIRecommendations = async () => {
    setLoading(true)
    
    try {
      // Hem AI önerileri hem de takvim etkinliklerini paralel olarak çek
      const [aiResponse, calendarResponse] = await Promise.all([
        fetch('/api/ai/canvas-recommendations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            businessType: 'canvas_wall_art',
            userProfile: {
              name: 'Yunus',
              age: 27,
              experience: 'intermediate',
              focus: 'canvas_wall_art_prints'
            }
          })
        }),
        fetch('/api/ai/calendar-events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            currentDate: new Date().toISOString()
          })
        })
      ])

      let newRecommendations: AIRecommendation[] = []
      let newEvents: CalendarEvent[] = []
      let source = "fallback"

      // AI önerilerini işle
      if (aiResponse.ok) {
        const aiData = await aiResponse.json()
        newRecommendations = aiData.recommendations || []
        source = aiData.source || "fallback"
      } else {
        // AI API hatası - boş öneriler göster
        newRecommendations = []
        source = "error"
      }

      // Takvim etkinliklerini işle
      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json()
        newEvents = calendarData.events || []
      }

      // State'i güncelle
      setRecommendations(newRecommendations)
      setCalendarEvents(newEvents)
      setAiSource(source as "openai" | "fallback")
      setLastUpdate(new Date())

      // localStorage'a kaydet
      saveDataToStorage(newRecommendations, newEvents, source as "openai" | "fallback")

    } catch (error) {
      console.error("Error generating recommendations:", error)
      // Hata durumunda boş öneriler göster
      setRecommendations([])
      setAiSource("error")
      setLastUpdate(new Date())
      
      // Hata durumunda da localStorage'a kaydet
      saveDataToStorage([], [], "error")
    } finally {
      setLoading(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 border-red-200"
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "low": return "bg-green-100 text-green-800 border-green-200"
      default: return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "size": return <Target className="h-4 w-4" />
      case "style": return <Sparkles className="h-4 w-4" />
      case "theme": return <Lightbulb className="h-4 w-4" />
      case "seo": return <TrendingUp className="h-4 w-4" />
      case "seasonal": return <Calendar className="h-4 w-4" />
      default: return <Bot className="h-4 w-4" />
    }
  }

  const getCalendarIcon = (eventName: string) => {
    if (eventName.includes("Sevgililer")) return Heart
    if (eventName.includes("Noel") || eventName.includes("Kış")) return Snowflake
    if (eventName.includes("Yaz")) return Sun
    if (eventName.includes("Sonbahar")) return Leaf
    if (eventName.includes("Bahar") || eventName.includes("Anne")) return Flower
    return Calendar
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Dolphin AI</h1>
              <p className="text-gray-600">Fiziksel Canvas Wall Art Print işletmeniz için AI destekli öneriler ve takvim planlaması</p>
              {lastUpdate && (
                <p className="text-sm text-gray-500 mt-2">
                  Son güncelleme: {lastUpdate.toLocaleString('tr-TR')}
                  {aiSource && (
                    <span className="ml-2">
                      <Badge variant={aiSource === "openai" ? "default" : "secondary"}>
                        {aiSource === "openai" ? "OpenAI" : "Fallback"}
                      </Badge>
                    </span>
                  )}
                </p>
              )}
            </div>
            <Button 
              onClick={generateAIRecommendations} 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Güncelleniyor...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Yeni Öneriler Al
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* AI Önerileri - Sol taraf (2/3) */}
          <div className="lg:col-span-2">
            {recommendations.length > 0 ? (
              <div className="space-y-4">
                {recommendations.map((recommendation) => (
                  <Card key={recommendation.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(recommendation.type)}
                          <CardTitle className="text-lg">{recommendation.title}</CardTitle>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getPriorityColor(recommendation.priority)}>
                            {recommendation.priority === "high" ? "Yüksek" : 
                             recommendation.priority === "medium" ? "Orta" : "Düşük"}
                          </Badge>
                          <Badge variant="outline">
                            %{recommendation.confidence} güven
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700">{recommendation.description}</p>
                      {recommendation.data && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-900 mb-1">Detaylar:</p>
                          <div className="text-sm text-gray-600">
                            {Object.entries(recommendation.data).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="capitalize">{key}:</span>
                                <span className="font-medium">
                                  {Array.isArray(value) ? value.join(", ") : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Bot className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz öneri yok</h3>
                  <p className="text-gray-600">
                    AI destekli öneriler almak için sağ üstteki "Yeni Öneriler Al" butonuna tıklayın
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Yaklaşan Özel Günler - Sağ taraf (1/3) */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Yaklaşan Özel Günler
                </CardTitle>
                <CardDescription>
                  Canvas Wall Art Print satışları için önemli tarihler
                </CardDescription>
              </CardHeader>
              <CardContent>
                {calendarEvents.length > 0 ? (
                  <div className="space-y-4">
                    {calendarEvents.slice(0, 5).map((event, index) => {
                      const IconComponent = getCalendarIcon(event.name)
                      return (
                        <div key={index} className={`border-l-4 pl-4 py-3 rounded-r-lg ${
                          event.priority === 'high' ? 'border-orange-400 bg-orange-50' :
                          event.priority === 'medium' ? 'border-blue-400 bg-blue-50' :
                          'border-green-400 bg-green-50'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <IconComponent className={`h-5 w-5 mr-2 ${
                                event.priority === 'high' ? 'text-orange-600' :
                                event.priority === 'medium' ? 'text-blue-600' :
                                'text-green-600'
                              }`} />
                              <h4 className="font-semibold text-gray-900">{event.name}</h4>
                            </div>
                            <div className={`flex items-center text-sm font-bold ${
                              event.priority === 'high' ? 'text-orange-600' :
                              event.priority === 'medium' ? 'text-blue-600' :
                              'text-green-600'
                            }`}>
                              <Clock className="h-3 w-3 mr-1" />
                              {event.daysUntil} gün
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{event.description}</p>
                          <p className="text-xs text-gray-600 mb-2 font-medium">İş Etkisi: {event.businessImpact}</p>
                          
                          {event.themes && event.themes.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-gray-700 mb-1">Önerilen Temalar:</p>
                              <div className="flex flex-wrap gap-1">
                                {event.themes.slice(0, 3).map((theme, themeIndex) => (
                                  <Badge key={themeIndex} variant="secondary" className="text-xs">
                                    {theme}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {event.colors && event.colors.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-gray-700 mb-1">Önerilen Renkler:</p>
                              <div className="flex flex-wrap gap-1">
                                {event.colors.slice(0, 3).map((color, colorIndex) => (
                                  <Badge key={colorIndex} variant="outline" className="text-xs">
                                    {color}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-8 w-8 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-600 text-sm">
                      Henüz özel gün bilgisi yok
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

