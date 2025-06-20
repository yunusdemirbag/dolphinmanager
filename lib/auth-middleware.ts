import { NextRequest } from "next/server"
import { auth } from "@/lib/firebase-admin"

export interface AuthenticatedRequest extends NextRequest {
  userId: string
  user: any
}

export async function authenticateRequest(request: NextRequest): Promise<{ userId: string; user: any } | null> {
  try {
    // Authorization header'dan token al
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Authorization header bulunamadı');
      return null
    }
    
    const token = authHeader.split('Bearer ')[1]
    
    // Firebase token'ı doğrula
    const decodedToken = await auth.verifyIdToken(token)
    
    return {
      userId: decodedToken.uid,
      user: decodedToken
    }
  } catch (error) {
    console.error('❌ Token doğrulama hatası:', error);
    return null
  }
}

export function createUnauthorizedResponse() {
  return Response.json(
    { error: 'Yetkisiz erişim', code: 'UNAUTHORIZED' },
    { status: 401 }
  )
}