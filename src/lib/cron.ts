/**
 * Kuyruk işlemcisini cron job olarak çalıştıran betik
 * 
 * Bu betik, belirli aralıklarla kuyruk işlemcisini çalıştırır.
 * Vercel Cron Jobs veya benzeri bir servis ile çalıştırılabilir.
 * 
 * Örnek kullanım:
 * - Vercel Cron Jobs ile her 2 dakikada bir çalıştır
 * - Harici bir cron servisi ile her 2 dakikada bir çalıştır
 */

import fetch from 'node-fetch';

/**
 * Kuyruk işlemcisini çalıştır
 */
export async function processQueue() {
  try {
    console.log('Kuyruk işlemcisi çalıştırılıyor...');
    
    // API_URL tanımlı değilse hata fırlat
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      throw new Error('NEXT_PUBLIC_APP_URL tanımlı değil');
    }
    
    // Kuyruk işlemcisini çalıştır
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/etsy/listings/queue/process`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.QUEUE_PROCESSOR_API_KEY || ''
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API hatası: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Kuyruk işlemcisi başarıyla çalıştırıldı:', result.message);
      return { success: true, message: result.message };
    } else {
      throw new Error(result.error || 'Bilinmeyen hata');
    }
  } catch (error: any) {
    console.error('Kuyruk işlemcisi çalıştırılırken hata oluştu:', error);
    return { success: false, error: error.message || 'Bilinmeyen hata' };
  }
}

// Doğrudan çalıştırıldığında işlemi başlat
if (require.main === module) {
  processQueue()
    .then(result => {
      console.log('İşlem sonucu:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('İşlem hatası:', error);
      process.exit(1);
    });
} 