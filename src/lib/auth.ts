import { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

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