import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: "Environment variables not configured",
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Test connection by trying to access a table
    const { data, error } = await supabase.from("profiles").select("count").limit(1)

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Connection successful",
      data,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Connection test failed",
    })
  }
}
