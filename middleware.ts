import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  // Ana sayfayı ve tüm diğer sayfaları (API hariç) onboarding'e yönlendir
  const isRootOrAuthPage = req.nextUrl.pathname === "/" || 
                          req.nextUrl.pathname.startsWith("/auth") ||
                          req.nextUrl.pathname.startsWith("/dashboard")
  
  // Onboarding sayfasını gösterilmesine izin ver
  const isOnboardingPage = req.nextUrl.pathname.startsWith("/onboarding")
  
  // Statik kaynaklara ve API isteklerine izin ver
  const isApiOrStatic = req.nextUrl.pathname.startsWith("/api") || 
                       req.nextUrl.pathname.startsWith("/_next") || 
                       req.nextUrl.pathname === "/favicon.ico" ||
                       req.nextUrl.pathname.endsWith(".svg") ||
                       req.nextUrl.pathname.endsWith(".png")
  
  // Belirli hizmet sayfalarına izin ver
  const isServicePage = req.nextUrl.pathname === "/terms" || 
                       req.nextUrl.pathname === "/privacy"
  
  if (isRootOrAuthPage && !isApiOrStatic && !isOnboardingPage && !isServicePage) {
    return NextResponse.redirect(new URL("/onboarding", req.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
