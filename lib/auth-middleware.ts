import { NextRequest } from "next/server"
import { auth } from "@/lib/firebase/admin"

export interface AuthenticatedRequest extends NextRequest {
  userId: string
  user: any
}

// Geliştirme ortamında kimlik doğrulamayı atlama seçeneği
const DEV_MODE = process.env.NODE_ENV === 'development';
const SKIP_AUTH_IN_DEV = process.env.SKIP_AUTH_IN_DEV === 'true' || false;

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
      const decodedToken = await auth.verifyIdToken(token)
      
      return {
        userId: decodedToken.uid,
        user: decodedToken
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