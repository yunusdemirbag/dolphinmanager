import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  // Giriş yapmış kullanıcının session'ını al
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // RLS politikaları sayesinde, bu sorgu otomatik olarak SADECE
  // giriş yapmış kullanıcıya ait mağazaları ve tokenları getirecektir.
  const { data: stores, error: dbError } = await supabase
    .from('etsy_stores')
    .select(`
      id,
      shop_id,
      shop_name,
      sync_enabled,
      etsy_tokens (
        is_valid,
        expires_at
      )
    `)
    .eq('user_id', session.user.id);

  if (dbError) {
    console.error('Error fetching Etsy connections:', dbError);
    return NextResponse.json({ error: 'Failed to fetch connections from database' }, { status: 500 });
  }

  // Veriyi frontend'in beklediği formata dönüştür
  const formattedData = (stores || []).map((store: any) => {
    const tokenInfo = Array.isArray(store.etsy_tokens) ? store.etsy_tokens[0] : store.etsy_tokens;
    return {
      id: store.id,
      shop_id: store.shop_id,
      shop_name: store.shop_name,
      sync_enabled: store.sync_enabled,
      is_token_valid: tokenInfo?.is_valid ?? false,
      token_expires_at: tokenInfo?.expires_at ?? new Date(0).toISOString(),
    };
  });

  return NextResponse.json(formattedData);
} 