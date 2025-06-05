import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cleanupDuplicateTokens } from "@/lib/etsy-api"

export async function POST(request: NextRequest) {
  try {
    // Kullanıcı kimliği doğrulama
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: "Kullanıcı oturum açmamış",
        message: "Bu işlemi gerçekleştirmek için oturum açmalısınız."
      }, { status: 401 })
    }
    
    // Mevcut tokenleri temizle
    await cleanupDuplicateTokens(user.id)
    
    return NextResponse.json({
      success: true,
      message: "Token temizleme işlemi başarıyla tamamlandı"
    })
  } catch (error) {
    console.error("Token temizleme hatası:", error)
    return NextResponse.json({
      success: false,
      error: "Token temizleme işlemi sırasında bir hata oluştu",
      details: error instanceof Error ? error.message : "Bilinmeyen hata"
    }, { status: 500 })
  }
} 