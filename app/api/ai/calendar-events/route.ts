import { NextRequest, NextResponse } from "next/server"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const { currentDate } = await request.json()
    
    const today = currentDate ? new Date(currentDate) : new Date()
    const currentMonth = today.getMonth() + 1
    const currentYear = today.getFullYear()
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: false,
        source: "fallback",
        events: getFallbackEvents(today)
      })
    }

    const prompt = `Sen bir fiziksel Canvas Wall Art Print işletmesi için takvim uzmanısın. Bugünün tarihi: ${today.toLocaleDateString('tr-TR')}

Önümüzdeki 6 ay içinde Canvas Wall Art Print satışları için önemli olan tarihleri ve etkinlikleri listele. Her etkinlik için şunları belirt:

1. Tarih (YYYY-MM-DD formatında)
2. Etkinlik adı
3. Canvas Wall Art Print işletmesi için neden önemli olduğu (detaylı açıklama)
4. Önerilen tasarım temaları (4-5 adet)
5. Önerilen renk paletleri (4-5 adet)
6. Kaç gün kaldığı
7. Öncelik seviyesi (high/medium/low)
8. İş etkisi açıklaması (satış potansiyeli, müşteri davranışları vb.)

Önemli tarihler:
- Resmi tatiller (Sevgililer Günü, Anneler Günü, Babalar Günü, Noel vb.)
- Mevsim geçişleri
- Özel günler (Dünya Kadınlar Günü, Öğretmenler Günü vb.)
- Ticari fırsatlar (Black Friday, Cyber Monday vb.)
- Ev dekorasyonu trendleri

Sadece JSON formatında yanıt ver:
{
  "events": [
    {
      "date": "YYYY-MM-DD",
      "name": "Etkinlik Adı",
      "description": "Canvas Wall Art Print işletmesi için detaylı açıklama",
      "themes": ["tema1", "tema2", "tema3", "tema4"],
      "colors": ["renk1", "renk2", "renk3", "renk4"],
      "daysUntil": sayı,
      "priority": "high|medium|low",
      "businessImpact": "Detaylı satış etkisi açıklaması"
    }
  ]
}`

    try {
      // AI SDK kullanarak OpenAI'a istek gönder
      const { generateText } = await import('ai')
      
      const result = await generateText({
        model: openai('gpt-4'),
        prompt: prompt,
        temperature: 0.7,
        maxTokens: 3000
      })

      const aiResponse = result.text
      
      if (!aiResponse) {
        return NextResponse.json({
          success: false,
          source: "fallback",
          events: getFallbackEvents(today)
        })
      }

      try {
        const parsedResponse = JSON.parse(aiResponse)
        
        // Tarihleri doğrula ve gün sayısını hesapla
        const validatedEvents = parsedResponse.events.map((event: any) => {
          const eventDate = new Date(event.date)
          const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          
          return {
            ...event,
            daysUntil: daysUntil > 0 ? daysUntil : 0
          }
        }).filter((event: any) => event.daysUntil > 0) // Sadece gelecekteki etkinlikler
        
        return NextResponse.json({
          success: true,
          source: "openai",
          events: validatedEvents.slice(0, 8), // En fazla 8 etkinlik
          lastUpdate: new Date().toISOString()
        })
        
      } catch (parseError) {
        console.error("AI response parse error:", parseError)
        return NextResponse.json({
          success: false,
          source: "fallback",
          events: getFallbackEvents(today)
        })
      }
    } catch (aiError) {
      console.error("AI generation error:", aiError)
      return NextResponse.json({
        success: false,
        source: "fallback",
        events: getFallbackEvents(today)
      })
    }

  } catch (error) {
    console.error("Calendar events API error:", error)
    const today = new Date() // Fallback için today tanımla
    return NextResponse.json({
      success: false,
      source: "fallback", 
      events: getFallbackEvents(today)
    })
  }
}

function getFallbackEvents(today: Date) {
  const currentYear = today.getFullYear()
  const nextYear = currentYear + 1
  
  const events = [
    {
      date: `${currentYear}-12-25`,
      name: "Noel",
      description: "Yılın en büyük hediye verme sezonu. Canvas Wall Art Print ürünleri ev dekorasyonu ve hediye kategorisinde yoğun talep görür.",
      themes: ["Kış manzaraları", "Noel ağacı tasarımları", "Kar taneleri ve kristaller", "Sıcak ev atmosferi", "Tatil coşkusu"],
      colors: ["Kırmızı", "Yeşil", "Altın", "Beyaz", "Gümüş"],
      daysUntil: Math.ceil((new Date(`${currentYear}-12-25`).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
      priority: "high",
      businessImpact: "Yılın en yüksek satış dönemlerinden biri. %300-400 satış artışı beklenir. Hediye paketleme ve hızlı teslimat kritik."
    },
    {
      date: `${nextYear}-02-14`,
      name: "Sevgililer Günü",
      description: "Romantik hediye kategorisinde Canvas Wall Art Print ürünleri çok popüler. Çiftler için özel tasarımlar yoğun ilgi görür.",
      themes: ["Aşk sözleri ve quotes", "Kalp şekilli tasarımlar", "Çift portreleri", "Romantik manzaralar", "Minimalist aşk sembolleri"],
      colors: ["Kırmızı", "Pembe", "Altın", "Beyaz", "Pastel tonlar"],
      daysUntil: Math.ceil((new Date(`${nextYear}-02-14`).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
      priority: "high",
      businessImpact: "Hediye alışverişi için yoğun dönem. %200-250 satış artışı. Kişiselleştirme seçenekleri önemli."
    },
    {
      date: `${nextYear}-03-08`,
      name: "Dünya Kadınlar Günü",
      description: "Güçlü kadın temalı ve motivasyonel Canvas Wall Art Print tasarımları bu dönemde çok aranır.",
      themes: ["Kadın gücü sembolleri", "Motivasyonel sözler", "Çiçek motifleri", "Güçlü kadın portreleri", "İlham verici quotes"],
      colors: ["Mor", "Pembe", "Altın", "Beyaz", "Lavanta"],
      daysUntil: Math.ceil((new Date(`${nextYear}-03-08`).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
      priority: "medium",
      businessImpact: "Kadın müşteriler için özel koleksiyon fırsatı. %150-180 satış artışı beklenir."
    },
    {
      date: `${nextYear}-03-21`,
      name: "Bahar Başlangıcı",
      description: "Ev dekorasyonu yenileme sezonu başlar. Doğa ve yenilenme temalı Canvas Wall Art Print ürünleri trend olur.",
      themes: ["Çiçek bahçeleri", "Yeşil doğa manzaraları", "Pastel renk paletleri", "Yenilenme sembolleri", "Botanik illüstrasyonlar"],
      colors: ["Yeşil", "Pembe", "Sarı", "Açık mavi", "Lavanta"],
      daysUntil: Math.ceil((new Date(`${nextYear}-03-21`).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
      priority: "medium",
      businessImpact: "Ev dekorasyonu yenileme sezonu. %120-150 satış artışı. Büyük boyutlu canvas'lar daha çok tercih edilir."
    },
    {
      date: `${nextYear}-05-12`,
      name: "Anneler Günü",
      description: "Anne sevgisi ve aile temalı Canvas Wall Art Print ürünleri için yılın en önemli hediye dönemlerinden biri.",
      themes: ["Anne ile ilgili sözler", "Aile ağacı tasarımları", "Çiçek buketleri", "Sıcak aile anları", "Vintage aile fotoğrafları"],
      colors: ["Pastel pembe", "Lavanta", "Krem", "Soft yeşil", "Altın"],
      daysUntil: Math.ceil((new Date(`${nextYear}-05-12`).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
      priority: "high",
      businessImpact: "Hediye kategorisinde yüksek satış potansiyeli. %250-300 satış artışı. Kişiselleştirme çok önemli."
    },
    {
      date: `${nextYear}-06-21`,
      name: "Yaz Başlangıcı",
      description: "Yazlık ev dekorasyonu ve tatil temalı Canvas Wall Art Print ürünleri için ideal dönem.",
      themes: ["Plaj manzaraları", "Tropikal bitkiler", "Deniz dalgaları", "Güneş ışığı efektleri", "Tatil anıları"],
      colors: ["Turkuaz", "Sarı", "Turuncu", "Beyaz", "Deniz mavisi"],
      daysUntil: Math.ceil((new Date(`${nextYear}-06-21`).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
      priority: "medium",
      businessImpact: "Yazlık ev dekorasyonu için talep artışı. %130-160 satış artışı. Büyük formatlar popüler."
    },
    {
      date: `${nextYear}-06-16`,
      name: "Babalar Günü",
      description: "Baba temalı ve maskülen tasarımlar için özel hediye dönemi. Canvas Wall Art Print erkek müşteriler için.",
      themes: ["Baba sözleri", "Vintage arabalar", "Spor temaları", "Doğa ve dağ manzaraları", "Minimalist erkek tasarımları"],
      colors: ["Lacivert", "Kahverengi", "Gri", "Siyah", "Koyu yeşil"],
      daysUntil: Math.ceil((new Date(`${nextYear}-06-16`).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
      priority: "high",
      businessImpact: "Erkek odaklı hediye kategorisi. %180-220 satış artışı. Büyük boyutlar ve çerçeveli seçenekler önemli."
    },
    {
      date: `${nextYear}-11-29`,
      name: "Black Friday",
      description: "Yılın en büyük indirim günü. Canvas Wall Art Print ürünleri için büyük satış fırsatı.",
      themes: ["Tüm kategoriler", "Popüler tasarımlar", "Bestseller ürünler", "Set halinde satışlar", "Hediye paketleri"],
      colors: ["Tüm renkler", "Popüler paletler", "Klasik kombinasyonlar", "Trend renkler", "Nötr tonlar"],
      daysUntil: Math.ceil((new Date(`${nextYear}-11-29`).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
      priority: "high",
      businessImpact: "Yılın en yüksek satış günü. %500-600 satış artışı. Stok yönetimi ve lojistik hazırlığı kritik."
    }
  ]
  
  // Sadece gelecekteki etkinlikleri döndür ve yakın olanlara göre sırala
  return events
    .filter(event => event.daysUntil > 0)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 8)
} 