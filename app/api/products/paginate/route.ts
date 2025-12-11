import { NextRequest, NextResponse } from 'next/server';
import { getProductsFromFirebaseAdmin } from '@/lib/firebase-sync';

// ASLA MOCK VERİ KULLANILMIYOR

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || searchParams.get('user_id');
  const shopId = searchParams.get('shopId');
  const cursorParam = searchParams.get('cursor');
  const limitParam = searchParams.get('limit');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const cursor = cursorParam ? parseInt(cursorParam, 10) : null;
  const limit = limitParam ? parseInt(limitParam, 10) : 12; // Default 12

  if (cursorParam && isNaN(cursor as number)) {
    return NextResponse.json({ error: 'Invalid cursor format' }, { status: 400 });
  }

  if (limitParam && isNaN(limit)) {
    return NextResponse.json({ error: 'Invalid limit format' }, { status: 400 });
  }

  try {
    // ShopId varsa mağaza-spesifik ürünleri getir
    const { products, nextCursor } = await getProductsFromFirebaseAdmin(userId, limit, cursor, shopId);
    
    return NextResponse.json({ 
      success: true,
      products, 
      nextCursor,
      shopId: shopId || 'all'
    });
  } catch (error) {
    console.error('Error fetching paginated products:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal Server Error' 
    }, { status: 500 });
  }
} 