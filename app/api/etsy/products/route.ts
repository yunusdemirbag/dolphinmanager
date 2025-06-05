import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getValidAccessToken, fetchFromEtsyAPI } from '@/lib/etsy-api';

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // 1. Kullanıcı oturumunu doğrula
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. URL parametrelerini al
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const state = searchParams.get('state') || 'active';

    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 });
    }

    // 3. Geçerli access token al
    const accessToken = await getValidAccessToken(session.user.id);
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Etsy hesabınız bağlı değil veya oturum süresi dolmuş. Lütfen mağazanızı tekrar bağlayın.' },
        { status: 401 }
      );
    }

    // 4. Etsy API'den ürünleri çek
    const endpoint = `/application/shops/${shopId}/listings/active`;
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: ((page - 1) * limit).toString(),
      state: state
    });

    const listings = await fetchFromEtsyAPI(`${endpoint}?${params.toString()}`, accessToken);

    // 5. Yanıtı formatla ve döndür
    return NextResponse.json({
      listings: listings.results || [],
      pagination: {
        total: listings.count || 0,
        page,
        limit,
        totalPages: Math.ceil((listings.count || 0) / limit)
      }
    });

  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: error.message || 'Ürünler alınırken bir hata oluştu' },
      { status: 500 }
    );
  }
} 