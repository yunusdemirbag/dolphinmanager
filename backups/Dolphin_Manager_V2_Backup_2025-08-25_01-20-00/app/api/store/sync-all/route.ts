import { NextRequest, NextResponse } from 'next/server';
import { storeDataSystem } from '@/lib/store-data-system';
import { initializeAdminApp, adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
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
    
    console.log(`🔄 Starting full store sync for: ${shopName} (${shopId})`);
    
    // Senkronizasyon durumunu başlangıçta güncelle
    await adminDb
      .collection('store_sync_status')
      .doc(shopId)
      .set({
        shop_id: shopId,
        user_id: userId,
        last_sync: new Date(),
        next_sync: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 saat sonra
        total_listings: 0,
        synced_listings: 0,
        failed_listings: 0,
        sync_status: 'in_progress',
        sync_start_time: new Date(),
        updated_at: new Date()
      }, { merge: true });
    
    // Start sync process
    const syncResult = await storeDataSystem.syncStoreData(shopId, userId);
    
    const totalTime = Date.now() - startTime;
    
    console.log(`✅ Store sync completed in ${totalTime}ms`);
    
    // Mağaza bilgilerini güncelle
    await adminDb
      .collection('etsy_stores')
      .doc(shopId)
      .update({
        last_sync_at: new Date(),
        total_products: syncResult.total_listings,
        sync_duration_ms: totalTime
      });
    
    return NextResponse.json({
      success: true,
      message: `Store ${shopName} synced successfully`,
      shopId,
      shopName,
      syncResult: {
        total_listings: syncResult.total_listings,
        synced_listings: syncResult.synced_listings,
        failed_listings: syncResult.failed_listings,
        sync_status: syncResult.sync_status,
        sync_duration_ms: syncResult.sync_duration_ms
      },
      total_time_ms: totalTime,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Store sync error:', error);
    
    const totalTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      total_time_ms: totalTime
    }, { status: 500 });
  }
}