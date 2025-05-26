"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import {
  Sparkles,
  Calendar,
  TrendingUp,
  Target,
  Lightbulb,
  BarChart3,
  Search,
  ArrowRight,
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
  const router = useRouter()
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([])
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [aiSource, setAiSource] = useState<"openai" | "fallback" | null>(null)

  const aiTools = [
    {
      id: "market-advisor",
      title: "Pazar Danışmanı",
      description: "Trendleri, fırsatları ve ürün performansını tek bir gösterge panelinde analiz edin.",
      icon: BarChart3,
      color: "from-blue-400 to-indigo-500",
      path: "/dolphin-ai/market-advisor"
    },
    {
      id: "trend-predictor",
      title: "Trend Tahmini",
      description: "Yapay zeka ile gelecek trendleri önceden tahmin edin ve fırsatları yakalayın.",
      icon: TrendingUp,
      color: "from-purple-400 to-pink-500",
      path: "/dolphin-ai/trend-predictor"
    },
    {
      id: "opportunity-finder",
      title: "Pazar Fırsatı Bulucu",
      description: "Yüksek potansiyelli niche pazar fırsatlarını keşfedin ve rekabette öne çıkın.",
      icon: Lightbulb,
      color: "from-green-400 to-cyan-500",
      path: "/dolphin-ai/opportunity-finder"
    },
    {
      id: "product-analyzer",
      title: "Ürün Analizi",
      description: "Ürünlerinizin performansını analiz edin ve optimize etmek için öneriler alın.",
      icon: Target,
      color: "from-orange-400 to-red-500",
      path: "/dolphin-ai/product-analyzer"
    },
    {
      id: "seo-optimizer",
      title: "SEO Optimizer",
      description: "Ürün başlıklarınızı ve açıklamalarınızı AI ile optimize edin, arama sıralamalarını yükseltin.",
      icon: Search,
      color: "from-yellow-400 to-amber-500",
      path: "/seo-optimizer"
    },
    {
      id: "seasonal-planner",
      title: "Mevsimsel Planlayıcı",
      description: "Özel günler ve mevsimsel fırsatlar için önceden hazırlıklı olun.",
      icon: Calendar,
      color: "from-teal-400 to-emerald-500",
      path: "/seasonal-planner"
    }
  ]

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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Dolphin AI Araçları</h1>
              <p className="text-gray-600">Yapay zeka destekli araçlarla işletmenizi büyütün ve rekabette öne geçin</p>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-800 flex items-center gap-1 py-1.5">
              <Bot className="h-3 w-3" />
              Claude 3.7 Sonnet ile güçlendirilmiştir
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aiTools.map(tool => (
            <Card key={tool.id} className="overflow-hidden hover:shadow-md transition-all">
              <div className={`h-2 bg-gradient-to-r ${tool.color}`}></div>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${tool.color}`}>
                    <tool.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <CardTitle className="mt-4">{tool.title}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button 
                  variant="ghost" 
                  className="w-full justify-between text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                  onClick={() => router.push(tool.path)}
                >
                  <span>Keşfet</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-12 bg-blue-50 rounded-lg p-6 border border-blue-100">
          <div className="flex items-start">
            <div className="mr-4 bg-blue-500 rounded-full p-3">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Yapay Zeka ile İşletmenizi Büyütün</h3>
              <p className="text-gray-700 mb-4">
                Dolphin AI araçları, gelişmiş yapay zeka teknolojisini kullanarak Etsy işletmeniz için veri odaklı kararlar almanıza yardımcı olur. Trendleri önceden tahmin edin, pazar fırsatlarını keşfedin ve ürün performansınızı optimize edin.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">Trend Analizi</Badge>
                <Badge className="bg-green-100 text-green-800 border-green-200">Pazar Fırsatları</Badge>
                <Badge className="bg-purple-100 text-purple-800 border-purple-200">Ürün Optimizasyonu</Badge>
                <Badge className="bg-amber-100 text-amber-800 border-amber-200">SEO İyileştirme</Badge>
                <Badge className="bg-red-100 text-red-800 border-red-200">Rekabet Avantajı</Badge>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

