// /app/api/ai/select-category/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  console.log("🚀 ENDPOINT ÇAĞRILDI - select-category");
  
  try {
    const { title, categoryNames } = await request.json()

    console.log("📝 Gelen parametreler:");
    console.log("- Title:", title);
    console.log("- Categories:", categoryNames?.length || 0, "adet");

    // Basit validasyonlar
    if (!title) {
      console.error("❌ HATA: Başlık bulunamadı");
      return NextResponse.json(
        { error: "Başlık bulunamadı" },
        { status: 400 }
      )
    }

    if (!categoryNames || !Array.isArray(categoryNames) || categoryNames.length === 0) {
      console.error("❌ HATA: Kategoriler bulunamadı");
      return NextResponse.json(
        { error: "Kategoriler bulunamadı" },
        { status: 400 }
      )
    }

    // OpenAI API key kontrolü
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      console.error("❌ HATA: OPENAI_API_KEY environment variable bulunamadı");
      return NextResponse.json(
        { error: "OpenAI API key yapılandırılmamış" },
        { status: 500 }
      )
    }

    console.log("✅ API key mevcut");

    // Kategori seçimi için prompt oluştur
    const categoryPrompt = `
You are an expert Etsy category classifier.

Given a product title and a list of available categories, select the MOST appropriate category.

Product Title: "${title}"

Available Categories:
${categoryNames.map((cat: string, i: number) => `${i + 1}. ${cat}`).join('\n')}

Rules:
- Analyze the title for subject matter, style, and target audience
- Return ONLY the exact category name from the provided list
- If multiple categories could work, pick the most specific one
- Consider buyer search patterns and Etsy conventions

Return ONLY the category name, nothing else.
`.trim();

    console.log("🤖 OpenAI API çağrısı yapılıyor...");
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: categoryPrompt
          }
        ],
        max_tokens: 50,
        temperature: 0.1
      })
    })

    console.log("📥 OpenAI API yanıtı alındı - Status:", openaiResponse.status);

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error("❌ OpenAI API HATASI:");
      console.error("Status:", openaiResponse.status);
      console.error("Error:", errorText);
      
      return NextResponse.json(
        { error: `OpenAI API hatası (${openaiResponse.status}): ${errorText}` },
        { status: 500 }
      )
    }

    const openaiData = await openaiResponse.json()
    console.log("✅ OpenAI yanıtı alındı:", openaiData);

    const selectedCategory = openaiData.choices?.[0]?.message?.content?.trim()
    
    if (!selectedCategory) {
      console.error("❌ HATA: OpenAI yanıtında kategori bulunamadı");
      console.error("Full response:", openaiData);
      return NextResponse.json(
        { error: "OpenAI yanıtında kategori bulunamadı" },
        { status: 500 }
      )
    }

    console.log("🎉 KATEGORİ BAŞARIYLA SEÇİLDİ:", selectedCategory);

    // Token kullanım bilgilerini JSON olarak döndür
    return NextResponse.json({
      category: selectedCategory,
      success: true,
      usage: openaiData.usage ? {
        prompt_tokens: openaiData.usage.prompt_tokens,
        completion_tokens: openaiData.usage.completion_tokens,
        total_tokens: openaiData.usage.total_tokens
      } : null
    });

  } catch (error: any) {
    console.error("💥 ENDPOINT HATASI:");
    console.error("Error type:", typeof error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Full error:", error);

    return NextResponse.json(
      { 
        error: "Kategori seçilemedi",
        details: error.message,
        type: typeof error
      },
      { status: 500 }
    )
  }
}