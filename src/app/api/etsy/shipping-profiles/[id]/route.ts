import { NextResponse } from 'next/server'
// import { createClient } from '@/lib/supabase/server'
import { updateShippingProfile, deleteShippingProfile } from '@/lib/etsy-api'

// Kargo profilini güncelle
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get user from session
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Etsy hesabınıza erişim yetkisi bulunamadı. Lütfen tekrar giriş yapın.' },
        { status: 401 }
      );
    }

    // Get user's Etsy shop ID
    const { data: etsyAuth, error: etsyAuthError } = await supabase
      .from('etsy_auth')
      .select('shop_id')
      .eq('user_id', user.id)
      .single();

    if (etsyAuthError || !etsyAuth?.shop_id) {
      return NextResponse.json(
        { error: 'Etsy mağaza bilgisi bulunamadı. Lütfen mağaza bağlantınızı kontrol edin.' },
        { status: 404 }
      );
    }

    const data = await request.json();
    const profile = await updateShippingProfile(user.id, etsyAuth.shop_id, parseInt(params.id), data);
    return NextResponse.json({ profile });
  } catch (error: any) {
    console.error('Error updating shipping profile:', error);

    let errorMessage = 'Kargo profili güncellenirken bir hata oluştu';
    let statusCode = 500;

    if (error?.message?.includes('RECONNECT_REQUIRED') || error?.message?.includes('401')) {
      errorMessage = 'Etsy hesabınıza erişim yetkisi bulunamadı. Lütfen tekrar giriş yapın.';
      statusCode = 401;
    } else if (error?.message?.includes('not found') || error?.message?.includes('404')) {
      errorMessage = 'Kargo profili bulunamadı.';
      statusCode = 404;
    } else if (error?.message?.includes('API error')) {
      errorMessage = 'Etsy API hatası: ' + error.message;
      statusCode = 502;
    } else if (error?.message?.includes('rate limit') || error?.message?.includes('429')) {
      errorMessage = 'Etsy API istek limiti aşıldı. Lütfen biraz bekleyip tekrar deneyin.';
      statusCode = 429;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

// Kargo profilini sil
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get user from session
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Etsy hesabınıza erişim yetkisi bulunamadı. Lütfen tekrar giriş yapın.' },
        { status: 401 }
      );
    }

    // Get user's Etsy shop ID
    const { data: etsyAuth, error: etsyAuthError } = await supabase
      .from('etsy_auth')
      .select('shop_id')
      .eq('user_id', user.id)
      .single();

    if (etsyAuthError || !etsyAuth?.shop_id) {
      return NextResponse.json(
        { error: 'Etsy mağaza bilgisi bulunamadı. Lütfen mağaza bağlantınızı kontrol edin.' },
        { status: 404 }
      );
    }

    await deleteShippingProfile(user.id, etsyAuth.shop_id, parseInt(params.id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting shipping profile:', error);

    let errorMessage = 'Kargo profili silinirken bir hata oluştu';
    let statusCode = 500;

    if (error?.message?.includes('RECONNECT_REQUIRED') || error?.message?.includes('401')) {
      errorMessage = 'Etsy hesabınıza erişim yetkisi bulunamadı. Lütfen tekrar giriş yapın.';
      statusCode = 401;
    } else if (error?.message?.includes('not found') || error?.message?.includes('404')) {
      errorMessage = 'Kargo profili bulunamadı.';
      statusCode = 404;
    } else if (error?.message?.includes('API error')) {
      errorMessage = 'Etsy API hatası: ' + error.message;
      statusCode = 502;
    } else if (error?.message?.includes('rate limit') || error?.message?.includes('429')) {
      errorMessage = 'Etsy API istek limiti aşıldı. Lütfen biraz bekleyip tekrar deneyin.';
      statusCode = 429;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
} 