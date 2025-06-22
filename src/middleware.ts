import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyAuth } from "./lib/auth-middleware"

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API rotaları için kimlik doğrulama
  if (pathname.startsWith('/api/')) {
    // Auth ve public rotaları hariç tut
    if (pathname.startsWith('/api/auth/')) {
      return NextResponse.next();
    }

    const token = req.headers.get('Authorization')?.split('Bearer ')[1];

    if (!token) {
      console.log('🚫 [Middleware] No token provided for API route');
      return new NextResponse(JSON.stringify({ error: 'Yetkisiz erişim: Token bulunamadı.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    try {
      const decodedToken = await verifyAuth(token);
      if (!decodedToken) {
        throw new Error("Invalid token");
      }
      console.log(`✅ [Middleware] Auth successful for: ${decodedToken.email}`);
      
      // Add user info to the request headers to be used in API routes
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set('X-User-Info', JSON.stringify(decodedToken));

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

    } catch (error) {
      console.error('❌ [Middleware] Invalid token:', error);
      return new NextResponse(JSON.stringify({ error: 'Yetkisiz erişim: Geçersiz token.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
  }

  // Sayfa yönlendirme mantığı (client-side rendering için)
  const sessionCookie = req.cookies.get('session')?.value;
  const hasSession = !!sessionCookie;

  const authPages = ["/auth/login", "/auth/register", "/login"];
  if (authPages.includes(pathname) && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  
  const protectedPages = ["/dashboard", "/stores", "/products", "/settings"];
  if (protectedPages.some(page => pathname.startsWith(page)) && !hasSession) {
      return NextResponse.redirect(new URL("/auth/login?redirect=" + encodeURIComponent(pathname), req.url));
  }
  
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
