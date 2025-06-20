import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Kullanıcı doğrulama
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Cleaning up old tokens for user:", user.id)

    // En son token'ı al
    const { data: latestToken } = await supabaseAdmin
      .from("etsy_tokens")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (!latestToken) {
      return NextResponse.json({ message: "No tokens found" })
    }

    // Eski token'ları sil (en son hariç)
    const { error: deleteError } = await supabaseAdmin
      .from("etsy_tokens")
      .delete()
      .eq("user_id", user.id)
      .neq("id", latestToken.id)

    if (deleteError) {
      console.error("Error deleting old tokens:", deleteError)
      return NextResponse.json({ error: "Failed to cleanup tokens" }, { status: 500 })
    }

    console.log("Token cleanup completed successfully")

    return NextResponse.json({ 
      message: "Token cleanup completed",
      keptToken: latestToken.id,
      deletedOldTokens: true
    })

  } catch (error) {
    console.error("Token cleanup error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 