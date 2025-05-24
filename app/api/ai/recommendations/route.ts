import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const { salesData, businessType, currentDate } = await request.json()

    const prompt = `
Sen bir Etsy canvas wall art uzmanısın. Aşağıdaki satış verilerine göre öneriler ver:

Satış Verileri:
- Ürün sayısı: ${salesData?.products?.length || 0}
- Sipariş sayısı: ${salesData?.orders?.length || 0}
- İş türü: ${businessType}
- Tarih: ${currentDate}

Canvas wall art satışı için öneriler ver. Özellikle şunlara odaklan:
1. Popüler boyutlar (8x10, 12x16, 16x20, 24x36 inch)
2. Trend olan stiller (minimalist, boho, modern, vintage)
3. Mevsimsel öneriler
4. Renk trendleri
5. Hedef kitle analizi

JSON formatında yanıt ver:
{
  "recommendations": [
    {
      "type": "size|style|seasonal|marketing|product",
      "title": "Kısa başlık",
      "description": "Detaylı açıklama",
      "confidence": 1-100 arası sayı
    }
  ]
}
`

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: prompt,
      maxTokens: 1000,
    })

    // JSON parse et
    let recommendations
    try {
      recommendations = JSON.parse(text)
    } catch {
      // Fallback öneriler
      recommendations = {
        recommendations: [
          {
            type: "size",
            title: "16x20 inch boyutu öne çıkarın",
            description: "Bu boyut ev dekorasyonu için ideal ve en çok tercih edilen boyutlardan biri.",
            confidence: 85,
          },
          {
            type: "style",
            title: "Minimalist tasarımlar trend",
            description: "Sade çizgiler ve az renk kullanımı modern evlerde çok popüler.",
            confidence: 78,
          },
          {
            type: "seasonal",
            title: "Kış temalı koleksiyon hazırlayın",
            description: "Kar manzaraları, sıcak tonlar ve kış atmosferi içeren tasarımlar.",
            confidence: 72,
          },
          {
            type: "marketing",
            title: "Set halinde satış yapın",
            description: "2-3 parçalık uyumlu tasarım setleri daha yüksek değerde satılıyor.",
            confidence: 80,
          },
        ],
      }
    }

    return NextResponse.json(recommendations)
  } catch (error) {
    console.error("AI recommendation error:", error)
    return NextResponse.json({ error: "AI önerileri alınamadı" }, { status: 500 })
  }
}
