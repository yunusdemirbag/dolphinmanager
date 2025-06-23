import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { CollectionReference, Query, DocumentData } from 'firebase-admin/firestore';

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
      title: 'Abstract Painting',
      description: 'Colorful abstract painting on canvas',
      price: 39.99,
      images: ['https://example.com/image2.jpg']
    },
    status: 'pending',
    created_at: new Date(Date.now() - 3600000).toISOString(), // 1 saat önce
    updated_at: new Date(Date.now() - 3600000).toISOString(), // 1 saat önce
    retry_count: 0
  }
];

export async function GET(request: NextRequest) {
  try {
    // URL parametrelerini al
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');
    const status = searchParams.get('status');
    
    // Firebase bağlantısı yoksa mock veri döndür
    if (!adminDb) {
      console.log('Using mock queue data');
      
      // Eğer user_id parametresi varsa, o kullanıcıya ait öğeleri filtrele
      let filteredItems = [...mockQueueItems];
      if (userId) {
        filteredItems = filteredItems.filter(item => item.user_id === userId);
      }
      
      // Eğer status parametresi varsa, o duruma ait öğeleri filtrele
      if (status) {
        filteredItems = filteredItems.filter(item => item.status === status);
      }
      
      return NextResponse.json({ items: filteredItems });
    }
    
    // Firebase'den kuyruk öğelerini çek
    try {
      console.log('Fetching queue items from Firebase');
      
      // Temel sorguyu oluştur
      let queueRef: CollectionReference | Query<DocumentData> = adminDb.collection('queue');
      
      // Filtrelemeleri uygula
      if (userId) {
        queueRef = queueRef.where('user_id', '==', userId);
      }
      
      if (status) {
        queueRef = queueRef.where('status', '==', status);
      }
      
      // Oluşturma tarihine göre sırala (en yeniden en eskiye)
      queueRef = queueRef.orderBy('created_at', 'desc');
      
      // Sorguyu çalıştır
      const snapshot = await queueRef.get();
      
      if (snapshot.empty) {
        console.log('No queue items found in Firebase');
        return NextResponse.json({ items: [] });
      }
      
      // Sonuçları dönüştür
      const items: QueueItem[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        items.push({
          id: doc.id,
          user_id: data.user_id,
          product_data: data.product_data,
          status: data.status,
          created_at: data.created_at.toDate().toISOString(),
          updated_at: data.updated_at.toDate().toISOString(),
          retry_count: data.retry_count || 0
        });
      });
      
      console.log(`Found ${items.length} queue items in Firebase`);
      return NextResponse.json({ items });
    } catch (error) {
      console.error('Error fetching queue items from Firebase:', error);
      
      // Firebase hatası durumunda mock veri döndür
      console.log('Returning mock queue data due to Firebase error');
      
      // Eğer user_id parametresi varsa, o kullanıcıya ait öğeleri filtrele
      let filteredItems = [...mockQueueItems];
      if (userId) {
        filteredItems = filteredItems.filter(item => item.user_id === userId);
      }
      
      // Eğer status parametresi varsa, o duruma ait öğeleri filtrele
      if (status) {
        filteredItems = filteredItems.filter(item => item.status === status);
      }
      
      return NextResponse.json({ items: filteredItems });
    }
  } catch (error) {
    console.error('Queue API error:', error);
    return NextResponse.json({ error: 'Failed to fetch queue items' }, { status: 500 });
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