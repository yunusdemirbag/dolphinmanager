import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Kullanıcı doğrulama
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Token'ı al
    const { data: tokenData } = await supabaseAdmin
      .from("etsy_tokens")
      .select("access_token")
      .eq("user_id", user.id)
      .single()

    if (!tokenData?.access_token) {
      return NextResponse.json({ error: "No access token found" }, { status: 404 })
    }

    const accessToken = tokenData.access_token
    const clientId = process.env.ETSY_CLIENT_ID

    if (!clientId) {
      return NextResponse.json({ error: "Missing ETSY_CLIENT_ID" }, { status: 500 })
    }

    // Test different endpoints
    const endpoints = [
      '/application/user',
      '/application/user/shops',
      '/application/shops',
      '/application/user/account/shops',
      '/application/openapi-ping'
    ]

    const results = []

    for (const endpoint of endpoints) {
      try {
        console.log(`Testing endpoint: ${endpoint}`)
        
        const response = await fetch(`https://api.etsy.com/v3${endpoint}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "x-api-key": clientId,
          } as HeadersInit,
        })

        let responseData = null
        let responseText = ""
        
        try {
          responseText = await response.text()
          if (responseText) {
            responseData = JSON.parse(responseText)
          }
        } catch (parseError) {
          responseData = { raw: responseText }
        }

        results.push({
          endpoint,
          status: response.status,
          success: response.ok,
          data: responseData,
          headers: Object.fromEntries(response.headers.entries())
        })

      } catch (error) {
        results.push({
          endpoint,
          status: 'error',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    return NextResponse.json({
      userId: user.id,
      hasToken: !!accessToken,
      tokenPreview: accessToken.substring(0, 10) + "...",
      results
    })

  } catch (error) {
    console.error("Test endpoints error:", error)
    return NextResponse.json({ 
      error: "Failed to test endpoints", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
} 