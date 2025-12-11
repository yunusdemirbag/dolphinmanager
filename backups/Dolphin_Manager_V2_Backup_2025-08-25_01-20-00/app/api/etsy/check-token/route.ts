import { NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

export async function GET() {
  try {
    initializeAdminApp();
    
    const userId = process.env.MOCK_USER_ID || 'local-user-123';

    if (!adminDb) {
      return NextResponse.json({ 
        success: false, 
        error: 'Firebase not initialized',
        needsRefresh: false
      }, { status: 500 });
    }

    // Kullanıcının aktif mağazasını bul
    const storesRef = adminDb.collection('etsy_stores').where('user_id', '==', userId).where('is_active', '==', true);
    const storeSnapshot = await storesRef.limit(1).get();
    
    if (storeSnapshot.empty) {
      return NextResponse.json({ 
        success: false, 
        error: 'No active store found',
        needsRefresh: false
      }, { status: 404 });
    }

    const storeDoc = storeSnapshot.docs[0];
    const shop_id = storeDoc.id; // Shop ID document ID olarak saklanıyor
    
    // API anahtarlarını al
    const apiKeysDoc = await adminDb.collection('etsy_api_keys').doc(shop_id).get();
    
    if (!apiKeysDoc.exists) {
      return NextResponse.json({ 
        success: false, 
        error: 'API keys not found',
        needsRefresh: false
      }, { status: 404 });
    }
    
    const apiKeysData = apiKeysDoc.data()!;
    const { access_token, expires_at } = apiKeysData;
    
    if (!access_token) {
      return NextResponse.json({
        success: false,
        error: 'No access token found',
        needsRefresh: true
      }, { status: 200 });
    }
    
    // Token süresini kontrol et
    const now = new Date();
    const tokenExpiresAt = expires_at ? expires_at.toDate() : null;
    
    // Token süresi dolmuş veya 15 dakika içinde dolacaksa yenileme gerekli
    const needsRefresh = tokenExpiresAt && 
      (tokenExpiresAt <= now || (tokenExpiresAt.getTime() - now.getTime() < 15 * 60 * 1000));
    
    console.log('🔍 Token durumu kontrol ediliyor:', {
      shop_id,
      token_expires_at: tokenExpiresAt ? tokenExpiresAt.toISOString() : 'unknown',
      current_time: now.toISOString(),
      time_remaining_minutes: tokenExpiresAt ? Math.round((tokenExpiresAt.getTime() - now.getTime()) / (60 * 1000)) : 'unknown',
      needs_refresh: needsRefresh
    });
    
    return NextResponse.json({
      success: true,
      needsRefresh,
      timeRemaining: tokenExpiresAt ? Math.round((tokenExpiresAt.getTime() - now.getTime()) / (60 * 1000)) : null,
      expiresAt: tokenExpiresAt ? tokenExpiresAt.toISOString() : null
    });

  } catch (error) {
    console.error('Token check error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      needsRefresh: false
    }, { status: 500 });
  }
}