import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Bu fonksiyon, gelen isteklerdeki oturum çerezini kontrol eder
// Edge Runtime'da Firebase Admin SDK kullanamadığımız için basit bir kontrol yapıyoruz
function hasSessionCookie(req: NextRequest) {
  const sessionCookie = req.cookies.get('session')?.value;
  return !!sessionCookie; // Sadece çerezin varlığını kontrol ediyoruz
}

export async function middleware(req: NextRequest) {
  const hasSession = hasSessionCookie(req);
  const { pathname } = req.nextUrl;

  // /undefined yoluna yapılan istekleri /dashboard'a yönlendir
  if (pathname === '/undefined') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Kullanıcı giriş yapmamışsa ve korumalı bir sayfaya gitmeye çalışıyorsa,
  // onu giriş sayfasına yönlendir.
  const protectedPages = ['/stores', '/settings', '/dashboard', '/products', '/analytics', '/orders', '/marketing'];
  if (!hasSession && protectedPages.some(path => pathname.startsWith(path))) {
    const loginUrl = new URL('/auth/login', req.url);
    loginUrl.searchParams.set('redirect', pathname); // Kullanıcıyı giriş yaptıktan sonra geri yönlendir
    return NextResponse.redirect(loginUrl);
  }

  // Diğer tüm durumlarda isteğin devam etmesine izin ver
  return NextResponse.next();
}

// Middleware'in hangi sayfalarda çalışacağını belirle
export const config = {
  matcher: [
    /*
     * Aşağıdaki yollar hariç TÜM istek yollarıyla eşleştir:
     * - /api/ ile başlayanlar (API rotaları)
     * - /auth/ ile başlayanlar (giriş/kayıt sayfaları)
     * - _next/static, _next/image, favicon.ico (statik dosyalar)
     */
    '/((?!api/|auth/|_next/static|_next/image|favicon.ico|api/auth/session).*)',
  ],
};
