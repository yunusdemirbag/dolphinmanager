import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, createUnauthorizedResponse } from "@/lib/auth-middleware";
import { db } from "@/lib/firebase/admin";

// Geliştirme ortamında olup olmadığımızı kontrol et
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Etsy mağazaları API çağrısı başladı');
    console.log('🔧 NODE_ENV:', process.env.NODE_ENV);
    console.log('🔧 isDevelopment:', isDevelopment);
    
    // Kullanıcı doğrulama
    const authResult = await authenticateRequest(request);
    
    if (!authResult) {
      return createUnauthorizedResponse();
    }
    
    const userId = authResult.userId;
    console.log('✅ Kullanıcı doğrulandı:', userId);
    
    // Gerçek Etsy bağlantısını kontrol et
    try {
      const storesSnapshot = await db.collection('etsy_stores')
        .where('user_id', '==', userId)
        .get();
      
      const stores = storesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`📊 Firebase'den ${stores.length} mağaza bulundu`);
      
      if (stores.length === 0) {
        console.log('❌ Etsy mağazası bulunamadı');
        return NextResponse.json(
          { 
            success: false,
            error: 'Henüz Etsy mağazası bağlanmamış', 
            code: 'NO_STORES',
            message: 'Etsy mağazanızı bağlamak için "Mağaza Ekle" butonuna tıklayın.'
          },
          { status: 200 } // 404 yerine 200 dön, frontend'de handle edelim
        );
      }
      
      return NextResponse.json({
        success: true,
        stores,
        count: stores.length
      });
      
    } catch (firestoreError) {
      console.error('Firebase Firestore hatası:', firestoreError);
      return NextResponse.json(
        { success: false, error: 'Veritabanı bağlantı hatası', details: String(firestoreError) },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error('💥 GENEL HATA:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Bilinmeyen hata',
        code: 'UNKNOWN_ERROR',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}