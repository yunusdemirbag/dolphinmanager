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

    // generateAllFromImage fonksiyonunu çağır
    const result = await generateAllFromImage(imageBase64, imageType, prompt);
    
    console.log("🎉 İŞLEM BAŞARILI!");
    console.log("Sonuç:", result);

    return NextResponse.json({
      result: result,
      title: result, // Uyumluluk için
      analysis: {
        title: result // Uyumluluk için
      },
      success: true,
      requestType: requestType || "normal"
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