import { NextResponse } from 'next/server';
import { getShopSectionsFromFirebase, syncShopSectionsToFirebase } from '@/lib/firebase-sync';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shop_id');
    
    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 });
    }

    const sections = await getShopSectionsFromFirebase(parseInt(shopId));
    
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

    await syncShopSectionsToFirebase(shop_id, sections);

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