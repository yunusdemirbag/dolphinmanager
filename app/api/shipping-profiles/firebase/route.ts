import { NextResponse } from 'next/server';
import { getShippingProfilesFromFirebase, syncShippingProfilesToFirebase } from '@/lib/firebase-sync';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shop_id');
    
    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 });
    }

    const profiles = await getShippingProfilesFromFirebase(parseInt(shopId));
    
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

    await syncShippingProfilesToFirebase(shop_id, profiles);

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