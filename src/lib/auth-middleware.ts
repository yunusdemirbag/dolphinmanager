import { createRemoteJWKSet, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    uid: string;
    email?: string;
    [key: string]: any;
  };
}

// Geliştirme ortamında kimlik doğrulamayı atlama seçeneği
const DEV_MODE = process.env.NODE_ENV === 'development';
const SKIP_AUTH_IN_DEV = process.env.SKIP_AUTH_IN_DEV === 'true';

const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/service_account/v1/jwk/securetoken.google.com'));

export async function authenticateRequest(request: NextRequest): Promise<{ userId: string; user: any } | null> {
  try {
    // Authorization header'dan token al
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Authorization header bulunamadı');
      
      // Geliştirme ortamında ve SKIP_AUTH_IN_DEV aktifse test kullanıcısı döndür
      if (DEV_MODE && SKIP_AUTH_IN_DEV) {
        console.log('⚠️ Geliştirme ortamında kimlik doğrulama atlanıyor, test kullanıcısı kullanılıyor');
        return {
          userId: 'test-user-id',
          user: {
            uid: 'test-user-id',
            email: 'test@example.com',
            role: 'admin'
          }
        };
      }
      
      return null;
    }
    
    const token = authHeader.split('Bearer ')[1]
    
    try {
      // Firebase token'ı doğrula
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: 'https://securetoken.google.com/' + process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        audience: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      })
      
      if (!payload.sub) {
        throw new Error('Token does not have a subject (sub) claim.');
      }
      
      return {
        userId: payload.sub,
        user: payload
      }
    } catch (tokenError) {
      console.error('❌ Token doğrulama hatası:', tokenError);
      
      // Geliştirme ortamında ve SKIP_AUTH_IN_DEV aktifse test kullanıcısı döndür
      if (DEV_MODE && SKIP_AUTH_IN_DEV) {
        console.log('⚠️ Geliştirme ortamında kimlik doğrulama atlanıyor, test kullanıcısı kullanılıyor');
        return {
          userId: 'test-user-id',
          user: {
            uid: 'test-user-id',
            email: 'test@example.com',
            role: 'admin'
          }
        };
      }
      
      return null;
    }
  } catch (error) {
    console.error('❌ Kimlik doğrulama işleminde beklenmeyen hata:', error);
    return null;
  }
}

export function createUnauthorizedResponse() {
  return Response.json(
    { error: 'Yetkisiz erişim', code: 'UNAUTHORIZED' },
    { status: 401 }
  )
}

// Helper function to verify the token
export async function verifyAuth(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: 'https://securetoken.google.com/' + process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      audience: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });

    return payload;
  } catch (error) {
    console.error('Error verifying auth token with jose:', error);
    return null;
  }
}