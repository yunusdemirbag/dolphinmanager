import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// Base64'ü Blob objesine dönüştürme fonksiyonu (Node.js uyumlu)
function base64ToBlob(base64String: string, filename: string, mimeType: string) {
  // Base64 prefix'ini kaldır (data:image/jpeg;base64, gibi)
  const base64Data = base64String.split(',')[1] || base64String;
  
  // Base64'ü Buffer'a çevir (Node.js)
  const buffer = Buffer.from(base64Data, 'base64');
  
  // Blob benzeri obje oluştur
  return {
    buffer,
    name: filename,
    type: mimeType,
    size: buffer.length
  };
}

export async function GET(request: NextRequest) {
  console.log('🔄 KUYRUK İŞLEME BAŞLADI');
  
  try {
    // Service role kullan - RLS bypass için
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    console.log('🔧 Service role ile Supabase client oluşturuldu (RLS bypass)');
    
    // Bekleyen öğeleri al
    const { data: pendingItems, error: queryError } = await supabase
        .from('etsy_uploads')
        .select('*')
        .eq('state', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(5);
    
    if (queryError) {
      console.error('❌ Kuyruk sorgu hatası:', queryError);
      return NextResponse.json({ 
        success: false, 
        error: 'Kuyruk sorgulanamadı',
        details: queryError 
      }, { status: 500 });
    }
    
    console.log(`📊 Sorgu sonucu: ${pendingItems?.length || 0} öğe bulundu`);
    
    if (!pendingItems || pendingItems.length === 0) {
        return NextResponse.json({
          success: true,
        processed: 0,
        errors: [],
        total_items: 0,
        message: 'İşlenecek kuyruk öğesi bulunamadı'
      });
    }
    
    let processedCount = 0;
    let errors: any[] = [];
    
    // Her öğeyi işle
    for (const item of pendingItems) {
      try {
        console.log(`🔄 İşleniyor: ${item.id} - ${item.product_data?.title || 'No title'}`);
        
        // Durumu processing olarak güncelle
            await supabase
              .from('etsy_uploads')
              .update({
            state: 'processing',
            processed_at: new Date().toISOString()
              })
              .eq('id', item.id);
            
        // 🚀 GERÇEK ETSY API ÇAĞRISI
        console.log('🎯 Etsy API çağrısı yapılıyor...');
        
        // Base64 image verilerini doğrudan gönder (File dönüşümü endpoint'te yapılacak)
        const imageData: any[] = [];
        if (item.product_data?.imageFiles && Array.isArray(item.product_data.imageFiles)) {
          console.log(`🔍 ImageFiles yapısı kontrol ediliyor: ${item.product_data.imageFiles.length} adet`);
          
          for (let i = 0; i < item.product_data.imageFiles.length; i++) {
            const imageFile = item.product_data.imageFiles[i];
            console.log(`🔍 Image ${i + 1} yapısı:`, {
              hasBase64: !!imageFile.base64,
              hasType: !!imageFile.type,
              hasFilename: !!imageFile.filename,
              base64Length: imageFile.base64?.length || 0,
              base64Prefix: imageFile.base64?.substring(0, 30) || 'N/A'
            });
            
            if (imageFile && imageFile.base64 && imageFile.type) {
              imageData.push({
                base64: imageFile.base64,
                type: imageFile.type,
                filename: imageFile.filename || `image_${i + 1}.${imageFile.type.split('/')[1]}`
              });
              console.log(`📸 Base64 image ${i + 1} prepared: ${imageFile.type} (${Math.round(imageFile.base64.length * 0.75 / 1024)} KB)`);
            } else {
              console.error(`❌ Image ${i + 1} eksik veri:`, {
                hasBase64: !!imageFile?.base64,
                hasType: !!imageFile?.type,
                hasFilename: !!imageFile?.filename
              });
            }
          }
        } else {
          console.error('❌ imageFiles bulunamadı:', {
            hasImageFiles: !!item.product_data?.imageFiles,
            type: typeof item.product_data?.imageFiles,
            isArray: Array.isArray(item.product_data?.imageFiles)
          });
        }
        
        // FormData oluştur
        const formData = new FormData();
        
        // Listing verilerini JSON string olarak ekle
        const listingDataForForm = {
          user_id: item.user_id,
          shop_id: item.shop_id,
          ...item.product_data
        };
        formData.append('listingData', JSON.stringify(listingDataForForm));
        
        // Base64 resimlerini Buffer'a dönüştür ve ekle
        for (let i = 0; i < imageData.length; i++) {
          const imgData = imageData[i];
          const blob = base64ToBlob(imgData.base64, imgData.filename, imgData.type);
          // Node.js FormData için Buffer + filename
          const file = new Blob([blob.buffer], { type: blob.type });
          formData.append('imageFiles', file, blob.name);
        }
        
        // Video dosyalarını ekle (varsa)
        if (item.product_data?.videoFiles && Array.isArray(item.product_data.videoFiles)) {
          for (const videoFile of item.product_data.videoFiles) {
            if (videoFile.base64) {
              const blob = base64ToBlob(videoFile.base64, videoFile.filename, videoFile.type);
              const file = new Blob([blob.buffer], { type: blob.type });
              formData.append('videoFiles', file, blob.name);
            }
          }
        }
        
        const createResponse = await fetch(`${request.nextUrl.origin}/api/etsy/listings/create`, {
          method: 'POST',
          headers: {
            'X-Internal-API-Key': process.env.INTERNAL_API_KEY || 'queue-processor-key'
            // Content-Type otomatik olarak multipart/form-data olacak
          },
          body: formData
        });
        
        if (!createResponse.ok) {
          const errorData = await createResponse.text();
          console.error('❌ Etsy API hatası:', errorData);
          throw new Error(`Etsy API hatası: ${createResponse.status} - ${errorData}`);
        }
        
        const createResult = await createResponse.json();
        console.log('✅ Etsy API sonucu:', createResult);
        
        if (!createResult.listing_id) {
          throw new Error('Etsy API\'den listing_id alınamadı');
        }
        
        // Başarılı olarak işaretle - GERÇEK listing ID ile
      await supabase
        .from('etsy_uploads')
        .update({ 
          state: 'completed',
            listing_id: createResult.listing_id,
          processed_at: new Date().toISOString()
        })
          .eq('id', item.id);
        
        processedCount++;
        console.log(`✅ Başarılı: ${item.id} - Listing ID: ${createResult.listing_id}`);
      
    } catch (error) {
        console.error(`❌ İşlem başarısız: ${item.id}`, error);
      
        // Hata olarak işaretle
      await supabase
        .from('etsy_uploads')
        .update({ 
          state: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            processed_at: new Date().toISOString()
          })
          .eq('id', item.id);
        
        errors.push({
          id: item.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    console.log(`🎉 İşlem tamamlandı: ${processedCount} başarılı, ${errors.length} hata`);
    
    return NextResponse.json({
      success: true,
      processed: processedCount,
      errors: errors,
      total_items: pendingItems.length,
      message: `Processed ${processedCount} items successfully`
    });
    
  } catch (error) {
    console.error('❌ Kuyruk işleme genel hatası:', error);
    return NextResponse.json({ 
        success: false, 
      error: 'Kuyruk işleme başarısız',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 