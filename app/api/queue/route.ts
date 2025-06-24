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
      console.error('🔍 DEBUG: Firebase Admin not initialized');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    
    // DEBUG: Firebase'de toplam kaç ürün var?
    try {
      const allDocsSnapshot = await adminDb.collection('queue').get();
      console.log('🔍 DEBUG: Firebase\'de toplam queue items:', allDocsSnapshot.size);
      
      if (allDocsSnapshot.size > 0) {
        console.log('🔍 DEBUG: İlk 3 item:');
        allDocsSnapshot.docs.slice(0, 3).forEach((doc, index) => {
          const data = doc.data();
          console.log(`🔍 DEBUG: Item ${index + 1}:`, {
            id: doc.id,
            user_id: data.user_id,
            status: data.status,
            title: data.title?.substring(0, 50) + '...'
          });
        });
      }
    } catch (debugError) {
      console.error('🔍 DEBUG: Firebase debug query hatası:', debugError);
    }
    
    // OPTİMİZE EDİLMİŞ KUYRUK SİSTEMİ - FIREBASE QUERY İLE FİLTRELEME
    try {
      // 🚀 INDEX HATASI ÇÖZÜMÜ - Basit query kullan
      console.log('🔧 INDEX hatası için basit query kullanılıyor...');
      
      let query;
      if (status) {
        // Status var ise sadece user_id + status (index gerektirmez)
        query = adminDb.collection('queue')
          .where('user_id', '==', userId)
          .where('status', '==', status)
          .limit(limit);
      } else {
        // Status yok ise sadece user_id (index gerektirmez)
        query = adminDb.collection('queue')
          .where('user_id', '==', userId)
          .limit(limit);
      }
      
      console.log('🔍 DEBUG: INDEX-FREE query çalıştırılıyor...', { userId, status, limit });
      const queueSnapshot = await query.get();
      console.log('🔍 DEBUG: Query sonucu:', { 
        isEmpty: queueSnapshot.empty, 
        size: queueSnapshot.size,
        docs: queueSnapshot.docs.length 
      });
      
      if (queueSnapshot.empty) {
        console.log('🔍 DEBUG: KUYRUK BOŞ - Hiç ürün yok!');
        return NextResponse.json({ 
          items: [], 
          metadata: {
            totalItems: 0,
            loadTime: Date.now() - startTime,
            optimized: true,
            statusDistribution: {},
            hasMorePages: false,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      console.log(`🔍 DEBUG: ${queueSnapshot.size} queue item bulundu!`);
      
      // DEBUG: Her doc'u detaylı logla
      queueSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`🔍 DEBUG: Item ${index + 1}:`, {
          id: doc.id,
          user_id: data.user_id,
          status: data.status,
          title: data.title,
          created_at: data.created_at,
          has_images: !!data.image_refs,
          image_count: data.image_refs?.length || 0
        });
      });
      
      // DÜZELTME: UI'nin beklediği nested product_data yapısını oluştur
      const items = queueSnapshot.docs.map(doc => {
        const data = doc.data();
        
        // UI'nin beklediği nested yapı
        const item = {
          id: doc.id,
          user_id: data.user_id,
          status: data.status,
          created_at: data.created_at ? data.created_at.toDate().toISOString() : new Date().toISOString(),
          updated_at: data.updated_at ? data.updated_at.toDate().toISOString() : new Date().toISOString(),
          retry_count: data.retry_count || 0,
          error_message: data.error_message,
          etsy_listing_id: data.etsy_listing_id,
          
          // 🚀 UI'nin beklediği product_data nested yapısı  
          product_data: {
            title: data.title || 'Unnamed Product',
            price: data.price || 0,
            tags: data.tags || [],
            images: [], // Async image loading yapılacak aşağıda
            video: data.video_ref ? { exists: true } : undefined,
            taxonomy_id: data.taxonomy_id || 2078,
            created_at: data.created_at ? data.created_at.toDate().toISOString() : new Date().toISOString()
          },
          
          // Ek bilgiler
          imageCount: data.image_refs ? data.image_refs.length : 0,
          hasVideo: !!data.video_ref,
          created_timestamp: data.created_at ? data.created_at.toDate() : new Date(),
          updated_timestamp: data.updated_at ? data.updated_at.toDate() : new Date()
        };
        
        console.log(`🔍 DEBUG: UI uyumlu item:`, {
          id: item.id,
          title: item.product_data.title,
          status: item.status,
          images: item.imageCount
        });
        return item;
      });
      
      // 🚀 CLIENT-SIDE SORTING - Firebase index olmadığı için
      items.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA; // En yeni önce
      });
      
      // 🖼️ İLK RESİM LOADING - Sadece thumbnail için
      console.log('🖼️ İlk resimler yükleniyor (thumbnail için)...');
      const itemsWithFirstImage = await Promise.all(
        items.map(async (item) => {
          try {
            console.log(`🖼️ DEBUG - Item ${item.id}: imageCount=${item.imageCount}, current_images=${item.product_data.images.length}`);
            if (item.imageCount > 0 && item.product_data.images.length === 0) {
              console.log(`🖼️ Loading thumbnail for ${item.id}...`);
              // Sadece ilk resmi al
              const firstImageRef = await adminDb.collection('queue_images')
                .where('queue_item_id', '==', item.id)
                .limit(1)
                .get();
              
              console.log(`🖼️ Image query result for ${item.id}: ${firstImageRef.size} images found`);
              
              if (!firstImageRef.empty) {
                const firstImageDoc = firstImageRef.docs[0];
                const imageData = firstImageDoc.data();
                console.log(`🖼️ Found image doc for ${item.id}: chunks=${imageData.chunks_count}`);
                
                if (imageData.chunks_count > 0) {
                  // INDEX-FREE BASE64 LOADING - Client-side sorting
                  const allChunks = await adminDb.collection('queue_image_chunks')
                    .where('image_id', '==', firstImageDoc.id)
                    .get();
                  
                  if (!allChunks.empty) {
                    console.log(`🖼️ Found ${allChunks.size} chunks for ${item.id}`);
                    
                    // Tüm chunk'ları sırala ve birleştir
                    const sortedChunks = allChunks.docs
                      .map(doc => ({ data: doc.data(), id: doc.id }))
                      .sort((a, b) => a.data.chunk_index - b.data.chunk_index);
                    
                    console.log(`🖼️ Sorted chunks for ${item.id}:`, sortedChunks.map(c => c.data.chunk_index));
                    
                    const base64Parts: string[] = [];
                    sortedChunks.forEach(chunk => {
                      base64Parts.push(chunk.data.chunk_data);
                    });
                    const fullBase64 = base64Parts.join('');
                    
                    item.product_data.images = [{
                      name: imageData.name,
                      type: imageData.type,
                      base64: fullBase64, // Tam base64 data
                      data: fullBase64,   // processQueueItem için ek field
                      isPartial: false
                    }];
                    
                    console.log(`🖼️ Full thumbnail yüklendi: ${item.id} (${fullBase64.length} chars)`);
                  } else {
                    console.warn(`⚠️ No chunks found for image ${firstImageDoc.id}`);
                  }
                } else {
                  console.warn(`⚠️ Image has 0 chunks: ${firstImageDoc.id}`);
                }
              }
            }
          } catch (imageError) {
            console.error(`🖼️ Image loading error for ${item.id}:`, imageError);
          }
          return item;
        })
      );
      
      console.log('🔍 DEBUG: Final items with thumbnails:', itemsWithFirstImage.length);
      
      // 🎥 VIDEO LOADING - Sadece varsa
      console.log('🎥 Video yükleniyor (varsa)...');
      const itemsWithVideo = await Promise.all(
        itemsWithFirstImage.map(async (item) => {
          try {
            console.log(`🎥 DEBUG - Item ${item.id}: hasVideo=${item.hasVideo}, current_video=${!!item.product_data.video}, has_video_data=${!!item.product_data.video?.data}`);
            if (item.hasVideo && (!item.product_data.video || !item.product_data.video.data)) {
              console.log(`🎥 Loading video for ${item.id}...`);
              
              // Video metadata'yı al
              const videoRef = await adminDb.collection('queue_videos')
                .where('queue_item_id', '==', item.id)
                .limit(1)
                .get();
              
              console.log(`🎥 Video query result for ${item.id}: ${videoRef.size} videos found`);
              
              if (!videoRef.empty) {
                const videoDoc = videoRef.docs[0];
                const videoData = videoDoc.data();
                console.log(`🎥 Found video doc for ${item.id}: chunks=${videoData.chunks_count}`);
                
                if (videoData.chunks_count > 0) {
                  // VIDEO CHUNKS LOADING - Client-side sorting
                  const allVideoChunks = await adminDb.collection('queue_video_chunks')
                    .where('video_id', '==', videoDoc.id)
                    .get();
                  
                  if (!allVideoChunks.empty) {
                    console.log(`🎥 Found ${allVideoChunks.size} video chunks for ${item.id}`);
                    
                    // Video chunk'ları sırala ve birleştir
                    const sortedVideoChunks = allVideoChunks.docs
                      .map(doc => ({ data: doc.data(), id: doc.id }))
                      .sort((a, b) => a.data.chunk_index - b.data.chunk_index);
                    
                    console.log(`🎥 Sorted video chunks for ${item.id}:`, sortedVideoChunks.map(c => c.data.chunk_index));
                    
                    const videoBase64Parts: string[] = [];
                    sortedVideoChunks.forEach(chunk => {
                      videoBase64Parts.push(chunk.data.chunk_data);
                    });
                    const fullVideoBase64 = videoBase64Parts.join('');
                    
                    item.product_data.video = {
                      name: videoData.filename,
                      type: videoData.type,
                      base64: fullVideoBase64,
                      data: fullVideoBase64, // processQueueItem için ek field
                      size: videoData.size
                    };
                    
                    console.log(`🎥 Full video yüklendi: ${item.id} (${fullVideoBase64.length} chars)`);
                  } else {
                    console.warn(`⚠️ No video chunks found for video ${videoDoc.id}`);
                  }
                } else {
                  console.warn(`⚠️ Video has 0 chunks: ${videoDoc.id}`);
                }
              }
            }
          } catch (videoError) {
            console.error(`🎥 Video loading error for ${item.id}:`, videoError);
          }
          return item;
        })
      );
      
      console.log('🔍 DEBUG: Final items with videos:', itemsWithVideo.length);
      
      const totalTime = Date.now() - startTime;
      
      console.log(`✅ INDEX-FREE kuyruk + thumbnails + videos tamamlandı: ${itemsWithVideo.length} item, ${totalTime}ms`);
      
      // Status dağılımı
      const statusCounts = itemsWithVideo.reduce((acc: any, item: any) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {});
      
      return NextResponse.json({ 
        items: itemsWithVideo,
        metadata: {
          totalItems: itemsWithVideo.length,
          loadTime: totalTime,
          optimized: true,
          statusDistribution: statusCounts,
          hasMorePages: items.length === limit,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('🔥 Firebase kuyruk hatası:', error);
      return NextResponse.json({ 
        items: [],
        metadata: {
          totalItems: 0,
          loadTime: Date.now() - startTime,
          optimized: true,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    console.error('Queue API error:', error);
    return NextResponse.json({ 
      items: [],
      metadata: {
        totalItems: 0,
        loadTime: 0,
        optimized: true,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    });
  }
}

// Diğer HTTP metodları...
export async function POST(request: NextRequest) {
  return NextResponse.json({ message: 'POST method not implemented yet' });
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ DELETE queue API çağrısı başlatıldı');
    
    const body = await request.json();
    const { action, itemIds, user_id } = body;
    
    console.log('🗑️ DELETE parametreleri:', { action, itemIds, user_id });

    // Firebase bağlantısını başlat
    initializeAdminApp();
    
    if (!adminDb) {
      console.error('🗑️ Firebase Admin not initialized');
      return NextResponse.json({ 
        success: false,
        error: 'Database connection failed' 
      }, { status: 500 });
    }

    if (!user_id) {
      return NextResponse.json({ 
        success: false,
        error: 'User ID is required' 
      }, { status: 400 });
    }

    if (action === 'delete_selected') {
      if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
        console.error('❌ DELETE: Item IDs boş veya geçersiz:', itemIds);
        return NextResponse.json({ 
          success: false,
          error: 'Item IDs are required' 
        }, { status: 400 });
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
          error: `Delete failed: ${deleteError instanceof Error ? deleteError.message : 'Unknown error'}`
        }, { status: 500 });
      }
    }

    if (action === 'clear_all') {
      console.log('🗑️ CLEAR ALL: Tüm kuyruk temizleniyor...');
      
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
        
        console.log(`✅ CLEAR ALL: ${queueSnapshot.size} ürün silindi`);
      }

      return NextResponse.json({ 
        success: true, 
        message: `All queue items deleted successfully (${queueSnapshot.size} items)`
      });
    }

    return NextResponse.json({ 
      success: false,
      error: 'Invalid action' 
    }, { status: 400 });
    
  } catch (error) {
    console.error('❌ Queue DELETE API hatası:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Delete operation failed'
    }, { status: 500 });
  }
}