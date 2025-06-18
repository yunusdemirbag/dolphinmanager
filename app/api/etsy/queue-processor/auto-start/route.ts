import { NextRequest, NextResponse } from 'next/server';

let autoProcessorInterval: NodeJS.Timeout | null = null;
let isAutoProcessorRunning = false;

// Kuyruk ayarlarını getir
async function getQueueInterval(): Promise<number> {
  try {
    const response = await fetch('http://localhost:3000/api/etsy/queue-settings');
    if (response.ok) {
      const settings = await response.json();
      return settings.settings?.default_interval || 15; // Varsayılan 15 saniye
    }
  } catch (error) {
    console.error('Kuyruk ayarları alınamadı:', error);
  }
  return 15; // Hata durumunda varsayılan 15 saniye
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 OTOMATİK KUYRUK İŞLEMCİSİ BAŞLATMA İSTEĞİ');
    
    // Eğer zaten çalışıyorsa dur
    if (isAutoProcessorRunning) {
      return NextResponse.json({ 
        success: true, 
        message: 'Otomatik kuyruk işlemcisi zaten çalışıyor',
        status: 'already_running'
      });
    }

    // Otomatik işlemciyi başlat
    await startAutoProcessor();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Otomatik kuyruk işlemcisi başlatıldı',
      status: 'started'
    });
    
  } catch (error) {
    console.error('❌ Otomatik kuyruk işlemcisi başlatma hatası:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Otomatik kuyruk işlemcisi başlatılamadı' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('🛑 OTOMATİK KUYRUK İŞLEMCİSİ DURDURMA İSTEĞİ');
    
    stopAutoProcessor();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Otomatik kuyruk işlemcisi durduruldu',
      status: 'stopped',
      isRunning: false
    });
    
  } catch (error) {
    console.error('❌ Otomatik kuyruk işlemcisi durdurma hatası:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Otomatik kuyruk işlemcisi durdurulamadı',
      isRunning: isAutoProcessorRunning
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📊 OTOMATİK KUYRUK İŞLEMCİSİ DURUM SORGUSU');
    
    return NextResponse.json({ 
      success: true, 
      isRunning: isAutoProcessorRunning,
      status: isAutoProcessorRunning ? 'running' : 'stopped'
    });
    
  } catch (error) {
    console.error('❌ Otomatik kuyruk işlemcisi durum sorgusu hatası:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Durum sorgulanamadı',
      isRunning: false
    }, { status: 500 });
  }
}

async function startAutoProcessor() {
  if (autoProcessorInterval) {
    clearInterval(autoProcessorInterval);
  }
  
  isAutoProcessorRunning = true;
  
  // Ayarlanan aralığı al (varsayılan 15 saniye)
  const intervalSeconds = await getQueueInterval();
  console.log(`✅ Otomatik kuyruk işlemcisi başlatıldı (${intervalSeconds} saniye aralık)`);
  
  // İlk çalıştırma
  processQueue();
  
  // Ayarlanan aralıkta çalıştır
  autoProcessorInterval = setInterval(() => {
    processQueue();
  }, intervalSeconds * 1000);
}

function stopAutoProcessor() {
  if (autoProcessorInterval) {
    clearInterval(autoProcessorInterval);
    autoProcessorInterval = null;
  }
  
  isAutoProcessorRunning = false;
  console.log('⏹️ Otomatik kuyruk işlemcisi durduruldu');
}

async function processQueue() {
  try {
    console.log('🔄 Otomatik kuyruk işleme başlatılıyor...');
    
    // Tek bir ürün işle
    const response = await fetch('http://localhost:3000/api/etsy/listings/queue/process', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-API-Key': process.env.INTERNAL_API_KEY || 'queue-processor-key'
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Otomatik kuyruk işleme tamamlandı:', result);
      
      // Eğer işlenecek ürün kalmadıysa otomatik işlemciyi durdur
      if (result.total_items === 0 || result.message?.includes('bulunamadı')) {
        console.log('🏁 Kuyrukta işlenecek ürün kalmadı, otomatik işlemci durduruluyor...');
        stopAutoProcessor();
      }
    } else {
      console.error('❌ Otomatik kuyruk işleme hatası:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Otomatik kuyruk işleme genel hatası:', error);
  }
}

// Sunucu kapandığında temizle
process.on('SIGTERM', () => {
  console.log('SIGTERM sinyali alındı, otomatik kuyruk işlemcisi durduruluyor...');
  stopAutoProcessor();
});

process.on('SIGINT', () => {
  console.log('SIGINT sinyali alındı, otomatik kuyruk işlemcisi durduruluyor...');
  stopAutoProcessor();
}); 