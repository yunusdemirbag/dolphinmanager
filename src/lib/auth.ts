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

// Server component'lerde kullanılmak üzere
export async function getUser() {
  try {
    const cookieStore = await cookies();
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