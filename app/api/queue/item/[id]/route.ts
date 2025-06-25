import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    initializeAdminApp();
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    // ⚡ SPEED: Direkt individual item al
    const doc = await adminDb.collection('queue').doc(id).get();
    
    if (!doc.exists) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
    }

    const data = doc.data()!;
    
    // ⚡ SPEED: Tüm resim ve video verilerini yükle (process için)
    const itemWithFullData = {
      id: doc.id,
      ...data,
      product_data: {
        title: data.title,
        description: data.description,
        price: data.price || 0,
        quantity: data.quantity || 4,
        tags: data.tags || [],
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
        images: [], // Will be loaded below
        video: null // Will be loaded below
      }
    };

    // LAZY LOAD: Tüm resimleri yükle (process için gerekli)
    if (data.image_refs && data.image_refs.length > 0) {
      const imagePromises = data.image_refs.map(async (imageId: string) => {
        const imageDoc = await adminDb.collection('queue_images').doc(imageId).get();
        if (!imageDoc.exists) return null;
        
        const imageData = imageDoc.data()!;
        
        if (imageData.chunks_count > 0) {
          const allChunks = await adminDb.collection('queue_image_chunks')
            .where('image_id', '==', imageId)
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
            
            return {
              name: imageData.name,
              type: imageData.type,
              base64: fullBase64,
              data: fullBase64,
              position: imageData.position || 0
            };
          }
        }
        return null;
      });

      const images = await Promise.all(imagePromises);
      const validImages = images.filter(img => img !== null);
      validImages.sort((a, b) => a.position - b.position);
      itemWithFullData.product_data.images = validImages;
    }

    // LAZY LOAD: Video yükle (process için gerekli)
    if (data.video_ref) {
      const videoDoc = await adminDb.collection('queue_videos').doc(data.video_ref).get();
      if (videoDoc.exists) {
        const videoData = videoDoc.data()!;
        
        if (videoData.chunks_count > 0) {
          const allVideoChunks = await adminDb.collection('queue_video_chunks')
            .where('video_id', '==', data.video_ref)
            .get();
          
          if (!allVideoChunks.empty) {
            const sortedVideoChunks = allVideoChunks.docs
              .map(doc => ({ data: doc.data(), id: doc.id }))
              .sort((a, b) => a.data.chunk_index - b.data.chunk_index);
            
            const videoBase64Parts: string[] = [];
            sortedVideoChunks.forEach(chunk => {
              videoBase64Parts.push(chunk.data.chunk_data);
            });
            const fullVideoBase64 = videoBase64Parts.join('');
            
            itemWithFullData.product_data.video = {
              name: videoData.filename,
              type: videoData.type,
              base64: fullVideoBase64,
              data: fullVideoBase64,
              size: videoData.size
            };
          }
        }
      }
    }

    return NextResponse.json(itemWithFullData);

  } catch (error) {
    console.error('Individual queue item error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch queue item' 
    }, { status: 500 });
  }
}