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
    const startTime = Date.now();
    
    // URL parametrelerini al
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id') || 'local-user-123';
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const lastCreatedAt = searchParams.get('lastCreatedAt');
    
    console.log('🚀 Optimize Kuyruk Sistemi başlatıldı', { userId, status, limit });
    
    // Firebase bağlantısını başlat
    initializeAdminApp();
    
    if (!adminDb) {
      console.error('Firebase Admin not initialized');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    
    // OPTİMİZE EDİLMİŞ KUYRUK SİSTEMİ - FIREBASE QUERY İLE FİLTRELEME
    try {
      // Optimize edilmiş query - Firebase seviyesinde filtreleme
      let query = adminDb.collection('queue')
        .where('user_id', '==', userId);
      
      // Status filtresi
      if (status) {
        query = query.where('status', '==', status);
      }
      
      // Sıralama ve limit
      query = query.orderBy('created_at', 'desc').limit(limit);
      
      // Pagination desteği
      if (lastCreatedAt) {
        query = query.startAfter(new Date(lastCreatedAt));
      }
      
      console.log('📊 Firebase optimized query çalıştırılıyor...');
      const queueSnapshot = await query.get();
      
      if (queueSnapshot.empty) {
        console.log('📋 Kuyruk boş');
        return NextResponse.json({ 
          items: [], 
          totalTime: Date.now() - startTime,
          optimized: true 
        });
      }
      
      console.log(`📦 ${queueSnapshot.size} queue item bulundu, resim verileri yükleniyor...`);
      
      // Parallel işleme için Promise.all kullan
      const allItems = await Promise.all(
        queueSnapshot.docs.map(async (doc) => {
          const data = doc.data();
          
          try {
            
            // HIZLI RESİM YÜKLEMESİ - Optimize edilmiş chunk loading
            let images: any[] = [];
            if (data.image_refs && data.image_refs.length > 0) {
              try {
                // İlk sadece metadata'ları al - batch işlemi
                const imageMetadataPromises = data.image_refs.map((imageId: string) => 
                  adminDb.collection('queue_images').doc(imageId).get()
                );
                
                const imageMetadataDocs = await Promise.all(imageMetadataPromises);
                
                // Metadata'sı olan resimler için chunk'ları paralel yükle
                const imageLoadPromises = imageMetadataDocs.map(async (imageDoc, index) => {
                  if (!imageDoc.exists) return null;
                  
                  const imageData = imageDoc.data()!;
                  const imageId = data.image_refs[index];
                  
                  if (imageData.chunks_count > 0) {
                    // Chunk'ları sıralı yükle - orderBy ile daha hızlı
                    const chunkQuery = await adminDb.collection('queue_image_chunks')
                      .where('image_id', '==', imageId)
                      .orderBy('chunk_index')
                      .get();
                    
                    // Chunk'ları doğrudan sırayla birleştir
                    const combinedBase64 = chunkQuery.docs
                      .map(doc => doc.data().chunk_data)
                      .join('');
                    
                    return {
                      name: imageData.name,
                      filename: imageData.name,
                      type: imageData.type,
                      data: combinedBase64,
                      base64: combinedBase64,
                      size: combinedBase64.length
                    };
                  }
                  return null;
                });
                
                const imageResults = await Promise.all(imageLoadPromises);
                images = imageResults.filter(img => img !== null);
                
                console.log(`📷 ${images.length} resim yüklendi (${doc.id})`);
              } catch (imageError) {
                console.error('Error loading images for queue item:', doc.id, imageError);
                images = []; // Hata durumunda boş array
              }
            }
            
            // HIZLI VİDEO YÜKLEMESİ - Optimize edilmiş
            let video = null;
            if (data.video_ref) {
              try {
                const videoDoc = await adminDb.collection('queue_videos').doc(data.video_ref).get();
                if (videoDoc.exists) {
                  const videoData = videoDoc.data()!;
                  
                  if (videoData.chunks_count > 0) {
                    // Video chunk'larını sıralı yükle
                    const chunkQuery = await adminDb.collection('queue_video_chunks')
                      .where('video_id', '==', data.video_ref)
                      .orderBy('chunk_index')
                      .get();
                    
                    // Chunk'ları doğrudan birleştir
                    const combinedBase64 = chunkQuery.docs
                      .map(doc => doc.data().chunk_data)
                      .join('');
                    
                    video = {
                      name: videoData.name,
                      filename: videoData.name,
                      type: videoData.type,
                      data: combinedBase64,
                      base64: combinedBase64,
                      size: combinedBase64.length
                    };
                    
                    console.log(`🎬 Video yüklendi (${doc.id})`);
                  }
                }
              } catch (videoError) {
                console.error('Error loading video for queue item:', doc.id, videoError);
                video = null;
              }
            }
            
            return {
              id: doc.id,
              user_id: data.user_id,
              status: data.status,
              created_at: data.created_at ? data.created_at.toDate().toISOString() : new Date().toISOString(),
              updated_at: data.updated_at ? data.updated_at.toDate().toISOString() : new Date().toISOString(),
              retry_count: data.retry_count || 0,
              title: data.title || 'Unnamed Product',
              description: data.description || '',
              price: data.price || 0,
              tags: data.tags || [],
              images: images,
              video: video,
              imageCount: images.length,
              hasVideo: !!video,
              // Firebase timestamp'leri
              created_timestamp: data.created_at ? data.created_at.toDate() : new Date(),
              updated_timestamp: data.updated_at ? data.updated_at.toDate() : new Date()
            };
          } catch (itemError) {
            console.error(`Error processing queue item ${doc.id}:`, itemError);
            return null;
          }
        })
      );
      
      // Null değerleri filtrele (Promise.all sonucu)
      const validItems = allItems.filter(item => item !== null);
      
      const totalTime = Date.now() - startTime;
      
      console.log(`✅ Optimize kuyruk tamamlandı: ${validItems.length} item, ${totalTime}ms`);
      
      // Debug: Status dağılımını logla
      const statusCounts = validItems.reduce((acc: any, item: any) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {});
      console.log('📊 Status dağılımı:', statusCounts);
      
      return NextResponse.json({ 
        items: validItems,
        metadata: {
          totalItems: validItems.length,
          loadTime: totalTime,
          optimized: true,
          statusDistribution: statusCounts,
          hasMorePages: validItems.length === limit,
          timestamp: new Date().toISOString()
        }
      });
      
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

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, itemIds, user_id } = body;

    // Firebase bağlantısını başlat
    initializeAdminApp();
    
    if (!adminDb) {
      console.error('Firebase Admin not initialized');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (action === 'delete_selected') {
      if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
        console.error('❌ DELETE: Item IDs boş veya geçersiz:', itemIds);
        return NextResponse.json({ error: 'Item IDs are required' }, { status: 400 });
      }

      console.log(`🗑️ DELETE: ${itemIds.length} ürün siliniyor:`, itemIds);

      try {
        // Seçili ürünleri sil
        const batch = adminDb.batch();
        for (const itemId of itemIds) {
          const docRef = adminDb.collection('queue').doc(itemId);
          batch.delete(docRef);
          console.log(`🗑️ Silme işlemi eklendi: ${itemId}`);
        }
        await batch.commit();
        
        console.log(`✅ DELETE: ${itemIds.length} ürün başarıyla silindi`);
        return NextResponse.json({ 
          success: true, 
          message: `${itemIds.length} items deleted successfully`
        });
      } catch (deleteError) {
        console.error('❌ DELETE batch hatası:', deleteError);
        return NextResponse.json({ 
          success: false,
          error: `Delete failed: ${deleteError.message}`
        }, { status: 500 });
      }
    }

    if (action === 'clear_all') {
      // Kullanıcının tüm kuyruk ürünlerini sil
      const queueSnapshot = await adminDb.collection('queue')
        .where('user_id', '==', user_id)
        .get();

      if (!queueSnapshot.empty) {
        const batch = adminDb.batch();
        queueSnapshot.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }

      return NextResponse.json({ 
        success: true, 
        message: `All queue items deleted successfully`
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Queue DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete items' }, { status: 500 });
  }
}