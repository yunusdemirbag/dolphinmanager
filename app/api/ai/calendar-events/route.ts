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
        source: "error",
        events: []
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
          events: []
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
          events: []
        })
      }
    } catch (aiError) {
      console.error("AI generation error:", aiError)
      return NextResponse.json({
        success: false,
        source: "fallback",
        events: []
      })
    }

  } catch (error) {
    console.error("Calendar events API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 