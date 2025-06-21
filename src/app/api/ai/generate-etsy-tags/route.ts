// /app/api/ai/generate-etsy-tags/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  console.log("🚀 ENDPOINT ÇAĞRILDI - generate-etsy-tags");
  
  try {
    let title = '';
    let prompt = '';
    let imageBase64 = '';
    let imageType = '';
    let model = 'gpt-4.1-mini';
    let temperature = 0.7;

    // İstek türüne göre parametreleri al
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      // Form data isteği
      const formData = await request.formData();
      title = formData.get('title') as string;
      prompt = formData.get('prompt') as string;
      model = formData.get('model') as string || 'gpt-4.1-mini';
      temperature = parseFloat((formData.get('temperature') as string) || '0.7');
      
      const image = formData.get('image') as File;
      if (image) {
        const bytes = await image.arrayBuffer();
        const buffer = Buffer.from(bytes);
        imageBase64 = buffer.toString('base64');
        imageType = image.type;
      }
    } else {
      // JSON isteği
      const body = await request.json();
      title = body.title;
      prompt = body.prompt;
      model = body.model || 'gpt-4.1-mini';
      temperature = body.temperature || 0.7;
    }

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

    if (!prompt) {
      console.error("❌ HATA: Prompt bulunamadı");
      return NextResponse.json(
        { error: "Prompt bulunamadı" },
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

    // Mesaj içeriğini hazırla
    const content: any[] = [
      {
        type: 'text',
        text: `${prompt}\n\nTITLE: "${title}"`
      }
    ];

    // Eğer resim varsa ekle
    if (imageBase64 && imageType) {
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:${imageType};base64,${imageBase64}`,
          detail: 'low'
        }
      });
    }

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
            content: content
          }
        ],
        max_tokens: 150,
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
    const tokenUsage = openaiData.usage || {};

    return NextResponse.json({
      tags: tagArray,
      success: true,
      count: tagArray.length,
      prompt_tokens: tokenUsage.prompt_tokens,
      completion_tokens: tokenUsage.completion_tokens,
      total_tokens: tokenUsage.total_tokens
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