import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  console.log('🚀 HEMEN İŞLE API ÇAĞRILDI');
  
  try {
    const supabase = await createClient();
    
    // Kullanıcı oturumunu kontrol et
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Şu anda pending olan ürünleri al
    const { data: pendingItems, error: fetchError } = await supabase
      .from('etsy_uploads')
      .select('*')
      .eq('state', 'pending')
      .eq('user_id', user.id);
    
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
    
    // Şimdi kuyruk işleme API'sini çağır
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
      message: `${pendingItems?.length || 0} ürün işleme başlatıldı`,
      pending_count: pendingItems?.length || 0,
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