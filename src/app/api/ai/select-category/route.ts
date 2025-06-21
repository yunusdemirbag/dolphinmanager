// /app/api/ai/select-category/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  console.log("🚀 ENDPOINT ÇAĞRILDI - select-category");
  
  try {
    const body = await request.json()
    const { title, categoryNames, prompt, model = 'gpt-4.1-mini', temperature = 0.7 } = body

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

    // Kategori listesini formatlı bir şekilde hazırla
    const formattedCategories = categoryNames.map(cat => `- ${cat}`).join('\n');
    
    // Prompt'u hazırla
    const finalPrompt = `${prompt}\n\nProduct Title: "${title}"\n\nAvailable Categories:\n${formattedCategories}\n\nSelect the most appropriate category from the list above:`;

    console.log("🤖 OpenAI API çağrısı yapılıyor...");
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: finalPrompt
          }
        ],
        max_tokens: 50,
        temperature: temperature
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

    // Seçilen kategori gerçekten listede var mı kontrol et
    const normalizedSelectedCategory = selectedCategory.toLowerCase().trim();
    const normalizedCategoryNames = categoryNames.map(cat => cat.toLowerCase().trim());
    
    // Eğer tam eşleşme yoksa, en yakın eşleşmeyi bul
    let finalCategory = categoryNames[0]; // Varsayılan olarak ilk kategoriyi kullan
    
    for (const cat of categoryNames) {
      if (cat.toLowerCase().trim() === normalizedSelectedCategory) {
        finalCategory = cat; // Tam eşleşme bulundu
        break;
      }
    }
    
    // Eğer tam eşleşme yoksa, içeren bir kategori ara
    if (finalCategory === categoryNames[0]) {
      for (const cat of categoryNames) {
        if (normalizedSelectedCategory.includes(cat.toLowerCase().trim()) || 
            cat.toLowerCase().trim().includes(normalizedSelectedCategory)) {
          finalCategory = cat;
          break;
        }
      }
    }

    return NextResponse.json({
      category: finalCategory,
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