// app/api/etsy/reset/route.ts

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth'; // Merkezi kullanıcı doğrulama fonksiyonumuz
import { adminDb } from '@/lib/firebase/admin';
import { WriteBatch } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    // 1. Kullanıcının kimliğini Firebase oturum çerezinden doğrula
    const user = await getAuthenticatedUser(request);
    if (!user) {
      console.log("[etsy-reset] Unauthorized access attempt.");
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    console.log(`[etsy-reset] Starting reset for user: ${user.uid}`);

    // 2. Firestore'da toplu silme işlemi için bir "batch" oluştur
    const batch: WriteBatch = adminDb.batch();

    // Silinecek koleksiyonlar ve doküman referansları
    // Not: Firestore'da bir dokümanı silmek kolaydır, ancak alt koleksiyonları silmek için
    // daha karmaşık bir yapı gerekir. Şimdilik ana dokümanları siliyoruz.
    const collectionsToDelete = [
      'etsy_tokens', 
      'etsy_stores', 
      'etsy_listings', 
      // 'profiles' koleksiyonunu silmiyoruz, sadece güncelliyoruz.
    ];

    for (const collectionName of collectionsToDelete) {
      const docRef = adminDb.collection(collectionName).doc(user.uid);
      batch.delete(docRef);
      console.log(`[etsy-reset] Scheduled deletion for doc: ${collectionName}/${user.uid}`);
    }

    // 3. 'profiles' koleksiyonundaki Etsy alanlarını temizle
    const profileRef = adminDb.collection('profiles').doc(user.uid);
    batch.update(profileRef, {
      etsy_shop_id: null,
      etsy_shop_name: null,
      etsy_user_id: null,
    });
    console.log(`[etsy-reset] Scheduled profile update for user: ${user.uid}`);

    // 4. Tüm işlemleri tek seferde gerçekleştir
    await batch.commit();

    console.log(`[etsy-reset] Successfully reset Etsy data for user: ${user.uid}`);
    
    return NextResponse.json({ success: true, message: "Etsy connection reset successfully" });

  } catch (error) {
    console.error("[etsy-reset] Critical error during reset:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error', details: errorMessage }), { status: 500 });
  }
}