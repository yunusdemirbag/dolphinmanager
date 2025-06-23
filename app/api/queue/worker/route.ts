import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { CollectionReference, Query, DocumentData, Timestamp } from 'firebase-admin/firestore';

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
    const { action, itemId } = body;

    const testUserId = '1007541496';

    if (!adminDb) {
      console.log('Using mock queue worker data');
      
      if (action === 'start') {
        // Mock işleme yanıtı
        return NextResponse.json({
          success: true,
          message: 'Processing started (mock)',
          item: {
            id: itemId || 'mock-item-2',
            status: 'processing',
            processing_started_at: new Date().toISOString()
          }
        });
      } else if (action === 'complete') {
        // Mock tamamlama yanıtı
        return NextResponse.json({
          success: true,
          message: 'Processing completed (mock)',
          item: {
            id: itemId || 'mock-item-2',
            status: 'completed',
            completed_at: new Date().toISOString()
          }
        });
      } else if (action === 'fail') {
        // Mock hata yanıtı
        return NextResponse.json({
          success: true,
          message: 'Processing failed (mock)',
          item: {
            id: itemId || 'mock-item-2',
            status: 'failed',
            error_message: body.error || 'Unknown error'
          }
        });
      } else {
        return NextResponse.json({
          success: false,
          message: 'Invalid action'
        }, { status: 400 });
      }
    }

    // Firebase'den gerçek işlemler
    try {
      console.log(`Queue worker API called with action: ${action}, itemId: ${itemId}`);
      
      if (!itemId) {
        return NextResponse.json({
          success: false,
          message: 'Item ID is required'
        }, { status: 400 });
      }
      
      // Kuyruk koleksiyonu referansı
      const queueCollection: CollectionReference = adminDb.collection('queue');
      
      // İlgili kuyruk öğesini al
      const queueItemRef = queueCollection.doc(itemId);
      const queueItemDoc = await queueItemRef.get();
      
      if (!queueItemDoc.exists) {
        console.log(`Queue item ${itemId} not found`);
        return NextResponse.json({
          success: false,
          message: 'Queue item not found'
        }, { status: 404 });
      }
      
      const queueItemData = queueItemDoc.data();
      
      if (action === 'start') {
        // İşleme başla
        await queueItemRef.update({
          status: 'processing',
          processing_started_at: Timestamp.now(),
          updated_at: Timestamp.now()
        });
        
        console.log(`Started processing queue item ${itemId}`);
        return NextResponse.json({
          success: true,
          message: 'Processing started',
          item: {
            id: itemId,
            status: 'processing',
            processing_started_at: new Date().toISOString()
          }
        });
      } else if (action === 'complete') {
        // İşlemi tamamla
        const updateData: any = {
          status: 'completed',
          completed_at: Timestamp.now(),
          updated_at: Timestamp.now()
        };
        
        // Etsy listing ID varsa ekle
        if (body.etsy_listing_id) {
          updateData.etsy_listing_id = body.etsy_listing_id;
        }
        
        await queueItemRef.update(updateData);
        
        console.log(`Completed processing queue item ${itemId}`);
        return NextResponse.json({
          success: true,
          message: 'Processing completed',
          item: {
            id: itemId,
            status: 'completed',
            completed_at: new Date().toISOString(),
            etsy_listing_id: body.etsy_listing_id
          }
        });
      } else if (action === 'fail') {
        // Hata durumu
        const retryCount = queueItemData?.retry_count || 0;
        
        await queueItemRef.update({
          status: 'failed',
          error_message: body.error || 'Unknown error',
          retry_count: retryCount + 1,
          updated_at: Timestamp.now()
        });
        
        console.log(`Failed processing queue item ${itemId}: ${body.error || 'Unknown error'}`);
        return NextResponse.json({
          success: true,
          message: 'Processing failed',
          item: {
            id: itemId,
            status: 'failed',
            error_message: body.error || 'Unknown error',
            retry_count: retryCount + 1
          }
        });
      } else {
        return NextResponse.json({
          success: false,
          message: 'Invalid action'
        }, { status: 400 });
      }
    } catch (error) {
      console.error('Error processing queue worker action:', error);
      
      // Firebase hatası durumunda mock yanıt döndür
      console.log('Returning mock response due to Firebase error');
      
      if (action === 'start') {
        return NextResponse.json({
          success: true,
          message: 'Processing started (mock fallback)',
          item: {
            id: itemId || 'mock-item-2',
            status: 'processing',
            processing_started_at: new Date().toISOString()
          }
        });
      } else if (action === 'complete') {
        return NextResponse.json({
          success: true,
          message: 'Processing completed (mock fallback)',
          item: {
            id: itemId || 'mock-item-2',
            status: 'completed',
            completed_at: new Date().toISOString()
          }
        });
      } else if (action === 'fail') {
        return NextResponse.json({
          success: true,
          message: 'Processing failed (mock fallback)',
          item: {
            id: itemId || 'mock-item-2',
            status: 'failed',
            error_message: body.error || 'Unknown error'
          }
        });
      } else {
        return NextResponse.json({
          success: false,
          message: 'Invalid action'
        }, { status: 400 });
      }
    }
  } catch (error) {
    console.error('Queue worker API error:', error);
    return NextResponse.json({ error: 'Failed to process queue worker action' }, { status: 500 });
  }
}