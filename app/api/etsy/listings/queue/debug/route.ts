import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  console.log('🔍 KUYRUK DEBUG API ÇAĞRILDI');
  
  try {
    console.log('🔧 Service role ile debug başlatıldı');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Genel istatistikler
    const { data: stats, error: statsError } = await supabase
      .from('etsy_uploads')
      .select('state')
      .order('created_at', { ascending: false });

    if (statsError) {
      console.error('Stats hatası:', statsError);
      return NextResponse.json({ error: 'Stats alınamadı', details: statsError }, { status: 500 });
    }

    const total = stats?.length || 0;
    const pending = stats?.filter((item: any) => item.state === 'pending').length || 0;
    const processing = stats?.filter((item: any) => item.state === 'processing').length || 0;
    const completed = stats?.filter((item: any) => item.state === 'completed').length || 0;
    const failed = stats?.filter((item: any) => item.state === 'failed').length || 0;

    // Son 10 kayıt - detaylı
    const { data: recentItems, error: recentError } = await supabase
      .from('etsy_uploads')
      .select(`
        id,
        state,
        product_data,
        created_at,
        scheduled_at,
        processed_at,
        listing_id,
        error_message
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('Recent items hatası:', recentError);
      return NextResponse.json({ error: 'Recent items alınamadı', details: recentError }, { status: 500 });
    }

    // Türkçe görünüm için veri hazırla
    const turkceKayitlar = recentItems?.map((item: any) => {
      const title = item.product_data?.title || 'Başlık Yok';
      const shortTitle = title.length > 50 ? title.substring(0, 50) + '...' : title;
      
      const durumMap: { [key: string]: string } = {
        'pending': '⏳ Sırada Bekliyor',
        'processing': '🔄 İşleniyor', 
        'completed': '✅ Yüklendi',
        'failed': '❌ Hata'
      };
      const durum = durumMap[item.state] || '❓ Bilinmiyor';

      const olusturmaTarihi = new Date(item.created_at).toLocaleString('tr-TR', {
        timeZone: 'Europe/Istanbul',
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const islemTarihi = item.processed_at 
        ? new Date(item.processed_at).toLocaleString('tr-TR', {
            timeZone: 'Europe/Istanbul',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric', 
            hour: '2-digit',
            minute: '2-digit'
          })
        : '-';

      const aciklamaMap: { [key: string]: string } = {
        'pending': 'Kuyrukta bekliyor, yakında işlenecek',
        'processing': 'Şu anda Etsy\'ye yükleniyor',
        'completed': item.listing_id ? `Etsy'de yayınlandı (ID: ${item.listing_id})` : 'İşlem tamamlandı',
        'failed': item.error_message ? `Hata: ${item.error_message}` : 'Bilinmeyen hata oluştu'
      };
      const aciklama = aciklamaMap[item.state] || 'Durum belirsiz';

      return {
        id: item.id,
        durum,
        baslik: shortTitle,
        olusturmaTarihi,
        islemTarihi,
        aciklama,
        etsyId: item.listing_id || null,
        originalState: item.state
      };
    }) || [];

    // Özet istatistikler
    const ozet = {
      toplam: total,
      siradaBekleyen: pending,
      isleniyor: processing,
      yuklendi: completed,
      hata: failed
    };

    return NextResponse.json({
      success: true,
      ozet,
      stats: {
        total,
        pending,
        processing,
        completed,
        failed
      },
      turkceKayitlar,
      recent_items: recentItems?.map((item: any) => ({
        id: item.id,
        state: item.state,
        title: item.product_data?.title?.substring(0, 80) || 'No title',
        created_at: item.created_at,
        scheduled_at: item.scheduled_at,
        processed_at: item.processed_at,
        listing_id: item.listing_id,
        error_message: item.error_message
      })),
      all_items_count: total,
      message: `Debug: ${total} total items found`
    });

  } catch (error) {
    console.error('Debug API hatası:', error);
    return NextResponse.json({ 
      error: 'Debug failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 