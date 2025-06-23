import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Mock queue data için global reference
declare global {
  var mockQueueItems: any[] | undefined;
}

export async function GET() {
  try {
    if (!adminDb) {
      console.log('Using mock queue data');
      
      if (!global.mockQueueItems) {
        global.mockQueueItems = [];
      }
      
      // İstatistikler
      const stats = {
        pending: global.mockQueueItems.filter(item => item.status === 'pending').length,
        processing: global.mockQueueItems.filter(item => item.status === 'processing').length,
        completed: global.mockQueueItems.filter(item => item.status === 'completed').length,
        failed: global.mockQueueItems.filter(item => item.status === 'failed').length,
      };

      return NextResponse.json({
        items: global.mockQueueItems,
        stats,
        mock: true
      });
    }

    // Test user ID - gerçek implementasyonda session'dan gelecek
    const testUserId = '1007541496';
    
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
    return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { product, action } = body;

    if (!adminDb) {
      // Mock Firebase kullan
      console.log('Using mock queue operations');
      
      if (!global.mockQueueItems) {
        global.mockQueueItems = [];
      }
      
      if (action === 'add') {
        const queueItem = {
          id: Math.random().toString(36).substr(2, 9),
          user_id: '1007541496',
          product_data: product,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          retry_count: 0,
        };

        global.mockQueueItems.unshift(queueItem);
        
        return NextResponse.json({ 
          success: true, 
          id: queueItem.id,
          message: 'Ürün kuyruğa eklendi (mock)',
          mock: true
        });
      }

      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
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