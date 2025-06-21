import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest, createUnauthorizedResponse } from '@/lib/auth-middleware'
import { db } from '@/lib/firebase-admin'

export async function POST(
  request: NextRequest,
  { params }: { params: { shopId: string } }
) {
  try {
    console.log("[etsy] /disconnect başlangıç")
    
    // Firebase Auth doğrulama
    const authResult = await authenticateRequest(request)
    
    if (!authResult) {
      console.log("[etsy] /disconnect Auth error")
      return createUnauthorizedResponse()
    }

    const shopId = params.shopId
    const userId = authResult.userId
    console.log("[etsy] /disconnect Disconnecting Etsy store:", shopId, "for user:", userId)

    try {
      const batch = db.batch()
      
      // Etsy tokens temizle
      const tokenRef = db.collection('etsy_tokens').doc(userId)
      batch.delete(tokenRef)
      
      // Auth sessions temizle
      const sessionRef = db.collection('etsy_auth_sessions').doc(userId)
      batch.delete(sessionRef)
      
      // Etsy stores temizle
      const storeRef = db.collection('etsy_stores').doc(`${userId}_${shopId}`)
      batch.delete(storeRef)
      
      // Tüm kullanıcının Etsy store'larını temizle (güvenlik için)
      const allStoresSnapshot = await db.collection('etsy_stores')
        .where('user_id', '==', userId)
        .get()
      
      allStoresSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref)
      })
      
      await batch.commit()

      console.log("[etsy] /disconnect status=200")
      
      return NextResponse.json({
        success: true,
        message: "Store disconnected successfully"
      })

    } catch (error) {
      console.error("[etsy] /disconnect error:", error)
      return NextResponse.json(
        { error: "Failed to disconnect store", details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error("[etsy] /disconnect API error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}