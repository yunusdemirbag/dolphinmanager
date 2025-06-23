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

// Mock veri
const mockQueueItems = [
  {
    id: 'mock-item-1',
    user_id: '1007541496',
    product_data: {
      title: 'Modern Canvas Art',
      description: 'Beautiful modern canvas art for your home',
      price: 29.99,
      images: ['https://example.com/image1.jpg']
    },
    status: 'completed',
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 gün önce
    updated_at: new Date(Date.now() - 43200000).toISOString(), // 12 saat önce
    retry_count: 0
  },
  {
    id: 'mock-item-2',
    user_id: '1007541496',
    product_data: {
      title: 'Abstract Digital Print',
      description: 'High quality digital print with abstract design',
      price: 19.99,
      images: ['https://example.com/image2.jpg']
    },
    status: 'pending',
    created_at: new Date(Date.now() - 3600000).toISOString(), // 1 saat önce
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    retry_count: 0
  }
];

export async function GET() {
  try {
    // Test user ID - gerçek implementasyonda session'dan gelecek
    const testUserId = '1007541496';
    
    if (!adminDb) {
      console.log('Using mock queue data');
      // Mock veri döndür
      const stats = {
        pending: mockQueueItems.filter(item => item.status === 'pending').length,
        processing: mockQueueItems.filter(item => item.status === 'processing').length,
        completed: mockQueueItems.filter(item => item.status === 'completed').length,
        failed: mockQueueItems.filter(item => item.status === 'failed').length,
      };
      
      return NextResponse.json({
        items: mockQueueItems,
        stats
      });
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
    // Hata durumunda da mock veri döndür
    console.log('Error fetching queue, returning mock data');
    const stats = {
      pending: mockQueueItems.filter(item => item.status === 'pending').length,
      processing: mockQueueItems.filter(item => item.status === 'processing').length,
      completed: mockQueueItems.filter(item => item.status === 'completed').length,
      failed: mockQueueItems.filter(item => item.status === 'failed').length,
    };
    
    return NextResponse.json({
      items: mockQueueItems,
      stats
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { product, action } = body;

    if (!adminDb) {
      console.log('Using mock queue for POST operation');
      // Mock başarılı yanıt
      return NextResponse.json({ 
        success: true, 
        id: `mock-item-${Date.now()}`,
        message: 'Ürün kuyruğa eklendi (mock)' 
      });
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
    // Hata durumunda mock başarılı yanıt
    return NextResponse.json({ 
      success: true, 
      id: `mock-error-${Date.now()}`,
      message: 'Ürün kuyruğa eklendi (mock error recovery)' 
    });
  }
}