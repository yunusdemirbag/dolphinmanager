import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    // Test için şimdilik hep connected dön
    // Gerçek implementasyonda Firebase session/user kontrolü yapılacak
    
    if (!adminDb) {
      return NextResponse.json({ 
        connected: false, 
        error: 'Database connection failed' 
      });
    }

    // Test user ID - gerçek implementasyonda session'dan gelecek
    const testUserId = '1007541496';
    
    const storeDoc = await adminDb.collection('etsy_stores').doc(testUserId).get();
    
    if (storeDoc.exists) {
      const storeData = storeDoc.data();
      return NextResponse.json({
        connected: true,
        shop_name: storeData?.shop_name,
        shop_id: storeData?.shop_id,
        user_id: storeData?.user_id
      });
    } else {
      return NextResponse.json({
        connected: false
      });
    }
  } catch (error) {
    console.error('Etsy status kontrol hatası:', error);
    return NextResponse.json({ 
      connected: false, 
      error: 'Status check failed' 
    });
  }
}