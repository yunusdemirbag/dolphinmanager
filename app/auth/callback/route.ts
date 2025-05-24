import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Check if user is new (first time login)
  const supabase = createRouteHandlerClient({ cookies })
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // Check if user has completed onboarding
    const { data: profile } = await supabase.from("profiles").select("etsy_shop_name").eq("id", user.id).single()

    // If no Etsy shop connected, redirect to onboarding
    if (!profile?.etsy_shop_name) {
      return NextResponse.redirect(new URL("/onboarding", request.url))
    }
  }

  // Redirect to dashboard after successful authentication
  return NextResponse.redirect(new URL("/dashboard", request.url))
}
