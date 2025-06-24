import { NextResponse } from 'next/server';
import { getShopSectionsFromFirebaseAdmin, syncShopSectionsToFirebaseAdmin } from '@/lib/firebase-sync';
import { fetchEtsyShopSections } from '@/lib/etsy-api';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shop_id');
    
    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 });
    }

    let sections = await getShopSectionsFromFirebaseAdmin(parseInt(shopId));
    
    // If no sections found in Firebase, fetch from Etsy API and sync
    if (sections.length === 0) {
      console.log(`No shop sections found in Firebase for shop ${shopId}, fetching from Etsy...`);
      
      // Get API credentials
      initializeAdminApp();
      if (!adminDb) {
        return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
      }
      
      const apiKeyDoc = await adminDb.collection('etsy_api_keys').doc(shopId).get();
      if (!apiKeyDoc.exists) {
        return NextResponse.json({ error: 'API keys not found for this shop' }, { status: 404 });
      }
      
      const { api_key: apiKey, access_token: accessToken } = apiKeyDoc.data()!;
      if (!apiKey || !accessToken) {
        return NextResponse.json({ error: 'Incomplete API credentials' }, { status: 400 });
      }
      
      // Fetch from Etsy API
      const etsySections = await fetchEtsyShopSections(shopId, apiKey, accessToken);
      
      if (etsySections.length > 0) {
        // Sync to Firebase
        await syncShopSectionsToFirebaseAdmin(parseInt(shopId), etsySections);
        sections = etsySections;
      }
    }
    
    return NextResponse.json({ sections });
  } catch (error) {
    console.error('Error fetching shop sections from Firebase:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shop sections' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { shop_id, sections } = body;

    if (!shop_id || !sections || !Array.isArray(sections)) {
      return NextResponse.json(
        { error: 'Missing required fields: shop_id, sections' },
        { status: 400 }
      );
    }

    await syncShopSectionsToFirebaseAdmin(shop_id, sections);

    return NextResponse.json({ 
      message: 'Shop sections synced to Firebase successfully',
      count: sections.length
    });
  } catch (error) {
    console.error('Error syncing shop sections to Firebase:', error);
    return NextResponse.json(
      { error: 'Failed to sync shop sections' },
      { status: 500 }
    );
  }
}