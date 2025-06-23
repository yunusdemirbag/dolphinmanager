import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// QueueItem arayüzü
interface QueueItem {
  id: string;
  user_id: string;
  product_data: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string | Date;
  updated_at: string | Date;
  retry_count: number;
  processing_started_at?: string | Date;
  completed_at?: string | Date;
  error_message?: string;
  etsy_listing_id?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    const testUserId = '1007541496';

    if (!adminDb) {
      return NextResponse.json({ 
        error: 'Database connection required',
        hasItems: false
      }, { status: 503 });
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
      const queueItem = { id: doc.id, ...doc.data() } as QueueItem;

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