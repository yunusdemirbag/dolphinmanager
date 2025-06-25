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
    
    // ⚡ SPEED: Debug query kaldırıldı
    
    // OPTİMİZE EDİLMİŞ KUYRUK SİSTEMİ - FIREBASE INDEX SORUNU GEÇİCİ ÇÖZÜMÜ
    try {
      // ⚡ SPEED: Basit query (index problemi için)
      let query = adminDb.collection('queue')
        .where('user_id', '==', userId);
      
      // Index eksikliği sebebiyle client-side filtering yapacağız
      const queueSnapshot = await query.get();
      
      if (queueSnapshot.empty) {
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
      
      // DÜZELTME: UI'nin beklediği nested product_data yapısını oluştur
      let allItems = queueSnapshot.docs.map(doc => {
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
          
          // 🚀 UI'nin beklediği product_data nested yapısı - TÜM ALANLAR İÇİNDE
          product_data: {
            title: (() => {
              // 🔧 BAŞLIK 140 KARAKTER KONTROLÜ VE DÜZELTMESİ
              let title = data.title || 'Unnamed Product';
              if (title.length > 140) {
                console.log(`⚠️ Queue'da uzun başlık bulundu (${title.length} karakter), kısaltılıyor...`);
                
                // Son kelimeyi sil sil, 140 karakter altına düşene kadar
                while (title.length > 140) {
                  const words = title.trim().split(' ');
                  if (words.length > 1) {
                    words.pop(); // Son kelimeyi sil
                    title = words.join(' ');
                  } else {
                    // Tek kelime varsa, 140 karakterde kes
                    title = title.substring(0, 140).trim();
                    break;
                  }
                }
                
                console.log(`✅ Queue başlığı kısaltıldı: "${title}" (${title.length} karakter)`);
              }
              return title;
            })(),
            description: data.description,
            price: data.price || 0,
            quantity: data.quantity || 4,
            tags: data.tags || [],
            images: [], // Async image loading yapılacak aşağıda
            video: data.video_ref ? { exists: true } : undefined,
            taxonomy_id: data.taxonomy_id || 2078,
            shop_section_id: data.shop_section_id,
            has_variations: data.has_variations,
            variations: data.variations_json ? JSON.parse(data.variations_json) : [],
            renewal_option: data.renewal_option || 'automatic',
            who_made: data.who_made || 'i_did',
            when_made: data.when_made || 'made_to_order',
            is_personalizable: data.is_personalizable,
            personalization_is_required: data.personalization_is_required,
            personalization_instructions: data.personalization_instructions,
            personalization_char_count_max: data.personalization_char_count_max,
            shipping_profile_id: data.shipping_profile_id,
            materials: data.materials || ['Cotton Canvas', 'Wood Frame', 'Hanger'],
            state: data.state || 'active',
            created_at: data.created_at ? data.created_at.toDate().toISOString() : new Date().toISOString()
          },
          
          // Ek bilgiler
          imageCount: data.image_refs ? data.image_refs.length : 0,
          hasVideo: !!data.video_ref,
          created_timestamp: data.created_at ? data.created_at.toDate() : new Date(),
          updated_timestamp: data.updated_at ? data.updated_at.toDate() : new Date()
        };
        
        return item;
      });
      
      // 🚀 CLIENT-SIDE FILTERING VE SORTING - Firebase index olmadığı için
      if (status) {
        allItems = allItems.filter(item => item.status === status);
      }
      
      allItems.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA; // En yeni önce
      });
      
      // Limit uygula
      const items = allItems.slice(0, limit);
      
      // ⚡ SPEED: SADECE İLK RESİM THUMBNAIL
      const itemsWithFirstImage = await Promise.all(
        items.map(async (item) => {
          try {
            if (item.imageCount > 0 && item.product_data.images.length === 0) {
              // SADECE İLK RESMİ AL - POSITION 0
              const firstImageRef = await adminDb.collection('queue_images')
                .where('queue_item_id', '==', item.id)
                .where('position', '==', 0)
                .limit(1)
                .get();
              
              if (!firstImageRef.empty) {
                const firstImageDoc = firstImageRef.docs[0];
                const imageData = firstImageDoc.data();
                
                if (imageData.chunks_count > 0) {
                  // SADECE İLK RESMİN CHUNK'LARINI YÜKLECoded
                  const allChunks = await adminDb.collection('queue_image_chunks')
                    .where('image_id', '==', firstImageDoc.id)
                    .get();
                  
                  if (!allChunks.empty) {
                    const sortedChunks = allChunks.docs
                      .map(doc => ({ data: doc.data(), id: doc.id }))
                      .sort((a, b) => a.data.chunk_index - b.data.chunk_index);
                    
                    const base64Parts: string[] = [];
                    sortedChunks.forEach(chunk => {
                      base64Parts.push(chunk.data.chunk_data);
                    });
                    const fullBase64 = base64Parts.join('');
                    
                    // SADECE 1 RESİM ARRAY'İNE EKLECoded
                    item.product_data.images = [{
                      name: imageData.name,
                      type: imageData.type,
                      base64: fullBase64,
                      data: fullBase64,
                      position: 0,
                      isPartial: false
                    }];
                  }
                }
              }
            }
          } catch (imageError) {
            console.error(`🖼️ Image loading error for ${item.id}:`, imageError);
          }
          return item;
        })
      );
      
      // ⚡ SPEED: Video loading kaldırıldı - process sırasında yüklenecek
      
      const totalTime = Date.now() - startTime;
      
      // ⚡ SPEED: Debug logları kaldırıldı
      
      // Status dağılımı
      const statusCounts = itemsWithFirstImage.reduce((acc: any, item: any) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {});
      
      return NextResponse.json({ 
        items: itemsWithFirstImage,
        metadata: {
          totalItems: itemsWithFirstImage.length,
          loadTime: totalTime,
          optimized: true,
          statusDistribution: statusCounts,
          hasMorePages: allItems.length > limit,
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