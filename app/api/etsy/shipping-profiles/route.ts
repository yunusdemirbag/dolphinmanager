import { NextRequest, NextResponse } from 'next/server';
import { fetchEtsyShippingProfiles } from '@/lib/etsy-api';
import { initializeAdminApp, adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    console.log('🚚 Shipping profiles API çağrıldı');
    
    initializeAdminApp();
    
    if (!adminDb) {
      return NextResponse.json({ error: 'Database bağlantısı yok' }, { status: 500 });
    }

    // Get user ID from query params or use default
    const userId = request.nextUrl.searchParams.get('userId') || 'local-user-123';
    
    // Get active store for user
    const userStoresQuery = adminDb
      .collection('etsy_stores')
      .where('user_id', '==', userId)
      .where('is_active', '==', true);
    
    const userStoresSnapshot = await userStoresQuery.get();
    
    if (userStoresSnapshot.empty) {
      console.log('❌ Aktif mağaza bulunamadı');
      return NextResponse.json({ error: 'Aktif mağaza bulunamadı' }, { status: 404 });
    }

    const activeStore = userStoresSnapshot.docs[0].data();
    const shopId = activeStore.shop_id.toString();

    console.log('🔑 Etsy credentials alınıyor, shop_id:', shopId);

    // Get API credentials
    const apiKeysDoc = await adminDb.collection('etsy_api_keys').doc(shopId).get();
    
    if (!apiKeysDoc.exists) {
      return NextResponse.json({ error: 'API anahtarları bulunamadı' }, { status: 404 });
    }

    const { access_token } = apiKeysDoc.data()!;
    const apiKey = process.env.ETSY_CLIENT_ID;

    if (!access_token || !apiKey) {
      return NextResponse.json({ error: 'API credentials eksik' }, { status: 500 });
    }

    // Fetch shipping profiles from Etsy
    const shippingProfiles = await fetchEtsyShippingProfiles(shopId, apiKey, access_token);
    
    console.log('✅ Etsy shipping profiles alındı:', shippingProfiles.length, 'adet');
    
    return NextResponse.json(shippingProfiles);

  } catch (error) {
    console.error('❌ Shipping profiles API hatası:', error);
    return NextResponse.json(
      { error: 'Shipping profiles alınamadı' },
      { status: 500 }
    );
  }
}