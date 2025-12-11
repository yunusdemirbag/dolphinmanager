import { NextRequest, NextResponse } from 'next/server';
import { aiTitleTagSystem } from '@/lib/ai-title-tag-system';
import { initializeAdminApp, adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
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
    
    console.log(`🔄 Starting store sync for shop: ${shopId}`);
    
    // Sync store to Firebase
    await aiTitleTagSystem.syncStoreToFirebase(shopId);
    
    return NextResponse.json({
      success: true,
      message: `Store ${shopId} synced successfully`,
      shopId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Store sync error:', error);
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}