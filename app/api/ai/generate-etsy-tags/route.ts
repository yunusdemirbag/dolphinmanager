import { NextRequest, NextResponse } from "next/server"
import { tagsPrompt } from "@/lib/openai-yonetim"
import { supabaseAdmin } from "@/lib/supabase"
import { getUser } from "@/lib/auth"
import { generateTags } from "@/lib/openai-yonetim"

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
    const { title } = body;
    
    if (!title) {
      return NextResponse.json({ error: "Başlık gerekli" }, { status: 400 });
    }
    
    try {
      // Etiketler için merkezi fonksiyonu kullan
      const tags = await generateTags({
        title,
        customPrompt: tagsPrompt.prompt
      });
      
      if (tags.length !== 13) {
        return NextResponse.json(
          { error: `Geçerli uzunlukta 13 tag üretilemedi. Lütfen başlığı değiştirin veya tekrar deneyin.`, tags },
          { status: 400 }
        );
      }

      success = true;
      
      return NextResponse.json({ tags }, { status: 200 });
    } catch (error) {
      console.error("OpenAI API error:", error);
      
      return NextResponse.json(
        { error: "OpenAI API hatası" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Generate Etsy tags error:", error);
    
    return NextResponse.json(
      { error: "İstek işlenirken bir hata oluştu" },
      { status: 500 }
    );
  }
} 