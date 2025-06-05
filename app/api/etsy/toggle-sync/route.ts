import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  // 1. Kullanıcı oturumunu doğrula
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Gelen veriyi al ve doğrula
  const { storeId, syncEnabled } = await request.json();
  if (!storeId || typeof syncEnabled !== 'boolean') {
    return NextResponse.json({ error: 'Eksik veya hatalı parametreler: storeId ve syncEnabled (boolean) gereklidir.' }, { status: 400 });
  }

  // 3. Veritabanını güvenli bir şekilde güncelle
  // RLS politikası sayesinde, kullanıcı sadece kendi mağazasını güncelleyebilir.
  const { error: updateError } = await supabase
    .from('etsy_stores')
    .update({ sync_enabled: syncEnabled, updated_at: new Date().toISOString() })
    .eq('id', storeId)
    .eq('user_id', session.user.id); // Bu satır kritik güvenlik sağlar

  if (updateError) {
    console.error("Toggle sync failed:", updateError);
    return NextResponse.json({ error: 'Güncelleme başarısız', details: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Senkronizasyon ayarı güncellendi.' });
} 