import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase admin not initialized' }, { status: 500 });
    }

    const { shop_id, user_id } = await request.json();

    if (!shop_id) {
      return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 });
    }

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log(`Mağaza bağlantısı kesiliyor: ${shop_id} (Kullanıcı: ${user_id})`);

    // Kullanıcının Etsy bilgilerini güncelle
    const storeDetailsRef = adminDb.collection('users').doc(user_id).collection('etsy_credentials').doc('store_details');

    // Belgeyi tamamen silmek yerine aktif olmadığını işaretle
    await storeDetailsRef.update({
      is_active: false,
      disconnected_at: new Date()
    });

    console.log(`Mağaza ${shop_id} bağlantısı başarıyla kesildi.`);
    
    return NextResponse.json({ message: 'Store disconnected successfully' });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    console.error('Error disconnecting store:', error);
    return NextResponse.json({ error: `Failed to disconnect store: ${errorMessage}` }, { status: 500 });
  }
} 