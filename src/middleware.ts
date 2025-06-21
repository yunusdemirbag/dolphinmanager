import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  console.log(`🔍 [Middleware] URL: ${req.nextUrl.pathname}`)
  const res = NextResponse.next()
  
  // Handle CORS preflight requests for API routes
  if (req.method === 'OPTIONS' && req.nextUrl.pathname.startsWith('/api')) {
    console.log(`🔍 [Middleware] CORS preflight request for ${req.nextUrl.pathname}`)
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
    console.log(`🔍 [Middleware] API request: ${req.nextUrl.pathname}`)
    // Clone the response to avoid modifying the original
    const response = NextResponse.next();
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
    
    return response;
  }
  
  try {
    // Firebase Auth session kontrolü
    const sessionCookie = req.cookies.get('session')?.value;
    const hasSession = !!sessionCookie;
    console.log(`🔍 [Middleware] Session check: ${hasSession ? 'Session exists' : 'No session'}`)
    
    // Statik kaynaklara ve API isteklerine izin ver
    const isApiOrStatic = req.nextUrl.pathname.startsWith("/api") || 
                        req.nextUrl.pathname.startsWith("/_next") || 
                        req.nextUrl.pathname === "/favicon.ico" ||
                        req.nextUrl.pathname.endsWith(".svg") ||
                        req.nextUrl.pathname.endsWith(".png");
    
    if (isApiOrStatic) {
      console.log(`🔍 [Middleware] Static or API resource: ${req.nextUrl.pathname}`)
      return res;
    }

    // Ana sayfa isteklerini dashboard'a yönlendir
    if (req.nextUrl.pathname === "/") {
      console.log(`🔍 [Middleware] Redirecting / to /dashboard`)
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    
    // Onboarding sayfasına erişildiğinde dashboard'a yönlendir
    if (req.nextUrl.pathname === "/onboarding") {
      console.log(`🔍 [Middleware] Redirecting /onboarding to /dashboard`)
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Auth sayfaları kontrolleri - eğer oturum açıksa dashboard'a yönlendir
    const authPages = ["/auth/login", "/auth/register", "/login"];
    if (authPages.includes(req.nextUrl.pathname) && hasSession) {
      console.log(`🔍 [Middleware] Auth page with session, redirecting to /dashboard`)
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    
    // Korumalı sayfalar - oturum yoksa login'e yönlendir
    const protectedPages = ["/dashboard", "/stores", "/finance", "/orders", "/customer-management", "/marketing"];
    if (protectedPages.some(page => req.nextUrl.pathname.startsWith(page)) && !hasSession) {
      console.log(`🔍 [Middleware] Protected page without session, redirecting to login: ${req.nextUrl.pathname}`)
      return NextResponse.redirect(new URL("/auth/login?redirect=" + encodeURIComponent(req.nextUrl.pathname), req.url));
    }
    
    // Özel olarak /products sayfası için debug
    if (req.nextUrl.pathname === "/products") {
      console.log(`🚨 [Middleware] /products sayfası erişimi - Session: ${hasSession ? 'VAR' : 'YOK'}`)
      console.log(`🚨 [Middleware] /products sayfası için NORMAL AKIŞ - yönlendirme YOK`)
    }
    
    console.log(`🔍 [Middleware] Allowing access to: ${req.nextUrl.pathname}`)
    return res;
  } catch (error) {
    console.error("❌ [Middleware] Error:", error);
    
    // Hata durumunda ana sayfaya yönlendir
    const isAuthPage = req.nextUrl.pathname.startsWith("/auth");
    if (!isAuthPage) {
      console.log(`🔍 [Middleware] Error occurred, redirecting to /auth/login`)
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }
    
    return res;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
