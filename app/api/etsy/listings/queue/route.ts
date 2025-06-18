import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";
import { addJobToQueue, QueueJobType } from '@/lib/queue-manager';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  console.log('🚀 ETSY LİSTİNG KUYRUĞA EKLEME BAŞLADI');
  
  try {
    // Supabase client oluştur
    const supabase = await createClient();
    console.log('✅ Supabase client oluşturuldu');
    
    // Kullanıcıyı doğrula
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Oturum doğrulama hatası:', sessionError);
      return NextResponse.json(
        { error: 'Yetkisiz erişim', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    
    if (!session || !session.user) {
      console.error('❌ Oturum bulunamadı');
      return NextResponse.json(
        { error: 'Yetkisiz erişim', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    console.log('✅ Kullanıcı doğrulandı:', userId);
    
    // Form verisini al
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
    
    const listingData = JSON.parse(listingDataStr);
    console.log('📝 Listing data alındı:', {
      title: listingData.title,
      price: listingData.price,
      tags: listingData.tags?.length,
      hasVariations: listingData.has_variations
    });
    
    // Dosyaları kontrol et
    const imageFiles = formData.getAll('imageFiles');
    const videoFiles = formData.getAll('videoFiles');
    
    console.log('📁 Dosyalar:', { 
      images: imageFiles.length, 
      videos: videoFiles.length 
    });
    
    // Etsy mağaza bilgisini al
    console.log('🔍 Etsy mağaza bilgisi alınıyor...');
    
    const { data: storeData, error: storeError } = await supabase
      .from('etsy_stores')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (storeError || !storeData) {
      console.error('❌ Etsy mağaza bilgisi bulunamadı');
      return NextResponse.json(
        { error: 'Etsy mağaza bilgisi bulunamadı. Lütfen önce Etsy hesabınızı bağlayın.', code: 'NO_STORE' },
        { status: 400 }
      );
    }
    
    console.log('✅ Mağaza bilgisi alındı:', storeData.shop_name);
    
    // Kuyruğa eklenecek veriyi hazırla
    const jobData = {
      listingData,
      imageFiles: imageFiles as unknown as File[],
      videoFiles: videoFiles as unknown as File[],
      shopId: storeData.shop_id
    };
    
    // Kuyruğa ekle
    const job = await addJobToQueue(
      userId, 
      QueueJobType.CREATE_ETSY_LISTING, 
      jobData
    );
    
    console.log('✅ İş kuyruğa eklendi:', job.id);
    
    return NextResponse.json({
      success: true,
      message: 'Ürün kuyruğa başarıyla eklendi',
      job_id: job.id,
      queue_position: 1 // Şimdilik sabit, gerçek kuyruk pozisyonu hesaplanabilir
    });
    
  } catch (error: any) {
    console.error('💥 GENEL HATA:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Bilinmeyen hata',
        code: 'UNKNOWN_ERROR',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 