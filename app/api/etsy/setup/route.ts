import { createEtsyDataTables } from "@/lib/etsy-api"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    // Kullanıcıyı kontrol et
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Tabloları oluştur
    await createEtsyDataTables()

    return NextResponse.json({
      success: true,
      message: "Etsy data tables created successfully"
    })
  } catch (error) {
    console.error("Error creating Etsy data tables:", error)
    return NextResponse.json(
      { error: "Failed to create Etsy data tables" },
      { status: 500 }
    )
  }
} 