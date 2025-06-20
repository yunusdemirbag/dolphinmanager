// import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  // Firebase auth callback handling
  // Firebase handles auth callbacks differently, this endpoint may not be needed
  return NextResponse.redirect(new URL("/dashboard", request.url))
}
