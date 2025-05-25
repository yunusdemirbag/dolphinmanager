import { NextRequest, NextResponse } from "next/server"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

export async function POST(request: NextRequest) {
  try {
    const { businessType, userProfile } = await request.json()

    if (!OPENAI_API_KEY) {
      console.log("OpenAI API key not found, using fallback recommendations")
      // Fallback recommendations will be used below
    }

    const prompt = `Sen canvas wall art satışı konusunda uzman bir AI asistanısın. 
    
Kullanıcı Profili:
- İsim: ${userProfile.name}
- Yaş: ${userProfile.age}
- Deneyim: ${userProfile.experience}
- Odak: ${userProfile.focus}

Canvas wall art satışları için 5 adet pratik ve uygulanabilir öneri ver. Her öneri şu formatta olsun:

{
  "id": "unique_id",
  "type": "size|style|theme|seo|seasonal",
  "title": "Kısa başlık",
  "description": "Detaylı açıklama ve neden önemli olduğu",
  "confidence": 70-95 arası sayı,
  "priority": "high|medium|low",
  "data": { ilgili_veri }
}

Öneriler canvas wall art satışlarına özel olsun:
- Popüler boyutlar (8x10, 12x16, 16x20, 24x36 inch)
- Trend stiller (minimalist, boho, modern, vintage)
- Popüler temalar (doğa, motivasyonel, geometrik, hayvan)
- SEO optimizasyonu (wall art, canvas print, home decor kelimeleri)
- Mevsimsel fırsatlar

Sadece JSON array döndür, başka açıklama ekleme.`

    if (OPENAI_API_KEY) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: "Sen canvas wall art satışı konusunda uzman bir AI asistanısın. Sadece JSON formatında yanıt ver."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 1500
          })
        })

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.statusText}`)
        }

        const data = await response.json()
        const aiResponse = data.choices[0]?.message?.content
        
        if (!aiResponse) {
          throw new Error("AI'dan yanıt alınamadı")
        }

        try {
          const recommendations = JSON.parse(aiResponse)
          
          return NextResponse.json({
            recommendations: Array.isArray(recommendations) ? recommendations : [recommendations],
            success: true,
            userProfile: userProfile,
            timestamp: new Date().toISOString(),
            source: "openai"
          })
        } catch (parseError) {
          console.error("AI yanıtı parse edilemedi:", parseError)
          throw parseError
        }

      } catch (openaiError) {
        console.error("OpenAI API hatası:", openaiError)
        
        // Fallback recommendations
        const fallbackRecommendations = [
          {
            id: "1",
            type: "size",
            title: "16x20 inch boyutu çok popüler",
            description: `Merhaba ${userProfile.name}! 16x20 inch boyutu ev dekorasyonu için ideal. Yatak odası ve oturma odası duvarları için mükemmel. Kargo maliyeti de uygun ve müşteriler bu boyutu tercih ediyor.`,
            confidence: 88,
            priority: "high",
            data: { size: "16x20", popularity: "high" }
          },
          {
            id: "2",
            type: "style",
            title: "Minimalist tasarımlar trend",
            description: "Sade, temiz çizgiler ve az renk kullanımı 2024'te çok popüler. Özellikle 25-35 yaş arası demografik bu stili tercih ediyor. Canvas wall art'ta minimalist yaklaşım satışları artırıyor.",
            confidence: 85,
            priority: "high",
            data: { style: "minimalist", target: "young_adults" }
          },
          {
            id: "3",
            type: "theme",
            title: "Doğa teması her zaman satıyor",
            description: "Dağ manzaraları, orman görselleri ve botanik desenler evlerde huzur yaratıyor. Yeşil tonları özellikle popüler. Canvas'ta doğa teması %40 daha fazla görüntüleniyor.",
            confidence: 82,
            priority: "medium",
            data: { theme: "nature", colors: ["green", "brown", "beige"] }
          },
          {
            id: "4",
            type: "seo",
            title: "SEO anahtar kelimelerinizi güçlendirin",
            description: "Başlıklarınızda 'wall art', 'canvas print', 'home decor' kelimelerini kullanın. Boyut bilgisini de eklemeyi unutmayın. Bu kelimeler Etsy'de arama hacmi yüksek.",
            confidence: 92,
            priority: "high",
            data: { keywords: ["wall art", "canvas print", "home decor", "wall decoration"] }
          },
          {
            id: "5",
            type: "seasonal",
            title: "Kış teması için hazırlık zamanı",
            description: "Kar manzaraları, sıcak tonlar ve cozy home temalı tasarımlar kış aylarında çok satıyor. Şimdiden hazırlık yapın. Kış teması %60 daha fazla satış getiriyor.",
            confidence: 79,
            priority: "medium",
            data: { season: "winter", themes: ["snow", "cozy", "warm_colors"] }
          }
        ]

        // Kullanıcı yaşına göre önerileri kişiselleştir
        if (userProfile.age < 30) {
          fallbackRecommendations.push({
            id: "6",
            type: "theme",
            title: "Motivasyonel quotes genç demografiye hitap ediyor",
            description: "Yaşınız göz önüne alındığında, motivasyonel ve ilham verici sözler içeren canvas'lar çok popüler. Özellikle Instagram'da paylaşılabilir tasarımlar tercih ediliyor.",
            confidence: 86,
            priority: "high",
            data: { theme: "motivational", target: "young" }
          })
        }
        
        return NextResponse.json({
          recommendations: fallbackRecommendations,
          success: true,
          userProfile: userProfile,
          timestamp: new Date().toISOString(),
          source: "fallback"
        })
      }
    } else {
      // If OpenAI API key is not available, use fallback recommendations
      // Fallback recommendations will be used below
    }

  } catch (error) {
    console.error("AI recommendations error:", error)
    
    return NextResponse.json(
      { 
        error: "AI önerileri alınırken hata oluştu",
        success: false 
      },
      { status: 500 }
    )
  }
} 