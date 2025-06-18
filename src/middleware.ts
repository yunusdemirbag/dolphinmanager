import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // Handle CORS preflight requests for API routes
  if (req.method === 'OPTIONS' && req.nextUrl.pathname.startsWith('/api')) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  
  // Add CORS headers to API responses
  if (req.nextUrl.pathname.startsWith('/api')) {
    // Clone the response to avoid modifying the original
    const response = NextResponse.next();
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
    
    return response;
  }
  
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
    const protectedPages = ["/dashboard", "/stores", "/products", "/finance", "/orders", "/customer-management", "/marketing"]
    if (protectedPages.some(page => req.nextUrl.pathname.startsWith(page)) && !session) {
      return NextResponse.redirect(new URL("/auth/login?redirect=" + encodeURIComponent(req.nextUrl.pathname), req.url))
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
