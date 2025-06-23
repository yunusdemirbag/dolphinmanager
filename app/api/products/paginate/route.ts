import { NextRequest, NextResponse } from 'next/server';
import { getProductsFromFirebaseAdmin } from '@/lib/firebase-sync';

// ASLA MOCK VERİ KULLANILMIYOR

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('user_id');
  const cursorParam = searchParams.get('cursor');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const cursor = cursorParam ? parseInt(cursorParam, 10) : null;

  if (cursorParam && isNaN(cursor as number)) {
    return NextResponse.json({ error: 'Invalid cursor format' }, { status: 400 });
  }

  try {
    const { products, nextCursor } = await getProductsFromFirebaseAdmin(userId, 12, cursor);
    return NextResponse.json({ products, nextCursor });
  } catch (error) {
    console.error('Error fetching paginated products:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 