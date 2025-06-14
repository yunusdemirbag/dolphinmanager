import { NextRequest, NextResponse } from "next/server"
import { descriptionPrompt } from "@/lib/prompts"
import { supabaseAdmin } from "@/lib/supabase"
import { getUser } from "@/lib/auth"

export const runtime = "edge"

// API istek loglarını veritabanına kaydetmek için yardımcı fonksiyon
async function logApiRequest(endpoint: string, userId: string | null, success: boolean, durationMs: number, details?: any) {
  try {
    await supabaseAdmin
      .from("api_logs")
      .insert({
        endpoint,
        user_id: userId,
        timestamp: new Date().toISOString(),
        success,
        duration_ms: durationMs,
        details
      });
    console.log(`API log kaydedildi: ${endpoint}, başarı: ${success}, süre: ${durationMs}ms`);
  } catch (error) {
    console.error("API log kaydederken hata:", error);
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let userId = null;
  let success = false;
  
  try {
    // Kullanıcı kimliğini al
    try {
      const user = await getUser();
      userId = user?.id || null;
    } catch (error) {
      console.error("Kullanıcı kimliği alınamadı:", error);
    }
    
    const body = await req.json();
    const { title, image } = body;
    
    if (!title) {
      // Log API request with error
      await logApiRequest(
        "/api/ai/generate-etsy-description", 
        userId, 
        false, 
        Date.now() - startTime, 
        { error: "Başlık gerekli" }
      );
      
      return NextResponse.json({ error: "Başlık gerekli" }, { status: 400 });
    }
    
    // Açıklama için prompt hazırla
    let prompt = descriptionPrompt.prompt.replace("${title}", title);
    const apiKey = process.env.OPENAI_API_KEY;
    // Görsel varsa daima gpt-3.5 kullan
    if (image) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that generates detailed product descriptions for Etsy listings.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt,
                },
                image ? {
                  type: "image_url",
                  image_url: {
                    url: image,
                  },
                } : null,
              ].filter(Boolean),
            },
          ],
          temperature: 0.7,
          max_tokens: 800,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("OpenAI Vision API error:", error);
        
        // Log API request with error
        await logApiRequest(
          "/api/ai/generate-etsy-description (Vision)", 
          userId, 
          false, 
          Date.now() - startTime, 
          { error, hasImage: true }
        );
        
        return NextResponse.json(
          { error: "OpenAI Vision API hatası" },
          { status: response.status }
        );
      }

      const result = await response.json();
      const generatedText = result.choices[0].message.content.trim();
      
      success = true;
      // Log successful API request
      await logApiRequest(
        "/api/ai/generate-etsy-description (Vision)", 
        userId, 
        true, 
        Date.now() - startTime, 
        { hasImage: true, promptLength: prompt.length }
      );
      
      return new NextResponse(generatedText, { status: 200 });
    } 
    // Görsel yoksa, standart GPT API kullan
    else {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that generates detailed product descriptions for Etsy listings.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 800,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("OpenAI API error:", error);
        
        // Log API request with error
        await logApiRequest(
          "/api/ai/generate-etsy-description", 
          userId, 
          false, 
          Date.now() - startTime, 
          { error, hasImage: false }
        );
        
        return NextResponse.json(
          { error: "OpenAI API hatası" },
          { status: response.status }
        );
      }

      const result = await response.json();
      const generatedText = result.choices[0].message.content.trim();
      
      success = true;
      // Log successful API request
      await logApiRequest(
        "/api/ai/generate-etsy-description", 
        userId, 
        true, 
        Date.now() - startTime, 
        { hasImage: false, promptLength: prompt.length }
      );
      
      return new NextResponse(generatedText, { status: 200 });
    }
  } catch (error) {
    console.error("Generate Etsy description error:", error);
    
    // Log API request with error
    await logApiRequest(
      "/api/ai/generate-etsy-description", 
      userId, 
      false, 
      Date.now() - startTime, 
      { error: error instanceof Error ? error.message : String(error) }
    );
    
    return NextResponse.json(
      { error: "İstek işlenirken bir hata oluştu" },
      { status: 500 }
    );
  }
} 