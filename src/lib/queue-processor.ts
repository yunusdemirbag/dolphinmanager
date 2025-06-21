// Kuyruk İşlemcisi - Etsy ürün yükleme kuyruğunu işler

// Kuyruk İşlemcisi - Etsy ürün yükleme kuyruğunu işler
let isRunning = false;
let processingInterval: NodeJS.Timeout | null = null;

// Kuyruk işlemcisini başlat
export function startQueueProcessor() {
  if (isRunning) {
    console.log('🔄 Kuyruk işleyici zaten çalışıyor');
    return;
  }

  isRunning = true;
  console.log('🚀 Kuyruk işleyici başlatıldı');

  // 30 saniye aralıklarla işle (test için, production'da 2 dakika olacak)
  const intervalMs = process.env.QUEUE_PROCESS_INTERVAL_MS ? 
    parseInt(process.env.QUEUE_PROCESS_INTERVAL_MS) : 30000;

  processingInterval = setInterval(async () => {
    if (!isRunning) return;

    console.log('🔄 Kuyruk işleyici çalışıyor...');
    
    try {
      // Kuyruk işleme endpoint'ini çağır
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/etsy/listings/queue/process`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-API-Key': process.env.INTERNAL_API_KEY || 'queue-processor-key',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.processed > 0) {
        console.log(`✅ ${result.processed} öğe başarıyla işlendi`);
      }
      
      if (result.errors && result.errors.length > 0) {
        console.log(`❌ ${result.errors.length} öğe işlenirken hata oluştu`);
      }

    } catch (error) {
      console.error('❌ Kuyruk işleme hatası:', error);
    }
  }, intervalMs);

  console.log(`⏰ Kuyruk işleyici ${intervalMs}ms aralıklarla çalışacak`);
}

// Kuyruk işlemcisini durdur
export function stopQueueProcessor() {
  if (!isRunning) {
    console.log('⏹️ Kuyruk işleyici zaten durmuş');
    return;
  }

  isRunning = false;
  
  if (processingInterval) {
    clearInterval(processingInterval);
    processingInterval = null;
  }

  console.log('⏹️ Kuyruk işleyici durduruldu');
}

// Kuyruk işlemcisinin durumunu kontrol et
export function getQueueProcessorStatus() {
  return {
    isRunning,
    intervalMs: process.env.QUEUE_PROCESS_INTERVAL_MS ? 
      parseInt(process.env.QUEUE_PROCESS_INTERVAL_MS) : 30000
  };
}

// Process sinyallerini dinle
process.on('SIGTERM', () => {
  console.log('SIGTERM sinyali alındı, kuyruk işlemcisi durduruluyor...');
  stopQueueProcessor();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT sinyali alındı, kuyruk işlemcisi durduruluyor...');
  stopQueueProcessor();
  process.exit(0);
});

// Sunucu başlatıldığında kuyruk işlemcisini otomatik başlat
// Bu sadece geliştirme ortamında çalışır, production'da cron job kullanılmalı
if (process.env.NODE_ENV === 'development' && process.env.AUTO_START_QUEUE_PROCESSOR === 'true') {
  console.log('Geliştirme ortamında kuyruk işlemcisi otomatik başlatılıyor...');
  startQueueProcessor();
} 