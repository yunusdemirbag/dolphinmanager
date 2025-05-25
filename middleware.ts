import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Statik kaynaklara ve API isteklerine izin ver
  const isApiOrStatic = req.nextUrl.pathname.startsWith("/api") || 
                       req.nextUrl.pathname.startsWith("/_next") || 
                       req.nextUrl.pathname === "/favicon.ico" ||
                       req.nextUrl.pathname.endsWith(".svg") ||
                       req.nextUrl.pathname.endsWith(".png")
  
  if (isApiOrStatic) {
    return res
  }

  // Kullanıcı oturumunu kontrol et
  const { data: { user } } = await supabase.auth.getUser()
  
  // Giriş yapmamış kullanıcıları auth sayfasına yönlendir
  if (!user && !req.nextUrl.pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/auth/login", req.url))
  }
  
  // Giriş yapmış kullanıcı için Etsy bağlantısını kontrol et
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("etsy_shop_name")
      .eq("id", user.id)
      .single()
    
    const hasEtsyConnection = profile?.etsy_shop_name && profile.etsy_shop_name !== "pending"
    
    // Ana sayfa istekleri
    if (req.nextUrl.pathname === "/") {
      if (hasEtsyConnection) {
        return NextResponse.redirect(new URL("/dashboard", req.url))
      } else {
        return NextResponse.redirect(new URL("/onboarding", req.url))
      }
    }
    
    // Etsy bağlantısı varsa onboarding'e erişimi engelle
    if (hasEtsyConnection && req.nextUrl.pathname.startsWith("/onboarding")) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
    
    // Etsy bağlantısı yoksa dashboard'a erişimi engelle
    if (!hasEtsyConnection && req.nextUrl.pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL("/onboarding", req.url))
    }
  }
  
  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
