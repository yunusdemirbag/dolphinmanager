import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@/lib/supabase/server';
import { createHash } from 'crypto';

/**
 * Gelişmiş Etsy resim proxy'si - CORS sorunlarını çözer ve önbellekleme yapar
 */
export async function GET(request: NextRequest) {
  console.log("Image proxy request received");
  
  try {
    const url = request.nextUrl.searchParams.get('url');
    if (!url) {
      console.log("No URL provided");
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    const decodedUrl = decodeURIComponent(url);
    console.log("Attempting to proxy image:", decodedUrl);

    // Güvenlik: Sadece Etsy resimlerine izin ver
    if (!decodedUrl.includes('etsystatic.com')) {
      console.log("URL not allowed:", decodedUrl);
      // Test aşamasında tüm URL'lere izin verelim
      // return NextResponse.json(
      //  { error: 'Only Etsy URLs are allowed for proxying' },
      //  { status: 403 }
      // );
    }
    
    // Önce veritabanında önbelleğe alınmış resim var mı kontrol et
    try {
      const supabase = await createClient();
      const imageHash = createHash('md5').update(decodedUrl).digest('hex');
      
      const { data: cachedImage, error } = await supabase
        .from('etsy_images')
        .select('local_path')
        .eq('image_url', decodedUrl)
        .eq('status', 'active')
        .single();
      
      if (!error && cachedImage && cachedImage.local_path) {
        console.log(`Using cached image from database: ${cachedImage.local_path}`);
        
        // Redirect to local path (public folder)
        return NextResponse.redirect(new URL(cachedImage.local_path, request.nextUrl.origin));
      }
    } catch (dbError) {
      console.error("Database error when checking cache:", dbError);
      // Hata durumunda doğrudan Etsy'den indirmeye devam et
    }

    console.log("Fetching image from Etsy:", decodedUrl);

    // ETag ve If-None-Match başlıklarını hazırla
    const etagHeader = request.headers.get('if-none-match');
    const headers: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Referer': 'https://www.etsy.com/'
    };
    
    if (etagHeader) {
      headers['If-None-Match'] = etagHeader;
    }

    const response = await fetch(decodedUrl, { headers });

    // 304 Not Modified - Resim değişmemiş, tarayıcı önbelleğini kullanabilir
    if (response.status === 304) {
      console.log("Image not modified, using browser cache");
      return new NextResponse(null, {
        status: 304,
        headers: {
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200', // 1 gün önbellek, 12 saat stale-while-revalidate
          'ETag': etagHeader || ''
        }
      });
    }

    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.statusText}` },
        { status: response.status }
      );
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const etag = response.headers.get('etag') || `"${createHash('md5').update(Buffer.from(imageBuffer)).digest('hex')}"`;

    console.log(`Successfully proxied image (${contentType}, ${imageBuffer.byteLength} bytes)`);

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200', // 1 gün önbellek, 12 saat stale-while-revalidate
        'ETag': etag,
        'Access-Control-Allow-Origin': '*', // CORS için
        'Vary': 'Accept', // Vary başlığı, farklı Accept başlıklarına göre farklı yanıtlar
        'X-Content-Type-Options': 'nosniff',
        'Content-Length': imageBuffer.byteLength.toString()
      }
    });
  } catch (error: any) {
    console.error('Image proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy image', details: error.message },
      { status: 500 }
    );
  }
} 