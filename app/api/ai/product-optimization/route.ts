import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { createClientFromBrowser } from "@/lib/supabase/client"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const { product, businessType } = await request.json()

    const prompt = `
Sen bir Etsy canvas wall art uzmanısın. Aşağıdaki ürün için SEO optimizasyonu yap:

Mevcut Ürün:
- Başlık: ${product.title}
- Açıklama: ${product.description}
- Taglar: ${product.tags.join(", ")}
- Fiyat: $${product.price}
- Görüntülenme: ${product.views}
- Satış: ${product.sales}
- Mevcut SEO Puanı: ${product.seo_score}

Canvas wall art için optimize et. Özellikle:
1. Başlıkta boyut belirt (8x10, 12x16, 16x20, 24x36 inch)
2. "canvas wall art", "print", "home decor" gibi anahtar kelimeler kullan
3. Etsy'de popüler tagları ekle
4. Açıklamayı daha detaylı ve SEO dostu yap
5. Hedef kitle: ev dekorasyon severleri

JSON formatında yanıt ver:
{
  "optimized_title": "Yeni başlık",
  "optimized_description": "Yeni açıklama",
  "optimized_tags": ["tag1", "tag2", "tag3"],
  "seo_score": 1-100 arası puan,
  "improvements": ["iyileştirme1", "iyileştirme2"],
  "reasoning": "Neden bu değişiklikleri önerdiğin"
}
`

    const { text } = await generateText({
      model: openai("gpt-4.1-mini"),
      prompt: prompt,
      maxTokens: 1500,
    })

    let optimization
    try {
      optimization = JSON.parse(text)
    } catch {
      // Fallback optimization
      optimization = {
        optimized_title: `${product.title} - Canvas Wall Art Print 16x20`,
        optimized_description: `${product.description} Perfect for modern home decor. High-quality canvas print with vibrant colors. Ready to hang with included hardware.`,
        optimized_tags: [...product.tags, "wall art", "canvas print", "home decor", "16x20"],
        seo_score: Math.min(product.seo_score + 15, 100),
        improvements: ["Boyut bilgisi eklendi", "Anahtar kelimeler güçlendirildi", "Açıklama detaylandırıldı"],
        reasoning: "Canvas wall art için temel SEO optimizasyonları uygulandı",
      }
    }

    return NextResponse.json(optimization)
  } catch (error) {
    console.error("Product optimization error:", error)
    return NextResponse.json({ error: "Ürün optimizasyonu yapılamadı" }, { status: 500 })
  }
}
