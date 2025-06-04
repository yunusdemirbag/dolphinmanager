import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadImageToEtsy } from '@/lib/etsy-api';

export async function POST(
  request: NextRequest,
  { params }: { params: { listingId: string } }
) {
  try {
    console.log("[COPY_IMAGE_API] Copy image API called");
    
    // Parametre kontrolü - params.listingId erişmeden önce doğrulama
    const listingId = params.listingId;
    if (!listingId) {
      return NextResponse.json(
        { error: 'Ürün ID\'si (listingId) gerekli' },
        { status: 400 }
      );
    }
    
    // İstek verileri
    const body = await request.json();
    const { originalImageUrl, alt_text } = body;
    
    if (!originalImageUrl) {
      return NextResponse.json(
        { error: 'Kaynak resim URL\'i (originalImageUrl) gerekli' },
        { status: 400 }
      );
    }
    
    // Kullanıcı bilgisini al
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[COPY_IMAGE_API] User not found:', userError);
      return NextResponse.json(
        { error: 'Oturum bulunamadı. Lütfen tekrar giriş yapın.' },
        { status: 401 }
      );
    }
    
    console.log(`[COPY_IMAGE_API] Copying image from ${originalImageUrl} to listing ${listingId}`);
    
    // Resmi indir
    const imageResponse = await fetch(originalImageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: 'Kaynak resim indirilemedi' },
        { status: 500 }
      );
    }
    
    // Blob olarak al
    const imageBlob = await imageResponse.blob();
    
    // Dosya adı oluştur
    const filename = `image_${Date.now()}.jpg`;
    
    // FormData objesi oluştur
    const formData = new FormData();
    // Server-side ortamda File nesnesi yerine doğrudan Blob kullan
    formData.append('image', imageBlob, filename);
    
    if (alt_text) {
      formData.append('alt_text', alt_text);
    }
    
    // Etsy'ye yükle
    const uploadResult = await uploadImageToEtsy(
      user.id,
      parseInt(listingId),
      formData
    );
    
    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.message || 'Resim yüklenemedi' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Resim başarıyla kopyalandı',
      image: uploadResult.image
    });
    
  } catch (error: any) {
    console.error('[COPY_IMAGE_API] Error copying image:', error);
    
    return NextResponse.json(
      { error: error.message || 'Resim kopyalanırken bir hata oluştu' },
      { status: 500 }
    );
  }
} 