import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase admin not initialized' }, { status: 500 });
    }

    const { shop_id } = await request.json();

    if (!shop_id) {
      return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 });
    }

    console.log(`Mağaza bağlantısı kesiliyor: ${shop_id}`);

    const shopIdStr = shop_id.toString();

    // Firestore'dan ilgili dökümanları sil
    const etsyStoreRef = adminDb.collection('etsy_stores').doc(shopIdStr);
    const apiKeyRef = adminDb.collection('etsy_api_keys').doc(shopIdStr);

    await adminDb.runTransaction(async (transaction) => {
      transaction.delete(etsyStoreRef);
      transaction.delete(apiKeyRef);
    });

    console.log(`Mağaza ${shop_id} bağlantısı başarıyla kesildi.`);
    
    return NextResponse.json({ message: 'Store disconnected successfully' });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    console.error('Error disconnecting store:', error);
    return NextResponse.json({ error: `Failed to disconnect store: ${errorMessage}` }, { status: 500 });
  }
} 