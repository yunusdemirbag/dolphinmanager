import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

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

export async function GET(request: NextRequest) {
  try {
    // URL parametrelerini al
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');
    const status = searchParams.get('status');
    
    console.log('🔥 Dinamik Kuyruk Sistemi başlatıldı', { userId, status });
    
    // Firebase bağlantısını başlat
    initializeAdminApp();
    
    if (!adminDb) {
      console.error('Firebase Admin not initialized');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    
    // BASİT KUYRUK SİSTEMİ - INDEX GEREKMİYOR
    try {
      // Tüm queue collection'ını al (index gerekmez)
      const queueSnapshot = await adminDb.collection('queue').get();
      
      if (queueSnapshot.empty) {
        console.log('📋 Kuyruk boş');
        return NextResponse.json({ items: [] });
      }
      
      // Manuel filtreleme (Firebase'de değil, memory'de)
      const allItems: any[] = [];
      queueSnapshot.forEach(doc => {
        const data = doc.data();
        // Manuel userId filtresi
        if (!userId || data.user_id === userId) {
          // Manuel status filtresi  
          if (!status || data.status === status) {
            allItems.push({
              id: doc.id,
              user_id: data.user_id,
              status: data.status,
              created_at: data.created_at ? data.created_at.toDate().toISOString() : new Date().toISOString(),
              updated_at: data.updated_at ? data.updated_at.toDate().toISOString() : new Date().toISOString(),
              retry_count: data.retry_count || 0,
              product_data: {
                title: data.title || 'Unnamed Product',
                description: data.description || '',
                price: data.price || 0,
                tags: data.tags || [],
                images: [], // Basit versiyon için boş
                video: null,
                taxonomy_id: data.taxonomy_id || 1027
              }
            });
          }
        }
      });
      
      // Manuel sıralama (created_at DESC)
      allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      console.log(`✅ Kuyruk bulundu: ${allItems.length} item (toplam: ${queueSnapshot.size})`);
      return NextResponse.json({ items: allItems });
      
    } catch (error) {
      console.error('🔥 Firebase kuyruk hatası:', error);
      return NextResponse.json({ items: [] });
    }
  } catch (error) {
    console.error('Queue API error:', error);
    return NextResponse.json({ items: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { product, action, userId } = body;

    // Firebase bağlantısını başlat
    initializeAdminApp();
    
    if (!adminDb) {
      console.error('Firebase Admin not initialized');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (action === 'add') {
      // Kuyruğa ürün ekle
      const queueItem = {
        user_id: userId,
        product_data: product,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
        retry_count: 0,
      };

      const docRef = await adminDb.collection('queue').add(queueItem);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Product added to queue successfully',
        queue_id: docRef.id
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Queue POST error:', error);
    return NextResponse.json({ error: 'Failed to add item to queue' }, { status: 500 });
  }
}