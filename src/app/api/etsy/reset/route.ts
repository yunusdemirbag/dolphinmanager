import { NextResponse } from 'next/server';
import { authenticateRequest, createUnauthorizedResponse } from '@/lib/auth-middleware';
import { db } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    // Kullanıcının kimliğini Firebase oturum token'ından doğrula
    const authResult = await authenticateRequest(request as any);
    if (!authResult) {
      console.log("[etsy-reset] Unauthorized access attempt.");
      return createUnauthorizedResponse();
    }

    const userId = authResult.userId;
    console.log(`[etsy-reset] Starting reset for user: ${userId}`);

    // Firestore'da toplu silme işlemi için bir "batch" oluştur
    const batch = db.batch();

    // Silinecek koleksiyonlar ve doküman referansları
    const collectionsToDelete = [
      'etsy_tokens', 
      'etsy_stores', 
      'etsy_listings',
      'etsy_uploads',
      'orders'
    ];

    // Her koleksiyonda kullanıcıya ait dokümanları bul ve sil
    for (const collectionName of collectionsToDelete) {
      console.log(`[etsy-reset] Processing collection: ${collectionName}`);
      
      // Kullanıcıya ait dokümanları bul
      const querySnapshot = await db.collection(collectionName)
        .where('user_id', '==', userId)
        .get();
      
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
        console.log(`[etsy-reset] Scheduled deletion for doc: ${collectionName}/${doc.id}`);
      });
    }

    // 'profiles' koleksiyonundaki Etsy alanlarını temizle
    const profileRef = db.collection('profiles').doc(userId);
    batch.update(profileRef, {
      etsy_shop_id: null,
      etsy_shop_name: null,
      etsy_user_id: null,
      updated_at: new Date()
    });
    console.log(`[etsy-reset] Scheduled profile update for user: ${userId}`);

    // Tüm işlemleri tek seferde gerçekleştir
    await batch.commit();

    console.log(`[etsy-reset] Successfully reset Etsy data for user: ${userId}`);
    
    return NextResponse.json({ 
      success: true, 
      message: "Etsy connection reset successfully" 
    });

  } catch (error) {
    console.error("[etsy-reset] Critical error during reset:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: errorMessage }, 
      { status: 500 }
    );
  }
}