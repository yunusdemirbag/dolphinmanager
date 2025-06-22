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

  // Korunması gereken API rotaları
  const protectedApiRoutes = ['/api/etsy', '/api/user', '/api/ai'];

  // Eğer istek korumalı bir API rotasına gidiyorsa VE oturum çerezi yoksa,
  // isteği reddet. Gerçek kimlik doğrulama API rotalarında yapılacak.
  if (protectedApiRoutes.some(path => pathname.startsWith(path)) && !hasSession) {
    return new NextResponse(
        JSON.stringify({ error: 'Unauthorized: No valid session cookie' }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
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
     * - /auth/ ile başlayanlar (giriş/kayıt sayfaları)
     * - /api/auth/session (oturum oluşturma/silme API'si)
     * - _next/static, _next/image, favicon.ico (statik dosyalar)
     */
    '/((?!auth/|_next/static|_next/image|favicon.ico|api/auth/session).*)',
  ],
};
