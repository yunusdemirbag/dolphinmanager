import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getEtsyStores } from "@/lib/etsy-api"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { category, timeRange } = body
    
    const supabase = await createClient()
    
    // Kullanıcı doğrulama
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.log("Trend analysis API auth error:", userError, "No user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Gerçek API çağrısı burada yapılabilir
    // Şimdilik AI destekli trend analizi simüle ediyoruz
    const mockTrendData = generateMockTrendData(category, timeRange)
    
    return NextResponse.json({
      trends: mockTrendData,
      lastUpdated: new Date().toISOString(),
      success: true
    })

  } catch (error) {
    console.error("Trend analizi API hatası:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}

function generateMockTrendData(category: string, timeRange: string) {
  const trends = [
    {
      id: "t1",
      name: "Nostaljik Retro Tarz",
      description: "70'ler ve 80'lerin retro tarzı, modern ev dekorasyonunda popüler bir trend haline geliyor. Vintage renkler ve geometrik desenler öne çıkıyor.",
      confidence: 92,
      predictedGrowth: "+45% (6 ay)",
      currentPopularity: "rising",
      targetDemographic: "25-40 yaş arası kent sakinleri",
      seasonality: "Tüm yıl",
      keywords: ["retro", "vintage", "geometrik", "nostaljik", "70ler", "80ler"],
      examples: [
        "https://example.com/retro-geometric-art",
        "https://example.com/vintage-color-palette"
      ]
    },
    {
      id: "t2",
      name: "Minimalist Doğa Manzaraları",
      description: "Minimalist çizgilerle tasarlanmış doğa manzaraları, şehir hayatının yoğunluğundan bunalan tüketiciler arasında popülerlik kazanıyor.",
      confidence: 88,
      predictedGrowth: "+30% (3 ay)",
      currentPopularity: "high",
      targetDemographic: "30-45 yaş arası profesyoneller",
      seasonality: "Bahar ve Yaz",
      keywords: ["minimalist", "doğa", "manzara", "sade", "huzur"],
      examples: [
        "https://example.com/minimal-mountain-scene",
        "https://example.com/simple-nature-art"
      ]
    },
    {
      id: "t3",
      name: "Soyut Geometrik Şekiller",
      description: "Canlı renkli, 3 boyutlu görünümlü soyut geometrik şekiller ve desenler, modern ev dekorasyonunda trend olmaya başladı.",
      confidence: 82,
      predictedGrowth: "+25% (6 ay)",
      currentPopularity: "medium",
      targetDemographic: "25-35 yaş arası tasarım tutkunları",
      seasonality: "Tüm yıl",
      keywords: ["soyut", "geometrik", "3d", "modern", "canlı renkler"],
      examples: [
        "https://example.com/abstract-geometric-art",
        "https://example.com/3d-geometric-prints"
      ]
    },
    {
      id: "t4",
      name: "Kişiselleştirilmiş Aile Portreleri",
      description: "Stilize edilmiş, minimalist yaklaşımla hazırlanan kişiselleştirilmiş aile ve evcil hayvan portreleri, hediye sektöründe yükseliyor.",
      confidence: 78,
      predictedGrowth: "+38% (3 ay)",
      currentPopularity: "rising",
      targetDemographic: "30-50 yaş arası aile odaklı müşteriler",
      seasonality: "Özel günler ve tatiller",
      keywords: ["kişiselleştirilmiş", "portre", "aile", "evcil hayvan", "hediye", "minimalist"],
      examples: [
        "https://example.com/custom-family-portrait",
        "https://example.com/minimalist-pet-art"
      ]
    },
    {
      id: "t5",
      name: "Botanik İllüstrasyonlar",
      description: "Vintage tarzda botanik illüstrasyonlar, özellikle iç mekan bitkileri ve egzotik türlerin çizimleri popülerlik kazanıyor.",
      confidence: 76,
      predictedGrowth: "+22% (6 ay)",
      currentPopularity: "medium",
      targetDemographic: "Bitki tutkunları, 25-45 yaş arası",
      seasonality: "İlkbahar ve Yaz",
      keywords: ["botanik", "illüstrasyon", "bitkiler", "vintage", "doğa"],
      examples: [
        "https://example.com/botanical-illustrations",
        "https://example.com/vintage-plant-prints"
      ]
    },
    {
      id: "t6",
      name: "Okyanus ve Deniz Teması",
      description: "Derin mavi tonları ve dalga desenleri ile deniz ve okyanus temalı sanat eserleri, sakinleştirici etkileri nedeniyle trend oluyor.",
      confidence: 72,
      predictedGrowth: "+18% (3 ay)",
      currentPopularity: "rising",
      targetDemographic: "Sahil severler, 30-55 yaş arası",
      seasonality: "Yaz",
      keywords: ["okyanus", "deniz", "dalga", "mavi", "sahil", "sakinleştirici"],
      examples: [
        "https://example.com/ocean-wave-art",
        "https://example.com/deep-blue-canvas"
      ]
    }
  ]
  
  // Kategoriye göre filtreleme
  let filteredTrends = [...trends]
  
  if (category === "canvas_art") {
    // Canvas Wall Art kategorisi için belirli trendleri vurgula
    filteredTrends = trends.filter(t => 
      t.id === "t1" || t.id === "t2" || t.id === "t3" || t.id === "t6"
    )
  } else if (category === "photography") {
    // Fotoğraf baskıları için trendleri ayarla
    filteredTrends = trends.filter(t => 
      t.id === "t2" || t.id === "t4" || t.id === "t6"
    )
    // Fotoğrafçılık odaklı açıklamalar ekle
    filteredTrends = filteredTrends.map(t => ({
      ...t,
      description: t.description + " Fotoğraf baskıları özellikle popüler."
    }))
  } else if (category === "digital_art") {
    // Dijital sanat için trendleri ayarla
    filteredTrends = trends.filter(t => 
      t.id === "t1" || t.id === "t3" || t.id === "t5"
    )
    // Dijital sanat odaklı açıklamalar ekle
    filteredTrends = filteredTrends.map(t => ({
      ...t,
      description: t.description + " Dijital sanatta bu stil çok rağbet görüyor."
    }))
  }
  
  // Zaman aralığına göre güven düzeyini ayarla
  if (timeRange === "next_30_days") {
    filteredTrends = filteredTrends.map(t => ({
      ...t,
      confidence: Math.min(t.confidence + 8, 100) // Kısa vadeli tahminler daha güvenilir
    }))
  } else if (timeRange === "next_180_days") {
    filteredTrends = filteredTrends.map(t => ({
      ...t,
      confidence: Math.max(t.confidence - 10, 50) // Uzun vadeli tahminler daha az güvenilir
    }))
  }
  
  return filteredTrends
} 