import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  console.log('🚀 HEMEN İŞLE API ÇAĞRILDI');
  
  try {
    // Service role kullan - RLS bypass için
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    console.log('🔧 Service role ile Supabase client oluşturuldu');
    
    // Şu anda pending olan ürünleri al (tüm kullanıcılar için)
    const { data: pendingItems, error: fetchError } = await supabase
      .from('etsy_uploads')
      .select('*')
      .eq('state', 'pending');
    
    if (fetchError) {
      console.error('Pending ürünler alınırken hata:', fetchError);
      return NextResponse.json(
        { success: false, message: "Pending ürünler alınamadı", error: fetchError },
        { status: 500 }
      );
    }
    
    console.log(`📋 ${pendingItems?.length || 0} pending ürün bulundu`);
    
    if (!pendingItems || pendingItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: "İşlenecek pending ürün bulunamadı",
        updated_count: 0
      });
    }
    
        // Sadece 1 ürünü al ve işle
    const firstItem = pendingItems[0];
    
    // Şimdi kuyruk işleme API'sini çağır - TEK ÜRÜN İÇİN
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';

    const processResponse = await fetch(`${baseUrl}/api/etsy/listings/queue/process`, {
      method: 'GET',
      headers: {
        'X-Internal-API-Key': process.env.INTERNAL_API_KEY || 'queue-processor-key'
      }
    });

    let processResult;
    try {
      const responseText = await processResponse.text();
      console.log('📄 Process API yanıtı:', responseText.substring(0, 200));
      
      if (processResponse.ok) {
        processResult = JSON.parse(responseText);
      } else {
        console.error('❌ Process API hata yanıtı:', responseText);
        processResult = { success: false, error: responseText };
      }
    } catch (parseError) {
      console.error('❌ JSON parse hatası:', parseError);
      processResult = { success: false, error: 'Invalid JSON response' };
    }

    return NextResponse.json({
      success: true,
      message: `1 ürün işlendi (${pendingItems?.length || 0} ürün bekliyor)`,
      pending_count: pendingItems?.length || 0,
      processed_item_id: firstItem?.id || null,
      process_result: processResult
    });
    
  } catch (error) {
    console.error('Hemen işle API hatası:', error);
    return NextResponse.json({ 
      error: 'Failed to process immediately', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 