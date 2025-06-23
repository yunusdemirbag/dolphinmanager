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
}

export async function GET() {
  try {
    // Test user ID - gerçek implementasyonda session'dan gelecek
    const testUserId = '1007541496';
    
    if (!adminDb) {
      return NextResponse.json({ 
        error: 'Database connection required',
        items: [],
        stats: {
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0
        }
      }, { status: 503 });
    }
    
    // Kuyruk ürünlerini al
    const queueQuery = await adminDb
      .collection('product_queue')
      .where('user_id', '==', testUserId)
      .orderBy('created_at', 'desc')
      .get();

    const queueItems = queueQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate()?.toISOString(),
      status: doc.data().status || 'pending',
    }));

    // İstatistikler
    const stats = {
      pending: queueItems.filter(item => item.status === 'pending').length,
      processing: queueItems.filter(item => item.status === 'processing').length,
      completed: queueItems.filter(item => item.status === 'completed').length,
      failed: queueItems.filter(item => item.status === 'failed').length,
    };

    return NextResponse.json({
      items: queueItems,
      stats
    });
  } catch (error) {
    console.error('Queue fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch queue',
      items: [],
      stats: {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0
      }
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { product, action } = body;

    if (!adminDb) {
      return NextResponse.json({ 
        error: 'Database connection required' 
      }, { status: 503 });
    }

    // Test user ID - gerçek implementasyonda session'dan gelecek
    const testUserId = '1007541496';

    if (action === 'add') {
      // Kuyruğa ürün ekle
      const queueItem = {
        user_id: testUserId,
        product_data: product,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
        retry_count: 0,
      };

      const docRef = await adminDb.collection('product_queue').add(queueItem);
      
      return NextResponse.json({ 
        success: true, 
        id: docRef.id,
        message: 'Ürün kuyruğa eklendi' 
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Queue operation error:', error);
    return NextResponse.json({ error: 'Queue operation failed' }, { status: 500 });
  }
}