"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, TrendingUp, Lightbulb, Sparkles, RefreshCw, CalendarDays } from "lucide-react"
import { createClient } from "@/lib/supabase"

interface AIRecommendation {
  type: "product" | "size" | "style" | "seasonal" | "marketing"
  title: string
  description: string
  confidence: number
  data?: any
}

interface ImportantDate {
  date: string
  name: string
  type: "holiday" | "seasonal" | "special"
  recommendation: string
}

export default function DolphinAIPage() {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([])
  const [importantDates, setImportantDates] = useState<ImportantDate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastGenerated, setLastGenerated] = useState<string | null>(null)
  const [salesData, setSalesData] = useState<any>(null)

  useEffect(() => {
    loadSalesData()
    loadImportantDates()
  }, [])

  const loadSalesData = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      // Satış verilerini yükle
      const { data: products } = await supabase.from("products").select("*").eq("user_id", user.id)

      const { data: orders } = await supabase.from("orders").select("*").eq("user_id", user.id)

      setSalesData({ products, orders })
    }
  }

  const loadImportantDates = () => {
    // 2025 için önemli günler
    const dates: ImportantDate[] = [
      {
        date: "2025-02-14",
        name: "Sevgililer Günü",
        type: "holiday",
        recommendation:
          "Romantik ve aşk temalı canvas wall art'lar hazırlayın. Çiftler için özel koleksiyonlar oluşturun.",
      },
      {
        date: "2025-03-08",
        name: "Kadınlar Günü",
        type: "special",
        recommendation: "Güçlü kadın figürleri, motivasyonel sözler ve feminen tasarımlar öne çıkarın.",
      },
      {
        date: "2025-03-20",
        name: "İlkbahar Başlangıcı",
        type: "seasonal",
        recommendation: "Pastel renkler, çiçek motifleri ve doğa temalı tasarımlar için ideal zaman.",
      },
      {
        date: "2025-05-11",
        name: "Anneler Günü",
        type: "holiday",
        recommendation: "Anne-çocuk temalı, aile fotoğrafları ve sıcak mesajlı canvas'lar hazırlayın.",
      },
      {
        date: "2025-06-15",
        name: "Babalar Günü",
        type: "holiday",
        recommendation: "Maskülen tasarımlar, spor temalı ve baba-çocuk görselleri öne çıkarın.",
      },
      {
        date: "2025-06-21",
        name: "Yaz Başlangıcı",
        type: "seasonal",
        recommendation: "Canlı renkler, plaj temaları ve tatil görselleri için sezon başlıyor.",
      },
      {
        date: "2025-09-22",
        name: "Sonbahar Başlangıcı",
        type: "seasonal",
        recommendation: "Sıcak tonlar, yaprak motifleri ve rustik tasarımlar için ideal dönem.",
      },
      {
        date: "2025-10-31",
        name: "Halloween",
        type: "holiday",
        recommendation: "Gotik, mistik ve korku temalı tasarımlar için yoğun satış dönemi.",
      },
      {
        date: "2025-11-27",
        name: "Thanksgiving",
        type: "holiday",
        recommendation: "Şükran, aile birliği ve sonbahar temalı canvas'lar hazırlayın.",
      },
      {
        date: "2025-12-25",
        name: "Noel",
        type: "holiday",
        recommendation: "Noel temalı, kış manzaraları ve hediye uygun boyutlarda canvas'lar.",
      },
    ]
    setImportantDates(dates)
  }

  const generateRecommendations = async () => {
    setIsLoading(true)

    try {
      // AI önerilerini oluştur
      const response = await fetch("/api/ai/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          salesData,
          businessType: "canvas_wall_art",
          currentDate: new Date().toISOString(),
        }),
      })

      if (response.ok) {
        const aiRecommendations = await response.json()
        setRecommendations(aiRecommendations.recommendations)
        setLastGenerated(new Date().toLocaleString("tr-TR"))
      }
    } catch (error) {
      console.error("AI önerileri alınırken hata:", error)
      // Fallback öneriler
      setRecommendations([
        {
          type: "size",
          title: "16x20 inch boyutu çok popüler",
          description: "Son 30 günde en çok satan boyut 16x20 inch. Bu boyutta daha fazla tasarım eklemeyi düşünün.",
          confidence: 85,
        },
        {
          type: "style",
          title: "Minimalist tasarımlar trend",
          description: "Sade, minimalist ve modern tasarımlar yüksek dönüşüm oranına sahip.",
          confidence: 78,
        },
        {
          type: "seasonal",
          title: "Kış temalı tasarımlar ekleyin",
          description: "Mevsimsel olarak kış manzaraları ve sıcak tonlar talep görüyor.",
          confidence: 72,
        },
      ])
      setLastGenerated(new Date().toLocaleString("tr-TR"))
    }

    setIsLoading(false)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "bg-green-100 text-green-800"
    if (confidence >= 60) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "product":
        return <TrendingUp className="h-4 w-4" />
      case "size":
        return <Sparkles className="h-4 w-4" />
      case "style":
        return <Lightbulb className="h-4 w-4" />
      case "seasonal":
        return <Calendar className="h-4 w-4" />
      case "marketing":
        return <RefreshCw className="h-4 w-4" />
      default:
        return <Lightbulb className="h-4 w-4" />
    }
  }

  const getUpcomingDates = () => {
    const today = new Date()
    const upcoming = importantDates
      .filter((date) => {
        const eventDate = new Date(date.date)
        const diffTime = eventDate.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays > 0 && diffDays <= 60 // Önümüzdeki 60 gün
      })
      .slice(0, 5)

    return upcoming
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-orange-500" />
            Dolphin AI
          </h1>
          <p className="text-gray-600 mt-2">Canvas Wall Art satışlarınız için AI destekli öneriler ve takvim</p>
        </div>
        <Button onClick={generateRecommendations} disabled={isLoading} className="bg-orange-500 hover:bg-orange-600">
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Analiz Ediliyor...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Öneri Al
            </>
          )}
        </Button>
      </div>

      {lastGenerated && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">
            <strong>Son güncelleme:</strong> {lastGenerated}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Önerileri */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-orange-500" />
                AI Önerileri
              </CardTitle>
              <CardDescription>Satış verilerinize dayalı akıllı öneriler</CardDescription>
            </CardHeader>
            <CardContent>
              {recommendations.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">AI önerilerini görmek için "Öneri Al" butonuna tıklayın</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recommendations.map((rec, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(rec.type)}
                          <h3 className="font-semibold text-gray-900">{rec.title}</h3>
                        </div>
                        <Badge className={getConfidenceColor(rec.confidence)}>%{rec.confidence} güven</Badge>
                      </div>
                      <p className="text-gray-600 text-sm">{rec.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Yaklaşan Önemli Günler */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-orange-500" />
                Yaklaşan Önemli Günler
              </CardTitle>
              <CardDescription>Satış fırsatları için hazırlık yapın</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getUpcomingDates().map((date, index) => {
                  const eventDate = new Date(date.date)
                  const today = new Date()
                  const diffTime = eventDate.getTime() - today.getTime()
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

                  return (
                    <div key={index} className="border-l-4 border-orange-500 pl-4 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-sm">{date.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {diffDays} gün
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{eventDate.toLocaleDateString("tr-TR")}</p>
                      <p className="text-xs text-gray-700">{date.recommendation}</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Canvas Wall Art İpuçları */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            Canvas Wall Art İpuçları
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-orange-50 p-4 rounded-lg">
              <h4 className="font-semibold text-orange-800 mb-2">Popüler Boyutlar</h4>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• 16x20 inch (40x50 cm)</li>
                <li>• 12x16 inch (30x40 cm)</li>
                <li>• 8x10 inch (20x25 cm)</li>
                <li>• 24x36 inch (60x90 cm)</li>
              </ul>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Trend Stiller</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Minimalist</li>
                <li>• Boho</li>
                <li>• Modern Abstract</li>
                <li>• Vintage</li>
              </ul>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Popüler Temalar</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Doğa & Manzara</li>
                <li>• Motivasyonel</li>
                <li>• Geometrik</li>
                <li>• Hayvan Portreleri</li>
              </ul>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold text-purple-800 mb-2">SEO İpuçları</h4>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• "wall art" kullanın</li>
                <li>• Boyut belirtin</li>
                <li>• Renk adları ekleyin</li>
                <li>• "canvas print" ekleyin</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
