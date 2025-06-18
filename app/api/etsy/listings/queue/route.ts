import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";
import { getEtsyStores } from "@/lib/etsy-api";

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // Supabase client oluştur
    const supabase = await createClient();
    
    // Kullanıcı oturumunu kontrol et
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Oturum açmanız gerekiyor" },
        { status: 401 }
      );
    }

    // Etsy mağaza bilgilerini al
    const stores = await getEtsyStores(session.user.id);
    if (!stores || stores.length === 0) {
      return NextResponse.json(
        { success: false, message: "Bağlı Etsy mağazası bulunamadı" },
        { status: 404 }
      );
    }

    // İlk mağazayı kullan
    const store = stores[0];
    
    // İstek gövdesini al
    const productData = await req.json();
    
    // Kuyruk kaydı oluştur
    const { data: queueData, error: queueError } = await supabase
      .from('etsy_uploads')
      .insert({
        user_id: session.user.id,
        shop_id: store.shop_id,
        product_data: productData,
        status: 'pending',
        scheduled_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 dakika sonra
      })
      .select()
      .single();
    
    if (queueError) {
      console.error("Kuyruk kaydı oluşturma hatası:", queueError);
      return NextResponse.json(
        { success: false, message: "Ürün kuyruğa eklenirken bir hata oluştu" },
        { status: 500 }
      );
    }
    
    // Başarılı yanıt
    return NextResponse.json({
      success: true,
      message: "Ürün kuyruğa eklendi",
      queue_id: queueData.id,
      scheduled_at: queueData.scheduled_at
    });
    
  } catch (error) {
    console.error("Ürün kuyruğa eklenirken hata:", error);
    return NextResponse.json(
      { success: false, message: "Ürün kuyruğa eklenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Supabase client oluştur
    const supabase = await createClient();
    
    // Kullanıcı oturumunu kontrol et
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Oturum açmanız gerekiyor" },
        { status: 401 }
      );
    }

    // Kullanıcının kuyruk kayıtlarını al
    const { data: queueItems, error: queueError } = await supabase
      .from('etsy_uploads')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    
    if (queueError) {
      console.error("Kuyruk kayıtları getirme hatası:", queueError);
      return NextResponse.json(
        { success: false, message: "Kuyruk kayıtları getirilirken bir hata oluştu" },
        { status: 500 }
      );
    }
    
    // Başarılı yanıt
    return NextResponse.json({
      success: true,
      queue: queueItems
    });
    
  } catch (error) {
    console.error("Kuyruk kayıtları getirilirken hata:", error);
    return NextResponse.json(
      { success: false, message: "Kuyruk kayıtları getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
} 