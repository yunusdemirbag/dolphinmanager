// /app/api/ai/generate-all/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { generateAllFromImage } from '@/lib/openai-yonetim'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  console.log("🚀 ENDPOINT ÇAĞRILDI - generate-all");
  
  try {
    // JSON body'yi oku
    const { imageBase64, imageType, prompt, requestType } = await request.json()

    console.log("📝 Gelen parametreler:");
    console.log("- ImageBase64 length:", imageBase64 ? imageBase64.length : 0);
    console.log("- ImageType:", imageType);
    console.log("- Prompt length:", prompt ? prompt.length : 0);
    console.log("- Request type:", requestType || "normal");

    // Basit validasyonlar
    if (!imageBase64) {
      console.error("❌ HATA: Base64 resim bulunamadı");
      return NextResponse.json(
        { error: "Resim verisi eksik" },
        { status: 400 }
      )
    }

    if (!imageType) {
      console.error("❌ HATA: Resim tipi bulunamadı");
      return NextResponse.json(
        { error: "Resim tipi eksik" },
        { status: 400 }
      )
    }

    console.log("✅ Parametreler geçerli, OpenAI işlemi başlatılıyor...");

    // OpenAI API key kontrolü
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new Error("OpenAI API key yapılandırılmamış");
    }

    // OpenAI API çağrısı
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt || "Analyze this image and create a descriptive title for an Etsy canvas wall art product."
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${imageType};base64,${imageBase64}`,
                  detail: 'low'
                }
              }
            ]
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI API hatası (${openaiResponse.status}): ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    const result = openaiData.choices?.[0]?.message?.content?.trim();
    
    if (!result) {
      throw new Error("OpenAI yanıtında içerik bulunamadı");
    }

    console.log("🎉 İŞLEM BAŞARILI!");
    console.log("Sonuç:", result);

    return NextResponse.json({
      result: result,
      title: result, // Uyumluluk için
      analysis: {
        title: result // Uyumluluk için
      },
      success: true,
      requestType: requestType || "normal",
      usage: openaiData.usage ? {
        prompt_tokens: openaiData.usage.prompt_tokens,
        completion_tokens: openaiData.usage.completion_tokens,
        total_tokens: openaiData.usage.total_tokens
      } : null
    })

  } catch (error: any) {
    console.error("💥 ENDPOINT HATASI:");
    console.error("Error type:", typeof error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Full error:", error);

    return NextResponse.json(
      { 
        error: "İçerik üretme hatası",
        details: error.message,
        type: typeof error
      },
      { status: 500 }
    )
  }
}