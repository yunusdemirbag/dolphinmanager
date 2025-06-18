import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";
import { getEtsyStores, createEtsyListing, uploadFilesToEtsy } from "@/lib/etsy-api";
import { getValidAccessToken } from "@/lib/etsy-api";

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
        
        // Etsy mağazalarını getir - önbellekten al
        const stores = await getEtsyStores(item.user_id, false);
        if (!stores || stores.length === 0) {
          await supabase
            .from('etsy_uploads')
            .update({ 
              status: 'failed', 
              error_message: 'Bağlı Etsy mağazası bulunamadı' 
            })
            .eq('id', item.id);
          
          results.push({
            id: item.id,
            status: 'failed',
            error: 'Bağlı Etsy mağazası bulunamadı'
          });
          continue;
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

export async function POST(req: NextRequest) {
  try {
    console.log("Kuyruk işleme API'sine istek geldi");
    
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
    
    // İstek gövdesini al
    const { queueId } = await req.json();
    
    if (!queueId) {
      return NextResponse.json(
        { success: false, message: "Kuyruk ID'si gereklidir" },
        { status: 400 }
      );
    }
    
    // Kuyruk kaydını bul
    const { data: queueItem, error: queueError } = await supabase
      .from('etsy_uploads')
      .select('*')
      .eq('id', queueId)
      .eq('user_id', session.user.id)
      .single();
    
    if (queueError || !queueItem) {
      return NextResponse.json(
        { success: false, message: "Kuyruk öğesi bulunamadı" },
        { status: 404 }
      );
    }
    
    // Durumu işleniyor olarak güncelle
    const { error: updateError } = await supabase
      .from('etsy_uploads')
      .update({ status: 'processing', processed_at: new Date().toISOString() })
      .eq('id', queueId);
    
    if (updateError) {
      return NextResponse.json(
        { success: false, message: "Kuyruk durumu güncellenemedi" },
        { status: 500 }
      );
    }
    
    // Etsy token'ı al
    const accessToken = await getValidAccessToken(session.user.id);
    if (!accessToken) {
      await supabase
        .from('etsy_uploads')
        .update({ 
          status: 'failed', 
          error_message: 'Geçerli Etsy token bulunamadı' 
        })
        .eq('id', queueId);
      
      return NextResponse.json(
        { success: false, message: "Geçerli Etsy token bulunamadı" },
        { status: 401 }
      );
    }
    
    // Etsy mağazalarını getir - önbellekten al
    const stores = await getEtsyStores(session.user.id, false);
    if (!stores || stores.length === 0) {
      await supabase
        .from('etsy_uploads')
        .update({ 
          status: 'failed', 
          error_message: 'Bağlı Etsy mağazası bulunamadı' 
        })
        .eq('id', queueId);
      
      return NextResponse.json(
        { success: false, message: "Bağlı Etsy mağazası bulunamadı" },
        { status: 400 }
      );
    }
    
    // Ürün verilerini al
    const productData = queueItem.product_data;
    
    try {
      // Etsy'de taslak ürün oluştur
      console.log("Etsy'de taslak ürün oluşturuluyor...");
      const draftListing = await createEtsyListing(accessToken, queueItem.shop_id, {
        ...productData,
        state: 'draft' // Önce taslak olarak oluştur
      });
      
      console.log("Taslak ürün oluşturuldu:", draftListing.listing_id);
      
      // Listing ID'yi güncelle
      await supabase
        .from('etsy_uploads')
        .update({ listing_id: draftListing.listing_id })
        .eq('id', queueId);
      
      // Görselleri yükle
      if (productData.images && productData.images.length > 0) {
        console.log("Görseller yükleniyor...");
        
        // Base64 formatındaki görselleri File nesnelerine dönüştür
        const imageFiles = productData.images.map((img: any, index: number) => {
          // Base64 verilerini ayır
          const matches = img.dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (!matches || matches.length !== 3) {
            throw new Error(`Geçersiz base64 formatı: ${img.dataUrl.substring(0, 20)}...`);
          }
          
          const type = matches[1];
          const base64Data = matches[2];
          const byteCharacters = atob(base64Data);
          const byteArrays = [];
          
          for (let i = 0; i < byteCharacters.length; i += 512) {
            const slice = byteCharacters.slice(i, i + 512);
            const byteNumbers = new Array(slice.length);
            for (let j = 0; j < slice.length; j++) {
              byteNumbers[j] = slice.charCodeAt(j);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
          }
          
          const blob = new Blob(byteArrays, { type });
          return new File([blob], `image-${index + 1}.${type.split('/')[1] || 'jpg'}`, { type });
        });
        
        // Video dosyası varsa işle
        let videoFile = null;
        if (productData.video && productData.video.dataUrl) {
          const videoMatches = productData.video.dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (videoMatches && videoMatches.length === 3) {
            const videoType = videoMatches[1];
            const videoBase64 = videoMatches[2];
            const videoBytes = atob(videoBase64);
            const videoByteArrays = [];
            
            for (let i = 0; i < videoBytes.length; i += 512) {
              const slice = videoBytes.slice(i, i + 512);
              const byteNumbers = new Array(slice.length);
              for (let j = 0; j < slice.length; j++) {
                byteNumbers[j] = slice.charCodeAt(j);
              }
              const byteArray = new Uint8Array(byteNumbers);
              videoByteArrays.push(byteArray);
            }
            
            const videoBlob = new Blob(videoByteArrays, { type: videoType });
            videoFile = new File([videoBlob], `video.${videoType.split('/')[1] || 'mp4'}`, { type: videoType });
          }
        }
        
        // Görselleri ve videoyu Etsy'ye yükle
        await uploadFilesToEtsy(
          accessToken,
          queueItem.shop_id,
          draftListing.listing_id,
          imageFiles,
          videoFile
        );
        
        console.log("Görseller başarıyla yüklendi");
      }
      
      // Ürünü aktifleştir (eğer state active olarak belirtildiyse)
      if (productData.state === 'active') {
        console.log("Ürün aktifleştiriliyor...");
        await createEtsyListing(accessToken, queueItem.shop_id, {
          listing_id: draftListing.listing_id,
          state: 'active'
        });
        console.log("Ürün aktifleştirildi");
      }
      
      // Başarılı olarak işaretle
      await supabase
        .from('etsy_uploads')
        .update({ 
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('id', queueId);
      
      return NextResponse.json({
        success: true,
        message: "Ürün başarıyla işlendi",
        listing_id: draftListing.listing_id
      });
      
    } catch (error) {
      console.error("Etsy'ye yükleme hatası:", error);
      
      // Hata durumunu güncelle
      await supabase
        .from('etsy_uploads')
        .update({ 
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Bilinmeyen hata'
        })
        .eq('id', queueId);
      
      return NextResponse.json(
        { 
          success: false, 
          message: "Etsy'ye yükleme sırasında hata oluştu",
          error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error("Kuyruk işleme hatası:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Kuyruk işlenirken beklenmeyen bir hata oluştu",
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      },
      { status: 500 }
    );
  }
} 