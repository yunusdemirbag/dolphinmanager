import { NextResponse } from 'next/server';
import { getShippingProfilesFromFirebaseAdmin, syncShippingProfilesToFirebaseAdmin, getConnectedStoreFromFirebaseAdmin } from '@/lib/firebase-sync';
import { fetchEtsyShippingProfiles } from '@/lib/etsy-api';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shop_id');
    
    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 });
    }

    let profiles = await getShippingProfilesFromFirebaseAdmin(parseInt(shopId));
    
    // If no profiles found in Firebase, fetch from Etsy API and sync
    if (profiles.length === 0) {
      console.log(`🔄 Firebase'de ${shopId} mağazası için kargo profili bulunamadı, Etsy API'den çekiliyor...`);
      
      // Get API credentials
      initializeAdminApp();
      if (!adminDb) {
        console.error('❌ Firebase Admin başlatılamadı');
        return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
      }
      
      console.log(`🔍 Shop ID ${shopId} için API anahtarları aranıyor...`);
      const apiKeyDoc = await adminDb.collection('etsy_api_keys').doc(shopId).get();
      if (!apiKeyDoc.exists) {
        console.error(`❌ Shop ID ${shopId} için API anahtarları bulunamadı`);
        
        // Alternatif: Tüm API anahtarlarını logla
        const allKeysSnapshot = await adminDb.collection('etsy_api_keys').get();
        console.log(`📋 Mevcut API anahtarları: ${allKeysSnapshot.docs.map(doc => doc.id).join(', ')}`);
        
        return NextResponse.json({ 
          error: `API keys not found for shop ${shopId}`,
          availableShops: allKeysSnapshot.docs.map(doc => doc.id)
        }, { status: 404 });
      }
      
      const { api_key: apiKey, access_token: accessToken } = apiKeyDoc.data()!;
      if (!apiKey || !accessToken) {
        console.error(`❌ Shop ID ${shopId} için API bilgileri eksik - apiKey: ${!!apiKey}, accessToken: ${!!accessToken}`);
        return NextResponse.json({ error: 'Incomplete API credentials' }, { status: 400 });
      }
      
      console.log(`✅ API anahtarları bulundu, Etsy'den kargo profilleri çekiliyor...`);
      
      // Fetch from Etsy API
      const etsyProfiles = await fetchEtsyShippingProfiles(shopId, apiKey, accessToken);
      
      if (etsyProfiles.length > 0) {
        console.log(`📦 ${etsyProfiles.length} kargo profili Etsy'den alındı, Firebase'e sync ediliyor...`);
        // Sync to Firebase
        await syncShippingProfilesToFirebaseAdmin(parseInt(shopId), etsyProfiles);
        profiles = etsyProfiles;
      } else {
        console.log(`⚠️ Etsy'den kargo profili alınamadı (shopId: ${shopId})`);
      }
    }
    
    return NextResponse.json({ profiles });
  } catch (error) {
    console.error('Error fetching shipping profiles from Firebase:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shipping profiles' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { shop_id, profiles } = body;

    if (!shop_id || !profiles || !Array.isArray(profiles)) {
      return NextResponse.json(
        { error: 'Missing required fields: shop_id, profiles' },
        { status: 400 }
      );
    }

    await syncShippingProfilesToFirebaseAdmin(shop_id, profiles);

    return NextResponse.json({ 
      message: 'Shipping profiles synced to Firebase successfully',
      count: profiles.length
    });
  } catch (error) {
    console.error('Error syncing shipping profiles to Firebase:', error);
    return NextResponse.json(
      { error: 'Failed to sync shipping profiles' },
      { status: 500 }
    );
  }
}