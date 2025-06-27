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
    
    // Get sync status
    const syncStatus = await storeDataSystem.getSyncStatus(shopId);
    
    // Get store analytics if available
    const analytics = await storeDataSystem.getStoreAnalytics(shopId);
    
    // Check if needs sync
    const needsSync = await storeDataSystem.needsSync(shopId);
    
    return NextResponse.json({
      success: true,
      shopId,
      shopName,
      syncStatus,
      analytics,
      needsSync,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Sync status error:', error);
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}