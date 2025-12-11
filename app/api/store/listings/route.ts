import { NextRequest, NextResponse } from 'next/server';
import { storeDataSystem } from '@/lib/store-data-system';
import { initializeAdminApp, adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    // Initialize Firebase Admin
    initializeAdminApp();
    
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }
    
    // Get active store for user
    const userId = process.env.MOCK_USER_ID || 'local-user-123';
    
    const storeSnap = await adminDb
      .collection('etsy_stores')
      .where('user_id', '==', userId)
      .where('is_active', '==', true)
      .limit(1)
      .get();
    
    if (storeSnap.empty) {
      return NextResponse.json({
        success: false,
        error: 'No active store found'
      }, { status: 404 });
    }
    
    const store = storeSnap.docs[0].data();
    const shopId = String(store.shop_id);
    const shopName = store.shop_name;
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const orderBy = searchParams.get('orderBy') as 'views' | 'favorites' | 'price' | 'created_at' || 'created_at';
    const orderDirection = searchParams.get('orderDirection') as 'asc' | 'desc' || 'desc';
    const state = searchParams.get('state') as 'active' | 'draft' | 'inactive' || undefined;
    
    // Get store listings
    const listings = await storeDataSystem.getStoreListings(shopId, {
      limit,
      offset,
      orderBy,
      orderDirection,
      state
    });
    
    return NextResponse.json({
      success: true,
      shopId,
      shopName,
      listings,
      count: listings.length,
      pagination: {
        limit,
        offset,
        orderBy,
        orderDirection,
        state
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Listings error:', error);
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}