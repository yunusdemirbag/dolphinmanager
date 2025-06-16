import { NextRequest, NextResponse } from "next/server"
import { descriptionPrompt } from "@/lib/openai-yonetim"
import { supabaseAdmin } from "@/lib/supabase"
import { getUser } from "@/lib/auth"
import { generateDescription } from "@/lib/openai-yonetim"

export const runtime = "edge"

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
      return NextResponse.json({ error: "Başlık gerekli" }, { status: 400 });
    }
    
    try {
      // Açıklama üretimi için merkezi fonksiyonu kullan
      const generatedText = await generateDescription({
        title,
        image,
        customPrompt: descriptionPrompt.prompt
      });
      
      success = true;
      
      return new NextResponse(generatedText, { status: 200 });
    } catch (error) {
      console.error("OpenAI API error:", error);
      
      return NextResponse.json(
        { error: "OpenAI API hatası" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Generate Etsy description error:", error);
    
    return NextResponse.json(
      { error: "İstek işlenirken bir hata oluştu" },
      { status: 500 }
    );
  }
} 