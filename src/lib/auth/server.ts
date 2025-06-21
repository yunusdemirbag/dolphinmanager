import { NextRequest } from 'next/server';
import { auth as adminAuth } from '@/lib/firebase/admin';
import { redirect } from 'next/navigation';

/**
 * SUNUCU TARAFI: Gelen bir isteğin (request) çerezlerini (cookies) kullanarak
 * kullanıcının kimliğini doğrular. Sadece API rotaları ve Sunucu Bileşenleri'nde kullanılır.
 * @param req - Next.js'ten gelen NextRequest veya standart Request objesi.
 * @returns Doğrulanmış kullanıcı token'ı veya null.
 */
export async function getAuthenticatedUser(req: Request | NextRequest) {
  // 1. İstek başlıklarından (headers) 'session' adındaki çerezi bul.
  const sessionCookie = (req.headers.get('cookie') || '')
    .split(';')
    .find(c => c.trim().startsWith('session='))
    ?.split('=')[1];

  // 2. Eğer çerez yoksa, kullanıcı giriş yapmamış demektir.
  if (!sessionCookie) {
    return null;
  }

  // 3. Çerezi Firebase Admin SDK ile doğrula.
  // Bu, çerezin geçerli ve sahte olmadığını garanti eder.
  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decodedToken;
  } catch (error) {
    // Çerez geçersiz veya süresi dolmuşsa, kullanıcı giriş yapmamış demektir.
    console.warn("Invalid session cookie found in lib/auth.ts:", error);
    return null;
  }
}

/**
 * SUNUCU TARAFI: Bir sayfanın veya API rotasının korunmasını sağlar.
 * Eğer kullanıcı giriş yapmamışsa, onu doğrudan giriş sayfasına yönlendirir.
 * @param req - Gelen istek.
 * @returns Kullanıcı giriş yapmışsa kullanıcı token'ını döndürür. Aksi takdirde yönlendirme yapar.
 */
export async function requireAuth(req: Request | NextRequest) {
  const user = await getAuthenticatedUser(req);

  if (!user) {
    // Kullanıcı yoksa, /auth/login sayfasına yönlendir.
    redirect('/auth/login');
  }

  return user;
}

/**
 * @deprecated Use getAuthenticatedUser instead. This is kept for backward compatibility.
 */
export const getUser = getAuthenticatedUser; 