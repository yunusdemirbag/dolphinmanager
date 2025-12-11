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
    
    // Get sync status
    const syncStatus = await storeDataSystem.getSyncStatus(shopId);
    
    if (!syncStatus) {
      return NextResponse.json({
        success: false,
        error: 'No sync status found'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      syncStatus: {
        shop_id: syncStatus.shop_id,
        last_sync: syncStatus.last_sync,
        next_sync: syncStatus.next_sync,
        total_listings: syncStatus.total_listings,
        synced_listings: syncStatus.synced_listings,
        failed_listings: syncStatus.failed_listings,
        sync_status: syncStatus.sync_status,
        sync_duration_ms: syncStatus.sync_duration_ms,
        error_message: syncStatus.error_message
      }
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Sync status check error:', error);
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}