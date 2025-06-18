import { NextRequest, NextResponse } from "next/server"
import { generateAllFromImage } from "@/lib/openai-yonetim"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    const prompt = formData.get('prompt') as string;
    const focusKeyword = formData.get('focusKeyword') as string;
    const model = formData.get('model') as string || 'gpt-4.1-mini';
    const temperature = parseFloat((formData.get('temperature') as string) || '0.7');
    
    if (!image) {
      return NextResponse.json({ error: 'Resim bulunamadı' }, { status: 400 });
    }
    
    // Resmi base64 formatına dönüştür
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');
    const imageType = image.type;
    
    // Prompt'u hazırla
    let finalPrompt = prompt;
    if (focusKeyword) {
      finalPrompt = `${prompt}\n\nFOCUS KEYWORD: "${focusKeyword}"`;
    }
    
    // OpenAI API çağrısı
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({ error: 'OpenAI API key yapılandırılmamış' }, { status: 500 });
    }
    
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
            content: [
              {
                type: 'text',
                text: finalPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${imageType};base64,${base64Image}`,
                  detail: 'low'
                }
              }
            ]
          }
        ],
        max_tokens: 150,
        temperature: temperature
      })
    });
    
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      return NextResponse.json({ error: `OpenAI API hatası: ${errorText}` }, { status: 500 });
    }
    
    const openaiData = await openaiResponse.json();
    const title = openaiData.choices?.[0]?.message?.content?.trim();
    
    if (!title) {
      return NextResponse.json({ error: 'Başlık üretilemedi' }, { status: 500 });
    }
    
    return NextResponse.json({
      title,
      success: true,
      usage: openaiData.usage ? {
        prompt_tokens: openaiData.usage.prompt_tokens,
        completion_tokens: openaiData.usage.completion_tokens,
        total_tokens: openaiData.usage.total_tokens,
        duration_ms: Date.now() - (request.headers.get('x-request-start') ? parseInt(request.headers.get('x-request-start') || '0') : 0)
      } : null
    });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Bilinmeyen bir hata oluştu' }, { status: 500 });
  }
} 