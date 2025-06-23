import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Mock queue data için external reference
declare global {
  var mockQueueItems: any[] | undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    const testUserId = '1007541496';

    if (!adminDb) {
      // Mock Firebase kullan
      console.log('Using mock queue worker');
      
      // Global mock data kullan
      if (!global.mockQueueItems) {
        global.mockQueueItems = [];
      }

      if (action === 'start') {
        const pendingItems = global.mockQueueItems.filter(item => 
          item.user_id === testUserId && item.status === 'pending'
        );

        if (pendingItems.length === 0) {
          return NextResponse.json({ 
            message: 'Kuyrukte işlenecek ürün yok (mock)',
            hasItems: false,
            mock: true
          });
        }

        const queueItem = pendingItems[0];
        
        // Durumu processing olarak güncelle
        queueItem.status = 'processing';
        queueItem.updated_at = new Date().toISOString();
        queueItem.processing_started_at = new Date().toISOString();

        // Simulated processing
        setTimeout(() => {
          // %90 başarı oranı
          if (Math.random() < 0.9) {
            queueItem.status = 'completed';
            queueItem.completed_at = new Date().toISOString();
            queueItem.etsy_listing_id = Math.random().toString(36).substr(2, 9);
          } else {
            queueItem.status = 'failed';
            queueItem.error_message = 'Mock Etsy API hatası';
            queueItem.retry_count = (queueItem.retry_count || 0) + 1;
          }
          queueItem.updated_at = new Date().toISOString();
        }, 3000);

        return NextResponse.json({
          message: 'Ürün işleniyor (mock)',
          productTitle: queueItem.product_data?.title,
          hasItems: true,
          status: 'processing',
          mock: true
        });
      }

      if (action === 'status') {
        const pending = global.mockQueueItems.filter(item => 
          item.user_id === testUserId && item.status === 'pending'
        ).length;
        
        const processing = global.mockQueueItems.filter(item => 
          item.user_id === testUserId && item.status === 'processing'
        ).length;

        return NextResponse.json({
          pending,
          processing,
          hasItems: pending > 0 || processing > 0,
          mock: true
        });
      }

      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (action === 'start') {
      // Kuyruktaki pending durumundaki ilk ürünü al
      const queueQuery = await adminDb
        .collection('product_queue')
        .where('user_id', '==', testUserId)
        .where('status', '==', 'pending')
        .orderBy('created_at', 'asc')
        .limit(1)
        .get();

      if (queueQuery.empty) {
        return NextResponse.json({ 
          message: 'Kuyrukte işlenecek ürün yok',
          hasItems: false 
        });
      }

      const doc = queueQuery.docs[0];
      const queueItem = { id: doc.id, ...doc.data() };

      // Durumu processing olarak güncelle
      await doc.ref.update({
        status: 'processing',
        updated_at: new Date(),
        processing_started_at: new Date()
      });

      // Ürünü Etsy'e gönderme simülasyonu
      try {
        // Burada gerçek Etsy API çağrısı yapılacak
        await simulateEtsyUpload(queueItem.product_data);
        
        // Başarılı olursa completed olarak işaretle
        await doc.ref.update({
          status: 'completed',
          updated_at: new Date(),
          completed_at: new Date(),
          etsy_listing_id: Math.random().toString(36).substr(2, 9) // Simüle edilmiş listing ID
        });

        return NextResponse.json({
          message: 'Ürün başarıyla Etsy\'e yüklendi',
          productTitle: queueItem.product_data?.title,
          hasItems: true,
          status: 'completed'
        });

      } catch (error) {
        // Hata durumunda failed olarak işaretle
        await doc.ref.update({
          status: 'failed',
          updated_at: new Date(),
          error_message: error instanceof Error ? error.message : 'Bilinmeyen hata',
          retry_count: (queueItem.retry_count || 0) + 1
        });

        return NextResponse.json({
          message: 'Ürün yükleme başarısız',
          error: error instanceof Error ? error.message : 'Bilinmeyen hata',
          hasItems: true,
          status: 'failed'
        }, { status: 500 });
      }
    }

    if (action === 'status') {
      // Kuyruk durumunu kontrol et
      const pendingQuery = await adminDb
        .collection('product_queue')
        .where('user_id', '==', testUserId)
        .where('status', '==', 'pending')
        .get();

      const processingQuery = await adminDb
        .collection('product_queue')
        .where('user_id', '==', testUserId)
        .where('status', '==', 'processing')
        .get();

      return NextResponse.json({
        pending: pendingQuery.size,
        processing: processingQuery.size,
        hasItems: pendingQuery.size > 0 || processingQuery.size > 0
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Queue worker error:', error);
    return NextResponse.json({ error: 'Queue worker failed' }, { status: 500 });
  }
}

// Etsy API simülasyonu
async function simulateEtsyUpload(productData: any) {
  // 2-5 saniye arası bekleme (gerçek API çağrısını simüle eder)
  const delay = Math.random() * 3000 + 2000;
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // %90 başarı oranı simülasyonu
  if (Math.random() < 0.1) {
    throw new Error('Etsy API hatası: Rate limit exceeded');
  }
  
  console.log('Simulated Etsy upload for:', productData?.title);
  return { listing_id: Math.random().toString(36).substr(2, 9) };
}