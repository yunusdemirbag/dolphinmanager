import { NextRequest } from "next/server"

export interface AuthenticatedRequest extends NextRequest {
  userId: string
  user: any
}

export async function authenticateRequest(request: NextRequest): Promise<{ userId: string; user: any } | null> {
  try {
    // Firebase geçişi sonrası geçici mock authentication
    console.log('🔄 Mock authentication - Firebase entegrasyonu sonrası güncellenecek');
    
    // Development/mock kullanıcısı döndür
    return {
      userId: 'mock-user-id',
      user: { 
        uid: 'mock-user-id',
        email: 'mock@example.com'
      }
    }
  } catch (error) {
    console.error('❌ Mock authentication hatası:', error);
    return null
  }
}

export function createUnauthorizedResponse() {
  return Response.json(
    { error: 'Yetkisiz erişim', code: 'UNAUTHORIZED' },
    { status: 401 }
  )
}