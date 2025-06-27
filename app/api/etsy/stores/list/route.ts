import { NextRequest, NextResponse } from 'next/server';
import { getAllUserStores } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const userId = process.env.MOCK_USER_ID || 'local-user-123';
    const stores = await getAllUserStores(userId);

    return NextResponse.json({
      success: true,
      stores
    });
  } catch (error: any) {
    console.error('Mağaza listesi alınırken hata:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Mağaza listesi alınamadı' 
      },
      { status: 500 }
    );
  }
} 