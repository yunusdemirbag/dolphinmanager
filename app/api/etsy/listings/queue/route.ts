import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";
import { getEtsyStores } from "@/lib/etsy-api";

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    console.log("Kuyruk API'sine istek geldi");
    
    // Supabase client oluştur
    const supabase = await createClient();
    console.log("Supabase client oluşturuldu");
    
    // Kullanıcı oturumunu kontrol et
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log("Oturum bulunamadı");
      return NextResponse.json(
        { success: false, message: "Oturum açmanız gerekiyor" },
        { status: 401 }
      );
    }
    console.log("Kullanıcı oturumu bulundu:", session.user.id);

    // İstek gövdesini al
    const productData = await req.json();
    console.log("Ürün verileri alındı:", JSON.stringify(productData).substring(0, 100) + "...");

    // Etsy mağazalarını getir - skipCache=false ile önbellekten al
    const stores = await getEtsyStores(session.user.id, false);
    console.log("Mağaza bilgileri alındı:", stores);

    if (!stores || stores.length === 0) {
      console.log("Bağlı Etsy mağazası bulunamadı");
      return NextResponse.json(
        { 
          success: false, 
          message: "Bağlı Etsy mağazası bulunamadı. Lütfen önce Etsy mağazanızı bağlayın.",
          code: "NO_ETSY_STORE"
        },
        { status: 400 }
      );
    }

    const shopId = stores[0].shop_id;
    console.log("Kullanılacak mağaza ID:", shopId);

    // Şu anki zamanı al
    const now = new Date();
    // 2 dakika sonrasını hesapla
    const scheduledAt = new Date(now.getTime() + 2 * 60 * 1000);
    console.log("İşlem zamanı:", scheduledAt);

    // Ürünü veritabanına ekle
    const { data: queueData, error: queueError } = await supabase
      .from('etsy_uploads')
      .insert({
        user_id: session.user.id,
        shop_id: shopId,
        product_data: productData,
        status: 'pending',
        scheduled_at: scheduledAt.toISOString()
      })
      .select();

    if (queueError) {
      console.error("Veritabanı hatası:", queueError);
      return NextResponse.json(
        { success: false, message: "Ürün kuyruğa eklenirken bir hata oluştu: " + queueError.message },
        { status: 500 }
      );
    }

    console.log("Ürün kuyruğa eklendi:", queueData);

    return NextResponse.json(
      { 
        success: true, 
        message: "Ürün başarıyla kuyruğa eklendi",
        data: queueData?.[0] || null
      }
    );

  } catch (error) {
    console.error("Kuyruk API hatası:", error);
    return NextResponse.json(
      { success: false, message: `Beklenmeyen bir hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}` },
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