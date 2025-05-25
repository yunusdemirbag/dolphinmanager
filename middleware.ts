import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // Create a Supabase client configured for the middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => {
          res.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove: (name, options) => {
          res.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )
  
  try {
    // Refresh session if expired - required for Server Components
    const { data: { session } } = await supabase.auth.getSession()
    
    // Statik kaynaklara ve API isteklerine izin ver
    const isApiOrStatic = req.nextUrl.pathname.startsWith("/api") || 
                        req.nextUrl.pathname.startsWith("/_next") || 
                        req.nextUrl.pathname === "/favicon.ico" ||
                        req.nextUrl.pathname.endsWith(".svg") ||
                        req.nextUrl.pathname.endsWith(".png")
    
    if (isApiOrStatic) {
      return res
    }

    // Ana sayfa isteklerini dashboard'a yönlendir
    if (req.nextUrl.pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
    
    // Onboarding sayfasına erişildiğinde dashboard'a yönlendir
    if (req.nextUrl.pathname === "/onboarding") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    // Auth sayfaları kontrolleri - eğer oturum açıksa dashboard'a yönlendir
    const authPages = ["/auth/login", "/auth/register"]
    if (authPages.includes(req.nextUrl.pathname) && session) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
    
    // Korumalı sayfalar - oturum yoksa login'e yönlendir
    const protectedPages = ["/dashboard", "/stores", "/products"]
    if (protectedPages.some(page => req.nextUrl.pathname.startsWith(page)) && !session) {
      return NextResponse.redirect(new URL("/auth/login", req.url))
    }
    
    return res
  } catch (error) {
    console.error("Middleware error:", error)
    
    // Hata durumunda ana sayfaya yönlendir
    const isAuthPage = req.nextUrl.pathname.startsWith("/auth")
    if (!isAuthPage) {
      return NextResponse.redirect(new URL("/auth/login", req.url))
    }
    
    return res
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
