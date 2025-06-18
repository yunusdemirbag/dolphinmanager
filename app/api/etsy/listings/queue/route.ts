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

    // Etsy mağaza bilgilerini al
    const stores = await getEtsyStores(session.user.id);
    if (!stores || stores.length === 0) {
      console.log("Bağlı Etsy mağazası bulunamadı");
      return NextResponse.json(
        { 
          success: false, 
          message: "Bağlı Etsy mağazası bulunamadı. Lütfen önce Etsy mağazanızı bağlayın.",
          error: "NO_ETSY_STORE" 
        },
        { status: 404 }
      );
    }
    console.log("Etsy mağaza bilgileri alındı:", stores[0].shop_id);

    // İlk mağazayı kullan
    const store = stores[0];
    
    try {
      // İstek gövdesini al
      const productData = await req.json();
      console.log("Alınan ürün verisi türü:", typeof productData);
      console.log("Ürün verisi anahtarları:", Object.keys(productData));
      
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
          { 
            success: false, 
            message: "Ürün kuyruğa eklenirken veritabanı hatası oluştu", 
            error: queueError.message || queueError.code,
            details: queueError
          },
          { status: 500 }
        );
      }
      
      console.log("Kuyruk kaydı başarıyla oluşturuldu:", queueData.id);
      
      // Başarılı yanıt
      return NextResponse.json({
        success: true,
        message: "Ürün kuyruğa eklendi",
        queue_id: queueData.id,
        scheduled_at: queueData.scheduled_at
      });
    } catch (parseError) {
      console.error("İstek gövdesi işlenirken hata:", parseError);
      return NextResponse.json(
        { 
          success: false, 
          message: "İstek verisi işlenirken hata oluştu", 
          error: parseError instanceof Error ? parseError.message : "Bilinmeyen hata" 
        },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error("Ürün kuyruğa eklenirken hata:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Ürün kuyruğa eklenirken bir hata oluştu", 
        error: error instanceof Error ? error.message : "Bilinmeyen hata" 
      },
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