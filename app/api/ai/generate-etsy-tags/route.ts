// /app/api/ai/generate-etsy-tags/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  console.log("🚀 ENDPOINT ÇAĞRILDI - generate-etsy-tags");
  
  try {
    const { title, prompt } = await request.json()

    console.log("📝 Gelen parametreler:");
    console.log("- Title:", title);
    console.log("- Prompt length:", prompt ? prompt.length : 0);

    // Basit validasyonlar
    if (!title) {
      console.error("❌ HATA: Başlık bulunamadı");
      return NextResponse.json(
        { error: "Başlık bulunamadı" },
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

    // Tag üretimi için prompt
    const tagPrompt = prompt || `
You are an Etsy canvas wall art SEO expert.

1. Based on the product title "${title}", craft exactly 13 tags.
2. Each tag MUST be ≤ 19 characters including spaces (use 2–3 word phrases).
3. Use only lowercase letters, no punctuation except spaces.
4. Do NOT repeat words more than twice across all tags.
5. Cover: subject, style, colors, mood, intended room, gift occasion.
6. Separate tags with commas, no quotes.

Return ONLY the 13 tags in one line, comma-separated.
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
            content: tagPrompt
          }
        ],
        max_tokens: 100,
        temperature: 0.7
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

    const generatedTags = openaiData.choices?.[0]?.message?.content?.trim()
    
    if (!generatedTags) {
      console.error("❌ HATA: OpenAI yanıtında tag bulunamadı");
      console.error("Full response:", openaiData);
      return NextResponse.json(
        { error: "OpenAI yanıtında tag bulunamadı" },
        { status: 500 }
      )
    }

    // Tag'leri virgülle ayır ve temizle
    const tagArray = generatedTags
      .split(',')
      .map((tag: string) => tag.trim().toLowerCase())
      .filter((tag: string) => tag.length > 0 && tag.length <= 19)
      .slice(0, 13); // Maksimum 13 tag

    console.log("🎉 TAG'LER BAŞARIYLA ÜRETİLDİ:", tagArray);

    // Token kullanım bilgilerini yanıta ekle
    return NextResponse.json({
      tags: tagArray,
      success: true,
      count: tagArray.length,
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
        error: "Tag üretilemedi",
        details: error.message,
        type: typeof error
      },
      { status: 500 }
    )
  }
}