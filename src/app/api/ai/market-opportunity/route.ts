import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest, createUnauthorizedResponse } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { category = "canvas_wall_art", competition = "medium" } = await request.json()
    
    // Kullanıcı doğrulama
    const authResult = await authenticateRequest(request)
    
    if (!authResult) {
      return createUnauthorizedResponse()
    }

    // Pazar fırsatlarını analiz et
    const opportunities = generateMarketOpportunities(category, competition)
    
    return NextResponse.json({
      opportunities,
      category,
      competition,
      timestamp: new Date().toISOString(),
      success: true
    })

  } catch (error) {
    console.error("Market opportunity analysis error:", error)
    
    return NextResponse.json(
      { 
        error: "Pazar fırsatları analiz edilirken hata oluştu",
        success: false 
      },
      { status: 500 }
    )
  }
}

function generateMarketOpportunities(category: string, competition: string) {
  // Fırsat puanı hesaplama faktörleri
  const competitionFactor = competition === "low" ? 1.5 : competition === "high" ? 0.7 : 1.0
  
  // Kategori bazlı fırsatlar
  const baseOpportunities = {
    canvas_wall_art: [
      {
        id: "opp_1",
        title: "Kişiselleştirilmiş Aile Haritaları",
        description: "Aile üyelerinin doğum yerlerini veya önemli şehirleri işaretleyen kişiselleştirilmiş harita canvas'ları, düşük rekabet ve yüksek kişiselleştirme değeri sunuyor.",
        demand: "rising",
        competition: "low",
        profitMargin: "high",
        opportunityScore: 85 * competitionFactor,
        targetAudience: "Aileler, çiftler, hediye arayanlar",
        implementationDifficulty: "medium",
        seasonality: "All year, peaks at holidays",
        keywords: ["custom map", "family map", "personalized canvas", "birth place map"],
        marketGap: "Mevcut ürünler sınırlı kişiselleştirme sunuyor ve çoğu kalitesiz. Yüksek kaliteli, tamamen kişiselleştirilmiş haritalar için pazar açığı var."
      },
      {
        id: "opp_2",
        title: "Astroloji ve Gök Haritası Canvas'ları",
        description: "Doğum anındaki gök haritasını veya özel bir anın yıldız konumlarını gösteren kişiselleştirilmiş astroloji canvas'ları.",
        demand: "high",
        competition: "medium",
        profitMargin: "high",
        opportunityScore: 82 * competitionFactor,
        targetAudience: "25-40 yaş arası kadınlar, astroloji meraklıları",
        implementationDifficulty: "medium",
        seasonality: "All year, peaks at birthdays",
        keywords: ["birth chart", "star map", "constellation art", "astrology gift"],
        marketGap: "Çoğu mevcut ürün temel yıldız haritaları sunuyor. Daha kapsamlı astrolojik yorumlar ve premium tasarımlar için pazar açığı var."
      },
      {
        id: "opp_3",
        title: "Evcil Hayvan Portre Serileri",
        description: "Evcil hayvanların modern, stilize edilmiş portrelerini sunan canvas serileri. Minimalist veya pop-art stilinde tasarımlar.",
        demand: "high",
        competition: "medium-high",
        profitMargin: "medium",
        opportunityScore: 78 * competitionFactor,
        targetAudience: "Evcil hayvan sahipleri, özellikle 25-45 yaş arası",
        implementationDifficulty: "medium",
        seasonality: "All year, peaks at holidays",
        keywords: ["pet portrait", "custom pet art", "dog portrait", "cat portrait"],
        marketGap: "Rekabet yüksek olsa da, çoğu satıcı fotoğraftan direkt kopya yapıyor. Stilize edilmiş, sanatsal yorumlar için bir niş var."
      },
      {
        id: "opp_4",
        title: "Ses Dalgası Sanat Eserleri",
        description: "Özel mesajların, şarkıların veya önemli seslerin dalga formunu görselleştiren kişiselleştirilmiş canvas'lar.",
        demand: "medium",
        competition: "low",
        profitMargin: "high",
        opportunityScore: 76 * competitionFactor,
        targetAudience: "Genç çiftler, müzik severler, yeni ebeveynler",
        implementationDifficulty: "medium-high",
        seasonality: "Peaks at Valentine's Day and anniversaries",
        keywords: ["sound wave art", "voice print", "audio visualization", "song wave"],
        marketGap: "Mevcut ürünlerin çoğu basit ses dalgası gösterimleri. Daha yaratıcı tasarımlar ve yüksek kişiselleştirme için açık var."
      },
      {
        id: "opp_5",
        title: "Vintage Seyahat Posterleri",
        description: "Modern şehirler ve turistik yerleri 1920-1950'lerin vintage poster stiliyle resmeden canvas serisi.",
        demand: "medium",
        competition: "medium",
        profitMargin: "medium-high",
        opportunityScore: 72 * competitionFactor,
        targetAudience: "Seyahat sevenler, 30-60 yaş arası, orta-yüksek gelirli",
        implementationDifficulty: "medium",
        seasonality: "All year, peaks in summer",
        keywords: ["vintage travel poster", "retro city poster", "travel art", "destination print"],
        marketGap: "Popüler turistik yerler dışındaki destinasyonlar için az sayıda kaliteli vintage poster var. Özellikle Türkiye şehirleri için özel bir fırsat olabilir."
      },
      {
        id: "opp_6",
        title: "Mimari Çizim Sanatı",
        description: "Ünlü binaların ve mimari eserlerin teknik çizim stilinde sunulduğu minimal canvas'lar.",
        demand: "medium",
        competition: "low",
        profitMargin: "high",
        opportunityScore: 70 * competitionFactor,
        targetAudience: "Mimarlar, tasarım meraklıları, modern ev dekorasyonu yapanlar",
        implementationDifficulty: "medium-high",
        seasonality: "All year",
        keywords: ["architectural drawing", "blueprint art", "building sketch", "technical drawing"],
        marketGap: "Çoğu mimari sanat eseri fotoğrafik veya çok detaylı. Minimal, teknik çizim stili için bir niş var, özellikle modern evlerde."
      }
    ],
    // Diğer kategoriler eklenebilir
    wall_decor: [
      // Duvar dekorasyonu fırsatları
    ],
    art_prints: [
      // Sanat baskı fırsatları
    ]
  }
  
  // Kategori bazlı fırsat seçimi
  const selectedOpportunities = baseOpportunities[category as keyof typeof baseOpportunities] || baseOpportunities.canvas_wall_art
  
  // Rekabet seviyesine göre sırala
  return selectedOpportunities
    .sort((a, b) => {
      // Rekabet seviyesine göre fırsatları sırala
      return b.opportunityScore - a.opportunityScore
    })
    .map(opportunity => {
      // Rekabet durumuna göre fırsat açıklamasını güncelle
      let marketInsight = ""
      
      if (competition === "high") {
        marketInsight = "Yüksek rekabetli bir pazarda, ürün kalitesi ve benzersiz tasarım odaklı bir strateji izlemeniz önerilir."
      } else if (competition === "low") {
        marketInsight = "Düşük rekabetli bu alanda, hızlı giriş yaparak pazarı erkenden yakalama fırsatınız var."
      } else {
        marketInsight = "Orta seviye rekabette, doğru konumlandırma ve kişiselleştirme ile öne çıkabilirsiniz."
      }
      
      return {
        ...opportunity,
        marketInsight
      }
    })
} 