import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    if (!adminDb) {
      // Firebase olmadan mock data döner
      console.log('Using mock Etsy connection data');
      return NextResponse.json({
        connected: true,
        shop_name: "CyberDecorArt",
        shop_id: "12345678",
        user_id: "1007541496",
        mock: true
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