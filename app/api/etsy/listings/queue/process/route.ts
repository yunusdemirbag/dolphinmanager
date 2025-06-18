import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken, createEtsyListing } from "@/lib/etsy-api";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Bu endpoint, cron job tarafından çağrılacak
export async function GET(request: NextRequest) {
  console.log('🔄 KUYRUK İŞLEME BAŞLADI');
  
  try {
    // API key kontrolü (opsiyonel güvenlik önlemi)
    const apiKey = request.nextUrl.searchParams.get('api_key');
    const validApiKey = process.env.QUEUE_PROCESSOR_API_KEY;
    
    // API key kontrol edilebilir (opsiyonel)
    if (validApiKey && apiKey !== validApiKey) {
      console.error('❌ Geçersiz API key');
      return NextResponse.json(
        { error: 'Yetkisiz erişim', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    
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

    // İşlenecek kuyruk öğelerini al
    const now = new Date().toISOString();
    const { data: queueItems, error: queueError } = await supabase
      .from('etsy_uploads')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })
      .limit(5); // Bir seferde en fazla 5 öğe işle
    
    if (queueError) {
      console.error("Kuyruk öğeleri getirme hatası:", queueError);
      return NextResponse.json(
        { success: false, message: "Kuyruk öğeleri getirilirken bir hata oluştu" },
        { status: 500 }
      );
    }
    
    if (!queueItems || queueItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: "İşlenecek kuyruk öğesi bulunamadı",
        processed: 0
      });
    }
    
    console.log(`İşlenecek ${queueItems.length} kuyruk öğesi bulundu`);
    
    // Her bir kuyruk öğesini işle
    const results = [];
    
    for (const item of queueItems) {
      try {
        // Durumu güncelle
        await supabase
          .from('etsy_uploads')
          .update({ status: 'processing' })
          .eq('id', item.id);
        
        // Geçerli access token'ı al
        const accessToken = await getValidAccessToken(item.user_id);
        if (!accessToken) {
          throw new Error("Geçerli Etsy token'ı bulunamadı");
        }
        
        // Ürünü Etsy'ye yükle
        const productData = item.product_data;
        const result = await createEtsyListing(
          accessToken,
          item.shop_id,
          productData
        );
        
        if (result && result.listing_id) {
          // Başarılı yükleme
          await supabase
            .from('etsy_uploads')
            .update({
              status: 'completed',
              processed_at: new Date().toISOString(),
              listing_id: result.listing_id
            })
            .eq('id', item.id);
          
          results.push({
            id: item.id,
            status: 'completed',
            listing_id: result.listing_id
          });
        } else {
          // Başarısız yükleme
          await supabase
            .from('etsy_uploads')
            .update({
              status: 'failed',
              processed_at: new Date().toISOString(),
              error_message: 'Etsy yanıtında listing_id bulunamadı'
            })
            .eq('id', item.id);
          
          results.push({
            id: item.id,
            status: 'failed',
            error: 'Etsy yanıtında listing_id bulunamadı'
          });
        }
      } catch (error: any) {
        // Hata durumunda
        console.error(`Ürün yükleme hatası (ID: ${item.id}):`, error);
        
        await supabase
          .from('etsy_uploads')
          .update({
            status: 'failed',
            processed_at: new Date().toISOString(),
            error_message: error.message || 'Bilinmeyen hata'
          })
          .eq('id', item.id);
        
        results.push({
          id: item.id,
          status: 'failed',
          error: error.message || 'Bilinmeyen hata'
        });
      }
    }
    
    // Başarılı yanıt
    return NextResponse.json({
      success: true,
      message: `${results.length} kuyruk öğesi işlendi`,
      processed: results.length,
      results
    });
    
  } catch (error: any) {
    console.error("Kuyruk işleme hatası:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Kuyruk işlenirken bir hata oluştu",
        error: error.message
      },
      { status: 500 }
    );
  }
} 