import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, createUnauthorizedResponse } from '@/lib/auth-middleware'
import { db } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    // Kullanıcı doğrulama
    const authResult = await authenticateRequest(request)
    
    if (!authResult) {
      return createUnauthorizedResponse()
    }
    
    const userId = authResult.userId
    
    // Firebase Firestore'dan kullanıcı profili al
    const profileRef = db.collection('profiles').doc(userId)
    const profileDoc = await profileRef.get()
    
    if (!profileDoc.exists) {
      // Profil yoksa oluştur
      const defaultProfile = {
        user_id: userId,
        email: authResult.user.email || '',
        display_name: authResult.user.name || authResult.user.email || '',
        etsy_shop_id: null,
        etsy_shop_name: null,
        etsy_user_id: null,
        created_at: new Date(),
        updated_at: new Date()
      }
      
      await profileRef.set(defaultProfile)
      
      return NextResponse.json({
        success: true,
        profile: defaultProfile
      })
    }
    
    const profileData = profileDoc.data()
    
    return NextResponse.json({
      success: true,
      profile: profileData
    })
    
  } catch (error: any) {
    console.error('Profile API error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    )
  }
}