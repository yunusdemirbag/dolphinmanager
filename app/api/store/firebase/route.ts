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

    // Mock kullanıcı ID'si için her ortamda mock veri döndür
    if (userId === 'local-user-123') {
      console.log('Using mock store data for local-user-123');
      return NextResponse.json({ 
        store: {
          shop_id: 56171647,
          shop_name: "CyberDecorArt",
          user_id: "local-user-123",
          connected_at: new Date(),
          last_sync_at: new Date(),
          is_active: true
        }
      });
    }

    try {
      // Firebase'den mağaza bilgisini al
      const store = await getConnectedStoreFromFirebase(userId);
      
      if (store) {
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

    // Mock kullanıcı ID'si için her ortamda mock başarılı yanıt döndür
    if (user_id === 'local-user-123') {
      console.log('Mock successful store sync for local-user-123');
      return NextResponse.json({ 
        message: 'Store synced to Firebase successfully (mock)',
        shop_id,
        shop_name
      });
    }

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