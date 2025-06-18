import { startQueueProcessor, stopQueueProcessor } from './queue-manager';

// Interval ID'sini saklayacak değişken
let queueProcessorInterval: NodeJS.Timeout | null = null;

/**
 * Kuyruk işlemcisini başlatır
 * @param intervalMs İşleme aralığı (ms)
 */
export function startQueueProcessorService(intervalMs: number = 120000): void {
  if (queueProcessorInterval) {
    console.log('Kuyruk işlemcisi zaten çalışıyor, önce durduruluyor...');
    stopQueueProcessorService();
  }
  
  console.log(`Kuyruk işlemcisi başlatılıyor (${intervalMs}ms aralıkla)...`);
  queueProcessorInterval = startQueueProcessor(intervalMs);
}

/**
 * Kuyruk işlemcisini durdurur
 */
export function stopQueueProcessorService(): void {
  if (queueProcessorInterval) {
    stopQueueProcessor(queueProcessorInterval);
    queueProcessorInterval = null;
    console.log('Kuyruk işlemcisi durduruldu');
  } else {
    console.log('Kuyruk işlemcisi zaten çalışmıyor');
  }
}

/**
 * Kuyruk işlemcisinin durumunu kontrol eder
 * @returns İşlemcinin çalışıp çalışmadığı
 */
export function isQueueProcessorRunning(): boolean {
  return queueProcessorInterval !== null;
}

// Sunucu başlatıldığında kuyruk işlemcisini otomatik başlat
// Bu sadece geliştirme ortamında çalışır, production'da cron job kullanılmalı
if (process.env.NODE_ENV === 'development' && process.env.AUTO_START_QUEUE_PROCESSOR === 'true') {
  console.log('Geliştirme ortamında kuyruk işlemcisi otomatik başlatılıyor...');
  startQueueProcessorService();
}

// Uygulama kapatıldığında kuyruk işlemcisini durdur
process.on('SIGTERM', () => {
  console.log('SIGTERM sinyali alındı, kuyruk işlemcisi durduruluyor...');
  stopQueueProcessorService();
});

process.on('SIGINT', () => {
  console.log('SIGINT sinyali alındı, kuyruk işlemcisi durduruluyor...');
  stopQueueProcessorService();
}); 