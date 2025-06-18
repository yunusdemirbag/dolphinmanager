import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEtsyStores } from '@/lib/etsy-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  console.log('Kuyruk API\'sine istek geldi');
  
  try {
    const supabase = await createClient();
    console.log('Supabase client oluşturuldu');
    
    // Kullanıcı oturumunu kontrol et
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('Kullanıcı oturumu bulunamadı:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Kullanıcı oturumu bulundu:', user.id);
    
    // İstek verilerini al - FormData desteği ekle
    let productData: any;
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      console.log('📝 FormData request algılandı');
      const formData = await request.formData();
      
      // Listing verilerini JSON olarak parse et
      const listingDataStr = formData.get('listingData');
      if (!listingDataStr || typeof listingDataStr !== 'string') {
        console.error('❌ Listing verisi bulunamadı');
        return NextResponse.json(
          { error: 'Listing verisi bulunamadı', code: 'MISSING_DATA' },
          { status: 400 }
        );
      }
      
      productData = JSON.parse(listingDataStr);
      console.log('📝 Listing data alındı:', {
        title: productData.title,
        price: productData.price,
        tags: productData.tags?.length,
        hasVariations: productData.has_variations
      });
      
      // Dosyaları kontrol et ve base64'e çevir
      const imageFiles = formData.getAll('imageFiles') as File[];
      const videoFiles = formData.getAll('videoFiles') as File[];
      
      console.log(`📸 ${imageFiles.length} resim dosyası bulundu`);
      console.log(`🎥 ${videoFiles.length} video dosyası bulundu`);
      
      // Resim dosyalarını base64'e çevir
      if (imageFiles.length > 0) {
        const imagePromises = imageFiles.map(async (file) => {
          const buffer = await file.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          return {
            filename: file.name,
            type: file.type,
            size: file.size,
            base64: `data:${file.type};base64,${base64}`
          };
        });
        
        productData.imageFiles = await Promise.all(imagePromises);
        console.log(`✅ ${productData.imageFiles.length} resim base64'e çevrildi`);
      }
      
      // Video dosyalarını base64'e çevir
      if (videoFiles.length > 0) {
        const videoFile = videoFiles[0]; // İlk video dosyasını al
        const buffer = await videoFile.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        productData.videoFile = {
          filename: videoFile.name,
          type: videoFile.type,
          size: videoFile.size,
          base64: `data:${videoFile.type};base64,${base64}`
        };
        console.log(`✅ Video base64'e çevrildi: ${videoFile.name}`);
      }
      
    } else {
      console.log('📝 JSON request algılandı');
      productData = await request.json();
    }
    
    console.log('Ürün verileri alındı:', JSON.stringify(productData).substring(0, 100) + '...');
    
    // Mağaza bilgilerini al
    const stores = await getEtsyStores(user.id);
    console.log('Mağaza bilgileri alındı:', stores);
    
    if (!stores || stores.length === 0) {
      return NextResponse.json({ error: 'No Etsy stores found' }, { status: 400 });
    }
    
    // İlk mağazayı kullan
    const shopId = stores[0].shop_id;
    console.log('Kullanılacak mağaza ID:', shopId);
    
    // Zamanlamayı hesapla (hemen şimdi - lokal saat ile)
    const now = new Date();
    const scheduledAt = new Date(now.getTime()); // Şu anki zaman
    console.log('İşlem zamanı (lokal):', scheduledAt.toISOString());
    console.log('İşlem zamanı (Türkiye):', scheduledAt.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }));
    
         // Farklı bir yaklaşım: Önce insert sonra select
     const insertData = {
       user_id: user.id,
       shop_id: shopId,
       product_data: productData,
       state: 'pending',
       scheduled_at: scheduledAt.toISOString()
     };
     
     console.log('📝 Insert verisi hazırlandı:', { 
       user_id: insertData.user_id,
       shop_id: insertData.shop_id,
       state: insertData.state,
       scheduled_at: insertData.scheduled_at
     });
     
     // Insert işlemi
     const { data: insertResult, error: insertError } = await supabase
       .from('etsy_uploads')
       .insert(insertData)
       .select('id')
       .single();
     
     console.log('📝 Insert sonucu:', { 
       success: !insertError, 
       error: insertError, 
       insertedId: insertResult?.id 
     });
     
     if (insertError) {
       console.error('❌ Insert hatası:', insertError);
       return NextResponse.json({ error: 'Failed to add to queue', details: insertError }, { status: 500 });
     }
     
     // Insert başarılı ise, tam kaydı getir
     const { data: queueItem, error: selectError } = await supabase
       .from('etsy_uploads')
       .select('*')
       .eq('id', insertResult.id)
       .single();
     
           console.log('📝 Select sonucu:', { 
        success: !selectError, 
        error: selectError, 
        itemFound: !!queueItem 
      });
    
    if (selectError) {
      console.error('Kuyruk select hatası:', selectError);
      return NextResponse.json({ error: 'Failed to retrieve queue item', details: selectError }, { status: 500 });
    }
    
    // Verification: 5 saniye sonra kayıt hala var mı kontrol et
    setTimeout(async () => {
      try {
        const verifySupabase = await createClient();
        const { data: verifyData, error: verifyError } = await verifySupabase
          .from('etsy_uploads')
          .select('id, state')
          .eq('id', insertResult.id)
          .single();
        
        console.log('🔍 5 saniye sonra verification:', {
          found: !!verifyData,
          error: verifyError,
          id: insertResult.id
        });
      } catch (err) {
        console.log('🔍 Verification error:', err);
      }
    }, 5000);
    
    console.log('Ürün kuyruğa eklendi:', queueItem);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Product added to queue successfully',
      queueItem: queueItem,
      scheduledAt: scheduledAt.toISOString()
    });
    
  } catch (error) {
    console.error('Kuyruk API hatası:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Supabase client oluştur
         const supabase = await createClient();
    
    // Kullanıcı oturumunu kontrol et
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { success: false, message: "Oturum açmanız gerekiyor" },
        { status: 401 }
      );
    }

         // Kullanıcının kuyruk kayıtlarını al
     const { data: queueItems, error: queueError } = await supabase
       .from('etsy_uploads')
       .select('*')
       .eq('user_id', user.id)
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