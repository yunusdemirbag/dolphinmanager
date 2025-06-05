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
  const { storeId } = await request.json();
  if (!storeId) {
    return NextResponse.json({ error: 'Eksik parametre: storeId' }, { status: 400 });
  }

  // 3. Güvenli ve atomik veritabanı fonksiyonunu çağır (RPC)
  const { error: rpcError } = await supabase.rpc('handle_disconnect_etsy_store', {
    store_id_to_delete: storeId,
    app_user_id_to_verify: session.user.id
  });

  if (rpcError) {
    console.error("Disconnect RPC failed:", rpcError);
    // Fonksiyondan gelen hata mesajını kullanıcıya gösterebiliriz
    return NextResponse.json({ error: 'Bağlantı kesilemedi', details: rpcError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Mağaza bağlantısı başarıyla kesildi.' });
} 