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
      
      // Manuel filtreleme + resim verilerini yükle
      const allItems: any[] = [];
      
      for (const doc of queueSnapshot.docs) {
        const data = doc.data();
        // Manuel userId filtresi
        if (!userId || data.user_id === userId) {
          // Manuel status filtresi  
          if (!status || data.status === status) {
            
            // Resimleri ayrı koleksiyondan yükle
            let images: any[] = [];
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
                        name: imageData.name,
                        type: imageData.type,
                        data: combinedBase64
                      };
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
            
            // Video'yu ayrı koleksiyondan yükle
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
                      name: videoData.name,
                      type: videoData.type,
                      data: combinedBase64
                    };
                  }
                }
              } catch (videoError) {
                console.error('Error loading video for queue item:', doc.id, videoError);
              }
            }
            
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
                images: images,
                video: video,
                taxonomy_id: data.taxonomy_id || 1027,
                has_variations: data.has_variations,
                variations: data.variations_json ? JSON.parse(data.variations_json) : [],
                who_made: data.who_made || 'i_did',
                when_made: data.when_made || '2020_2024',
                shipping_profile_id: data.shipping_profile_id,
                is_personalizable: data.is_personalizable || false,
                personalization_is_required: data.personalization_is_required || false,
                personalization_char_count_max: data.personalization_char_count_max || 0,
                personalization_instructions: data.personalization_instructions || '',
                is_supply: data.is_supply || false,
                renewal_option: data.renewal_option || 'automatic'
              }
            });
          }
        }
      }
      
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