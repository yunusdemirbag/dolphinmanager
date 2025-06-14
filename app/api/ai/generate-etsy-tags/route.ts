import { NextRequest, NextResponse } from "next/server"
import { tagsPrompt } from "@/lib/prompts"
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
    const { title } = body;
    
    if (!title) {
      // Log API request with error
      await logApiRequest(
        "/api/ai/generate-etsy-tags", 
        userId, 
        false, 
        Date.now() - startTime, 
        { error: "Başlık gerekli" }
      );
      
      return NextResponse.json({ error: "Başlık gerekli" }, { status: 400 });
    }
    
    // Etiketler için prompt hazırla
    let prompt = tagsPrompt.prompt.replace("${title}", title);
    
    const apiKey = process.env.OPENAI_API_KEY;
    
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
            content: "You are a helpful assistant that generates SEO-optimized tags for Etsy listings.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      
      // Log API request with error
      await logApiRequest(
        "/api/ai/generate-etsy-tags", 
        userId, 
        false, 
        Date.now() - startTime, 
        { error }
      );
      
      return NextResponse.json(
        { error: "OpenAI API hatası" },
        { status: response.status }
      );
    }

    const result = await response.json();
    const generatedText = result.choices[0].message.content.trim();
    
    // Etiketleri temizle ve dizi haline getir
    const tags: string[] = generatedText
      .replace(/^\"|\"$/g, '') // Başta ve sonda tırnak işaretlerini kaldır
      .split(',')
      .map((tag: string) => tag.trim())
      .filter((tag: string) => tag.length > 0 && tag.length <= 20); // 20 karakterden uzun etiketleri filtrele
    
    success = true;
    // Log successful API request
    await logApiRequest(
      "/api/ai/generate-etsy-tags", 
      userId, 
      true, 
      Date.now() - startTime, 
      { promptLength: prompt.length, tagCount: tags.length }
    );
    
    return new NextResponse(generatedText, { status: 200 });
  } catch (error) {
    console.error("Generate Etsy tags error:", error);
    
    // Log API request with error
    await logApiRequest(
      "/api/ai/generate-etsy-tags", 
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