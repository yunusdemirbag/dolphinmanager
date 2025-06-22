import { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

export async function getAuthenticatedUser(req: Request | NextRequest) {
  const sessionCookie = (req.headers.get('cookie') || '')
    .split(';')
    .find(c => c.trim().startsWith('session='))
    ?.split('=')[1];

  if (!sessionCookie) {
    return null;
  }

  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decodedToken;
  } catch (error) {
    return null;
  }
}

// API rotaları için kimlik doğrulama fonksiyonu
export async function authenticateRequest(req: NextRequest) {
  // Development modunda kimlik doğrulamayı bypass et
  if (process.env.NODE_ENV === 'development') {
    console.warn("Auth bypassed in development mode");
    return { uid: 'dev-user-id', email: 'dev@example.com' };
  }

  return await getAuthenticatedUser(req);
}

// Yetkisiz erişim yanıtı oluştur
export function createUnauthorizedResponse() {
  return Response.json(
    { error: 'Yetkisiz erişim', code: 'UNAUTHORIZED' },
    { status: 401 }
  );
}

// Server component'lerde kullanılmak üzere
export async function getUser() {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    
    if (!sessionCookie) {
      return null;
    }
    
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    return {
      id: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
    };
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
} 