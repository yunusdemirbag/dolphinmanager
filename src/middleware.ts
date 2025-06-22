import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

// Bu fonksiyon, gelen isteklerdeki oturum çerezini doğrular
async function verifySessionCookie(req: NextRequest) {
  const sessionCookie = req.cookies.get('session')?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    // Çerezi Firebase Admin SDK ile doğrula
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decodedToken;
  } catch (error: any) {
    // Hata durumunda (örn: token süresi dolmuş) null döndür
    console.warn('[Middleware] Invalid session cookie:', error.code);
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const user = await verifySessionCookie(req);
  const { pathname } = req.nextUrl;

  // Korunması gereken API rotaları
  const protectedApiRoutes = ['/api/etsy', '/api/user', '/api/ai'];

  // Eğer istek korumalı bir API rotasına gidiyorsa VE kullanıcı doğrulanmamışsa,
  // isteği reddet.
  if (protectedApiRoutes.some(path => pathname.startsWith(path)) && !user) {
    return new NextResponse(
        JSON.stringify({ error: 'Unauthorized: No valid session cookie' }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Kullanıcı giriş yapmamışsa ve korumalı bir sayfaya gitmeye çalışıyorsa,
  // onu giriş sayfasına yönlendir.
  const protectedPages = ['/stores', '/settings', '/dashboard', '/products', '/analytics', '/orders', '/marketing'];
  if (!user && protectedPages.some(path => pathname.startsWith(path))) {
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
