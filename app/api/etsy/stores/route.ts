import { NextResponse } from 'next/server';
import { getConnectedStoreFromFirebaseAdmin } from '@/lib/firebase-sync';

export async function GET() {
  try {
    const userId = process.env.MOCK_USER_ID || 'local-user-123';
    
    console.log('🏪 Fetching store info for user:', userId);
    
    const store = await getConnectedStoreFromFirebaseAdmin(userId);
    
    if (!store) {
      return NextResponse.json({
        isConnected: false,
        store: null,
        message: 'Etsy mağazası bağlı değil'
      });
    }
    
    return NextResponse.json({
      isConnected: true,
      store: store,
      shopId: store.shop_id.toString(),
      shopName: store.shop_name,
      shopData: {
        connected_at: store.connected_at,
        last_sync_at: store.last_sync_at,
        is_active: store.is_active
      }
    });
    
  } catch (error) {
    console.error('❌ Store fetch error:', error);
    return NextResponse.json(
      { 
        error: 'Store bilgisi alınamadı',
        isConnected: false 
      }, 
      { status: 500 }
    );
  }
}