import { NextResponse } from 'next/server';
import { getConnectedStoreFromFirebase, syncEtsyStoreToFirebase } from '@/lib/firebase-sync';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    try {
      // Firebase'den mağaza bilgisini al
      const store = await getConnectedStoreFromFirebase(userId);
      
      if (store) {
        console.log(`Firebase'den mağaza bulundu: ${store.shop_name} (ID: ${store.shop_id})`);
        // Don't return sensitive data like tokens
        const safeStore = {
          shop_id: store.shop_id,
          shop_name: store.shop_name,
          user_id: store.user_id,
          connected_at: store.connected_at,
          last_sync_at: store.last_sync_at,
          is_active: store.is_active
        };

        return NextResponse.json({ store: safeStore });
      }
      
      // Firebase'den veri alınamazsa Etsy API'den dene
      try {
        console.log('Firebase\'de mağaza bulunamadı, Etsy API\'den alınıyor...');
        const response = await fetch('https://openapi.etsy.com/v3/application/users/me/shops', {
          headers: {
            'x-api-key': process.env.ETSY_API_KEY || '',
            'Authorization': `Bearer ${process.env.ETSY_ACCESS_TOKEN || ''}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.count > 0 && data.results && data.results[0]) {
            const shop = data.results[0];
            console.log(`Etsy API'den mağaza bulundu: ${shop.shop_name} (ID: ${shop.shop_id})`);
            const storeData = {
              shop_id: shop.shop_id,
              shop_name: shop.shop_name,
              user_id: userId,
              connected_at: new Date(),
              last_sync_at: new Date(),
              is_active: true
            };
            
            return NextResponse.json({ store: storeData });
          }
        } else {
          console.error(`Etsy API hatası: ${response.status}`);
        }
      } catch (etsyError) {
        console.error('Etsy API error:', etsyError);
      }
      
      // Mağaza bulunamadı
      return NextResponse.json({ error: 'No connected store found' }, { status: 404 });
      
    } catch (error) {
      console.error('Error fetching store data:', error);
      return NextResponse.json({ error: 'Failed to fetch store data' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { shop_id, shop_name, user_id, access_token, refresh_token } = body;

    if (!shop_id || !shop_name || !user_id) {
      return NextResponse.json(
        { error: 'Missing required fields: shop_id, shop_name, user_id' },
        { status: 400 }
      );
    }

    console.log(`Mağaza Firebase'e kaydediliyor: ${shop_name} (ID: ${shop_id})`);
    await syncEtsyStoreToFirebase({
      shop_id,
      shop_name,
      user_id,
      access_token,
      refresh_token
    });

    return NextResponse.json({ 
      message: 'Store synced to Firebase successfully',
      shop_id,
      shop_name
    });
  } catch (error) {
    console.error('Error syncing store to Firebase:', error);
    return NextResponse.json(
      { error: 'Failed to sync store data' },
      { status: 500 }
    );
  }
}