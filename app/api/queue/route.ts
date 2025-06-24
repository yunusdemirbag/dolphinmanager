import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';
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

export async function GET(request: NextRequest) {
  try {
    // URL parametrelerini al
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');
    const status = searchParams.get('status');
    
    // Firebase bağlantısını başlat
    initializeAdminApp();
    
    if (!adminDb) {
      console.error('Firebase Admin not initialized');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    
    // Firebase'den kuyruk öğelerini çek
    try {
      console.log('Fetching queue items from Firebase');
      
      // Temel sorguyu oluştur - Şimdilik sadece collection'ı al
      let queueRef: CollectionReference | Query<DocumentData> = adminDb.collection('queue');
      
      // Filtrelemeleri uygula - Sadece userId ile filtrele, sorting'i kaldır
      if (userId) {
        queueRef = queueRef.where('user_id', '==', userId);
      }
      
      if (status) {
        queueRef = queueRef.where('status', '==', status);
      }
      
      // Firebase index olmadığı için sorting'i kaldır
      // queueRef = queueRef.orderBy('created_at', 'desc');
      
      // Sorguyu çalıştır
      const snapshot = await queueRef.get();
      
      if (snapshot.empty) {
        console.log('No queue items found in Firebase');
        return NextResponse.json({ items: [] });
      }
      
      // Sonuçları dönüştür - Referanslardan veriyi yükle
      const items: QueueItem[] = [];
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        
        // JSON string'leri parse et
        let productData;
        let variations = [];
        
        try {
          productData = JSON.parse(data.product_data_json || '{}');
          variations = JSON.parse(data.variations_json || '[]');
        } catch (parseError) {
          console.error('JSON parse error for queue item:', doc.id, parseError);
          productData = {};
        }
        
        // Resimleri ayrı koleksiyondan yükle - chunking ile
        let images = [];
        if (data.image_refs && data.image_refs.length > 0) {
          try {
            const imagePromises = data.image_refs.map(async (imageId: string) => {
              const imageDoc = await adminDb.collection('queue_images').doc(imageId).get();
              if (imageDoc.exists) {
                const imageData = imageDoc.data()!;
                
                // Parçaları yükle ve birleştir
                if (imageData.chunks_count > 0) {
                  const chunkQuery = await adminDb.collection('queue_image_chunks')
                    .where('image_id', '==', imageId)
                    .get();
                  
                  const chunks: { [key: number]: string } = {};
                  chunkQuery.forEach(chunkDoc => {
                    const chunkData = chunkDoc.data();
                    chunks[chunkData.chunk_index] = chunkData.chunk_data;
                  });
                  
                  // Sıralı parçaları birleştir
                  const sortedChunks = Object.keys(chunks)
                    .sort((a, b) => Number(a) - Number(b))
                    .map(key => chunks[Number(key)]);
                  
                  const combinedBase64 = sortedChunks.join('');
                  
                  return {
                    ...imageData,
                    base64: combinedBase64
                  };
                } else {
                  // Eski format için backward compatibility
                  return imageData;
                }
              }
              return null;
            });
            const imageResults = await Promise.all(imagePromises);
            images = imageResults.filter(img => img !== null);
          } catch (imageError) {
            console.error('Error loading images for queue item:', doc.id, imageError);
          }
        }
        
        // Video'yu ayrı koleksiyondan yükle - chunking ile
        let video = null;
        if (data.video_ref) {
          try {
            const videoDoc = await adminDb.collection('queue_videos').doc(data.video_ref).get();
            if (videoDoc.exists) {
              const videoData = videoDoc.data()!;
              
              // Parçaları yükle ve birleştir
              if (videoData.chunks_count > 0) {
                const chunkQuery = await adminDb.collection('queue_video_chunks')
                  .where('video_id', '==', data.video_ref)
                  .get();
                
                const chunks: { [key: number]: string } = {};
                chunkQuery.forEach(chunkDoc => {
                  const chunkData = chunkDoc.data();
                  chunks[chunkData.chunk_index] = chunkData.chunk_data;
                });
                
                // Sıralı parçaları birleştir
                const sortedChunks = Object.keys(chunks)
                  .sort((a, b) => Number(a) - Number(b))
                  .map(key => chunks[Number(key)]);
                
                const combinedBase64 = sortedChunks.join('');
                
                video = {
                  ...videoData,
                  base64: combinedBase64
                };
              } else {
                // Eski format için backward compatibility
                video = videoData;
              }
            }
          } catch (videoError) {
            console.error('Error loading video for queue item:', doc.id, videoError);
          }
        }
        
        items.push({
          id: doc.id,
          user_id: data.user_id,
          product_data: {
            title: data.title,
            description: data.description,
            price: data.price,
            tags: data.tags || [],
            images: images,
            video: video,
            taxonomy_id: data.taxonomy_id,
            has_variations: data.has_variations,
            variations: variations,
            created_at: data.created_at.toDate().toISOString(),
            ...productData
          },
          status: data.status,
          created_at: data.created_at.toDate().toISOString(),
          updated_at: data.updated_at.toDate().toISOString(),
          retry_count: data.retry_count || 0,
          error_message: data.error_message,
          etsy_listing_id: data.etsy_listing_id
        });
      }
      
      console.log(`Found ${items.length} queue items in Firebase`);
      return NextResponse.json({ items });
    } catch (error) {
      console.error('Error fetching queue items from Firebase:', error);
      return NextResponse.json({ error: 'Failed to fetch queue items' }, { status: 500 });
    }
  } catch (error) {
    console.error('Queue API error:', error);
    return NextResponse.json({ error: 'Failed to fetch queue items' }, { status: 500 });
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
        id: docRef.id,
        message: 'Ürün kuyruğa eklendi' 
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Queue operation error:', error);
    return NextResponse.json({ error: 'Failed to process queue operation' }, { status: 500 });
  }
}