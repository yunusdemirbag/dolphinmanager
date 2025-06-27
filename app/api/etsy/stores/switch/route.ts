import { NextRequest, NextResponse } from 'next/server';
import { switchActiveStore } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { shopId } = await request.json();
    const userId = process.env.MOCK_USER_ID || 'local-user-123';

    if (!shopId) {
      return NextResponse.json(
        { error: 'Mağaza ID\'si gerekli' },
        { status: 400 }
      );
    }

    const result = await switchActiveStore(userId, shopId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Mağaza geçişi başarısız' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      store: result.store
    });
  } catch (error: any) {
    console.error('Mağaza geçişi sırasında hata:', error);
    return NextResponse.json(
      { error: error.message || 'Mağaza geçişi başarısız' },
      { status: 500 }
    );
  }
} 