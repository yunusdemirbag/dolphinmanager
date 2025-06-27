import { storeDataSystem } from './store-data-system';
import { adminDb } from './firebase-admin';

/**
 * Cron job for automatic store synchronization
 * This should be called every 24 hours by a cron service
 */
export async function autoSyncStores() {
  console.log('🤖 Auto-sync cron job started');
  
  try {
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }
    
    // Get all active stores
    const storesSnap = await adminDb
      .collection('etsy_stores')
      .where('is_active', '==', true)
      .get();
    
    if (storesSnap.empty) {
      console.log('🔍 No active stores found for auto-sync');
      return {
        success: true,
        message: 'No active stores found',
        processed: 0
      };
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
    
    console.log(`✅ Auto-sync cron completed: ${processed} processed, ${failed} failed`);
    
    return {
      success: true,
      message: 'Auto-sync completed',
      processed,
      failed,
      results
    };
    
  } catch (error) {
    console.error('❌ Auto-sync cron error:', error);
    throw error;
  }
}

/**
 * Schedule auto-sync for a specific store
 */
export async function scheduleStoreSync(shopId: string, userId: string) {
  try {
    await storeDataSystem.scheduleAutoSync(shopId, userId);
    console.log(`📅 Auto-sync scheduled for store ${shopId}`);
  } catch (error) {
    console.error(`❌ Failed to schedule auto-sync for store ${shopId}:`, error);
    throw error;
  }
}

/**
 * Manual trigger for auto-sync (for testing)
 */
export async function triggerAutoSync() {
  console.log('🔧 Manual auto-sync trigger');
  return await autoSyncStores();
}

// Export for use in API routes or external cron services
export { autoSyncStores as default };