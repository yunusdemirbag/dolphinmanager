import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken, storeEtsyShopsInDatabase } from '@/lib/etsy-api';
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
    // 2. Kullanıcı doğrulama
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("Kullanıcı doğrulama hatası:", userError);
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // 3. Access token al
    const accessToken = await getValidAccessToken(user.id);
    if (!accessToken) {
      console.error("Geçerli access token bulunamadı");
      return NextResponse.json({ message: 'No valid access token' }, { status: 401 });
    }

    // 4. Mağaza bilgisini al
    let { data: store, error: storeError } = await supabase
      .from('etsy_stores')
      .select('shop_id')
      .eq('user_id', user.id)
      .single();

    // Eğer mağaza bulunamazsa, Etsy'den çek ve kaydet
    if (storeError || !store) {
      console.log("Mağaza bulunamadı, Etsy'den çekiliyor...");
      const shopInfo = await storeEtsyShopsInDatabase(user.id, accessToken);
      if (!shopInfo) {
        return NextResponse.json({ message: 'No Etsy store found' }, { status: 400 });
      }
      store = { shop_id: shopInfo.shop_id.toString() };
    }

    // 5. Form verilerini al
    const formData = await request.formData();
    const videoFile = formData.get('video') as File;
    const videoName = formData.get('name') as string;

    if (!videoFile) {
      console.error("Video dosyası bulunamadı");
      return NextResponse.json({ message: 'No video file provided' }, { status: 400 });
    }

    // 6. Etsy'ye video yükle
    const etsyFormData = new FormData();
    etsyFormData.append('video', videoFile, videoName || videoFile.name || 'listing-video.mp4');
    etsyFormData.append('name', videoName || videoFile.name || 'listing-video.mp4');
    
    const etsyApiUrl = `https://openapi.etsy.com/v3/application/shops/${store.shop_id}/listings/${listing_id}/videos`;
    console.log("Etsy API'sine istek gönderiliyor:", etsyApiUrl);
    
    const headers = {
      'x-api-key': process.env.ETSY_CLIENT_ID || "",
      'Authorization': `Bearer ${accessToken}`,
    };

    const response = await fetch(etsyApiUrl, {
      method: 'POST',
      headers,
      body: etsyFormData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Video yükleme API hatası:", errorData);
      return NextResponse.json({ message: 'Video upload failed', details: errorData }, { status: response.status });
    }

    const result = await response.json();
    console.log("Video başarıyla yüklendi:", result);
    return NextResponse.json(result);

  } catch (error) {
    console.error("Video yükleme işleminde hata:", error);
    return NextResponse.json(
      { message: 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
} 