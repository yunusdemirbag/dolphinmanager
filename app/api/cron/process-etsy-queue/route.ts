import { NextRequest, NextResponse } from "next/server";
// // import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken, createEtsyListing, uploadFilesToEtsy, getEtsyStores } from "@/lib/etsy-api";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 300; // 5 dakika

export async function GET(req: NextRequest) {
  try {
    console.log("Etsy kuyruk işleme cron görevi başlatıldı");
    
    // Supabase client oluştur
    const supabase = await createClient();
    
    // Şu anki zamanı al
    const now = new Date();
    
    // İşlenmesi gereken kuyruk öğelerini bul
    const { data: queueItems, error: queueError } = await supabase
      .from('etsy_uploads')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', now.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(10); // Tek seferde en fazla 10 öğe işle
    
    if (queueError) {
      console.error("Kuyruk öğeleri alınamadı:", queueError);
      return NextResponse.json(
        { success: false, message: "Kuyruk öğeleri alınamadı", error: queueError.message },
        { status: 500 }
      );
    }
    
    if (!queueItems || queueItems.length === 0) {
      console.log("İşlenecek kuyruk öğesi bulunamadı");
      return NextResponse.json(
        { success: true, message: "İşlenecek kuyruk öğesi bulunamadı", processed: 0 }
      );
    }
    
    console.log(`${queueItems.length} kuyruk öğesi işlenecek`);
    
    // Her bir öğeyi işle
    const results = [];
    
    for (const item of queueItems) {
      try {
        console.log(`${item.id} ID'li kuyruk öğesi işleniyor...`);
        
        // Durumu güncelle
        await supabase
          .from('etsy_uploads')
          .update({ status: 'processing', processed_at: new Date().toISOString() })
          .eq('id', item.id);
        
        // Etsy token'ı al
        const accessToken = await getValidAccessToken(item.user_id);
        
        if (!accessToken) {
          console.log(`${item.id} ID'li öğe için geçerli token bulunamadı`);
          await supabase
            .from('etsy_uploads')
            .update({ 
              status: 'failed', 
              error_message: 'Geçerli Etsy token bulunamadı' 
            })
            .eq('id', item.id);
          
          results.push({
            id: item.id,
            status: 'failed',
            error: 'Geçerli Etsy token bulunamadı'
          });
          continue;
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
        
        // Ürün verilerini al
        const productData = item.product_data;
        
        // Etsy'de taslak ürün oluştur
        console.log(`${item.id} ID'li öğe için taslak ürün oluşturuluyor...`);
        const draftListing = await createEtsyListing(accessToken, item.shop_id, {
          ...productData,
          state: 'draft' // Önce taslak olarak oluştur
        });
        
        console.log(`Taslak ürün oluşturuldu: ${draftListing.listing_id}`);
        
        // Listing ID'yi güncelle
        await supabase
          .from('etsy_uploads')
          .update({ listing_id: draftListing.listing_id })
          .eq('id', item.id);
        
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
            item.shop_id,
            draftListing.listing_id,
            imageFiles,
            videoFile
          );
          
          console.log("Görseller başarıyla yüklendi");
        }
        
        // Ürünü aktifleştir (eğer state active olarak belirtildiyse)
        if (productData.state === 'active') {
          console.log("Ürün aktifleştiriliyor...");
          await createEtsyListing(accessToken, item.shop_id, {
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
          .eq('id', item.id);
        
        results.push({
          id: item.id,
          status: 'completed',
          listing_id: draftListing.listing_id
        });
        
      } catch (error) {
        console.error(`${item.id} ID'li öğe işlenirken hata:`, error);
        
        // Hata durumunu güncelle
        await supabase
          .from('etsy_uploads')
          .update({ 
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Bilinmeyen hata'
          })
          .eq('id', item.id);
        
        results.push({
          id: item.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `${results.length} kuyruk öğesi işlendi`,
      processed: results.length,
      results
    });
    
  } catch (error) {
    console.error("Kuyruk işleme cron görevi hatası:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Kuyruk işleme cron görevi hatası", 
        error: error instanceof Error ? error.message : 'Bilinmeyen hata' 
      },
      { status: 500 }
    );
  }
} 