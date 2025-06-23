import { NextResponse } from 'next/server';
import { getConnectedStoreFromFirebase, syncEtsyStoreToFirebase } from '@/lib/firebase-sync';

// Yerel geliştirme için mock mağaza verisi
const MOCK_STORE_DATA = {
  shop_id: 12345678,
  shop_name: "CyberDecorArt",
  user_id: "1007541496",
  connected_at: new Date(),
  last_sync_at: new Date(),
  is_active: true
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    try {
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
    } catch (error) {
      console.log('Firebase erişim hatası, mock veri kullanılıyor:', error);
    }
    
    // Firebase'den veri alınamadıysa mock veri döndür
    console.log('Using mock store data for local development');
    return NextResponse.json({ store: MOCK_STORE_DATA });
    
  } catch (error) {
    console.error('Error fetching store from Firebase:', error);
    // Hata durumunda da mock veriyi döndür
    return NextResponse.json({ store: MOCK_STORE_DATA });
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