import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/etsy-api';
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest, 
  { params }: { params: { listing_id: string } }
) {
  // ----------- HATA AYIKLAMA KODLARI -----------
  console.log("--- APP ROUTER: VIDEO UPLOAD HANDLER BAŞLADI ---");
  console.log("Gelen Params:", params);
  // ---------------------------------------------

  // 1. Params objesini await etme (Next.js App Router'da gerekli)
  const resolvedParams = await Promise.resolve(params);
  const listing_id = resolvedParams.listing_id;
  
  if (!listing_id) {
    console.error("Hata: Eksik listing_id");
    return NextResponse.json({ message: 'Missing listing_id' }, { status: 400 });
  }

  try {
    // Kullanıcı kimliğini al
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("Kullanıcı kimliği alınamadı:", userError);
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Kullanıcının Etsy mağazasını al
    const { data: etsyStores, error: storesError } = await supabase
      .from('etsy_stores')
      .select('shop_id')
      .eq('user_id', user.id)
      .single();
      
    if (storesError || !etsyStores) {
      console.error("Etsy mağazası bulunamadı:", storesError);
      return NextResponse.json({ message: 'No Etsy store found' }, { status: 400 });
    }
    
    const shopId = etsyStores.shop_id;

    // Geçerli access token al (OAuth2)
    console.log("Video yükleme için token alınıyor. Kullanıcı ID:", user.id);
    const accessToken = await getValidAccessToken(user.id);
    if (!accessToken) {
      console.error("Geçerli access token alınamadı");
      return NextResponse.json({ 
        message: 'Etsy API bağlantısı yenilenmelidir', 
        details: { error: 'OAuth2 token is invalid or expired' }
      }, { status: 401 });
    }
    console.log("Access token alındı, uzunluk:", accessToken.length);

    // 1. Gelen isteğin formData'sını al
    const incomingFormData = await request.formData();
    const videoFile = incomingFormData.get('video') as File | null;
    const videoName = incomingFormData.get('name') as string | null;

    if (!videoFile) {
      return NextResponse.json({ message: 'No video file uploaded.' }, { status: 400 });
    }

    console.log("Video dosyası alındı:", videoFile.name, "Boyut:", videoFile.size, "Tip:", videoFile.type);

    // 2. Etsy'e göndermek için yeni bir FormData oluştur
    const etsyFormData = new FormData();
    etsyFormData.append('video', videoFile, videoName || videoFile.name || 'listing-video.mp4');
    etsyFormData.append('name', videoName || videoFile.name || 'listing-video.mp4');
    
    // Doğru URL formatı: https://openapi.etsy.com/v3/application/shops/{shop_id}/listings/{listing_id}/videos
    const etsyApiUrl = `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/${listing_id}/videos`;
    console.log("Etsy API'sine istek gönderiliyor:", etsyApiUrl);
    
    // İstek gönderilmeden önce headers'ı kontrol et
    const headers = {
      'x-api-key': process.env.ETSY_CLIENT_ID || "",
      'Authorization': `Bearer ${accessToken}`,
    };
    
    console.log("Etsy API headers:", JSON.stringify({
      'x-api-key-length': headers['x-api-key'].length,
      'Authorization-length': headers['Authorization'].length,
    }));
    
    try {
      const etsyResponse = await fetch(etsyApiUrl, {
        method: 'POST',
        headers: headers,
        body: etsyFormData,
      });
      
      console.log("Etsy API yanıt kodu:", etsyResponse.status);
      console.log("Etsy API yanıt headers:", JSON.stringify(Object.fromEntries([...etsyResponse.headers])));
      
      if (!etsyResponse.ok) {
        const errorText = await etsyResponse.text(); // İlk olarak ham yanıtı alalım
        console.error('Etsy API Ham Yanıt:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText || 'Yanıt JSON değil' };
        }
        
        console.error('Etsy API Hata Kodu:', etsyResponse.status);
        console.error('Etsy API Hata Detayı:', errorData);
        
        // OAuth1 hatasını özel olarak ele al
        if (errorText.includes('OAuth1 support has been deprecated')) {
          console.error('OAuth1 hatası tespit edildi - token yenileme gerekli');
          return NextResponse.json({ 
            message: 'Etsy API OAuth1 hatası - yeniden bağlantı gerekli',
            status: etsyResponse.status,
            details: { error: 'OAuth1 support has been deprecated' }
          }, { status: 401 });
        }
        
        return NextResponse.json({ 
          message: 'Etsy API bir hata döndürdü.',
          status: etsyResponse.status,
          details: errorData 
        }, { status: etsyResponse.status });
      }
      
      const responseData = await etsyResponse.json();
      console.log('Etsy API Başarılı Yanıt:', responseData);
      return NextResponse.json(responseData);
    } catch (fetchError) {
      console.error('Fetch hatası:', fetchError);
      return NextResponse.json({ 
        message: 'API isteği gönderilirken hata oluştu.', 
        error: fetchError instanceof Error ? fetchError.message : String(fetchError)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Video yükleme işleyicisinde hata:', error);
    if (error instanceof Error) {
        return NextResponse.json({ message: 'Sunucu hatası: ' + error.message }, { status: 500 });
    }
    return NextResponse.json({ message: 'Bilinmeyen bir sunucu hatası oluştu.' }, { status: 500 });
  }
} 