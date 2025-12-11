import { NextRequest, NextResponse } from 'next/server';
import { storeDataSystem } from '@/lib/store-data-system';
import { initializeAdminApp, adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    // Initialize Firebase Admin
    initializeAdminApp();
    
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }
    
    console.log('🤖 Auto-sync process started');
    
    // Get all active stores that need sync
    const storesSnap = await adminDb
      .collection('etsy_stores')
      .where('is_active', '==', true)
      .get();
    
    if (storesSnap.empty) {
      console.log('🔍 No active stores found for auto-sync');
      return NextResponse.json({
        success: true,
        message: 'No active stores found',
        processed: 0
      });
    }
    
    const results = [];
    let processed = 0;
    let failed = 0;
    
    for (const storeDoc of storesSnap.docs) {
      const store = storeDoc.data();
      const shopId = String(store.shop_id);
      const userId = store.user_id;
      
      try {
        // Check if store needs sync
        const needsSync = await storeDataSystem.needsSync(shopId);
        
        if (needsSync) {
          console.log(`⏰ Auto-syncing store: ${store.shop_name} (${shopId})`);
          
          const syncResult = await storeDataSystem.syncStoreData(shopId, userId);
          
          results.push({
            shopId,
            shopName: store.shop_name,
            success: true,
            syncResult: {
              total_listings: syncResult.total_listings,
              synced_listings: syncResult.synced_listings,
              failed_listings: syncResult.failed_listings,
              sync_status: syncResult.sync_status
            }
          });
          
          processed++;
          
        } else {
          console.log(`⏭️  Store ${store.shop_name} doesn't need sync yet`);
          
          results.push({
            shopId,
            shopName: store.shop_name,
            success: true,
            message: 'No sync needed'
          });
        }
        
      } catch (error) {
        console.error(`❌ Auto-sync failed for store ${shopId}:`, error);
        
        results.push({
          shopId,
          shopName: store.shop_name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        failed++;
      }
    }
    
    console.log(`✅ Auto-sync completed: ${processed} processed, ${failed} failed`);
    
    return NextResponse.json({
      success: true,
      message: 'Auto-sync completed',
      processed,
      failed,
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Auto-sync error:', error);
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}

// This endpoint can be called by cron jobs for automatic syncing
export async function GET(request: NextRequest) {
  // Redirect GET requests to POST for simplicity
  return POST(request);
}