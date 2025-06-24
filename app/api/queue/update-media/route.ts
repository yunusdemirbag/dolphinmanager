import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

export async function PUT(request: NextRequest) {
  try {
    const { itemId, action, imageIndex, fromIndex, toIndex } = await request.json();
    
    if (!itemId || !action) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Firebase bağlantısını başlat
    initializeAdminApp();
    
    if (!adminDb) {
      console.error('Firebase Admin not initialized');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Mevcut queue item'ı al
    const queueDoc = await adminDb.collection('queue').doc(itemId).get();
    if (!queueDoc.exists) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
    }

    const queueData = queueDoc.data()!;

    if (action === 'remove_image') {
      // Resim silme
      if (typeof imageIndex !== 'number') {
        return NextResponse.json({ error: 'Image index required' }, { status: 400 });
      }

      // Image_refs array'ını güncelle
      const imageRefs = queueData.image_refs || [];
      if (imageIndex >= 0 && imageIndex < imageRefs.length) {
        const removedImageId = imageRefs[imageIndex];
        imageRefs.splice(imageIndex, 1);

        // Firebase'de image_refs'i güncelle
        await adminDb.collection('queue').doc(itemId).update({
          image_refs: imageRefs,
          updated_at: new Date()
        });

        // İlgili image dokümanını da sil
        try {
          await adminDb.collection('queue_images').doc(removedImageId).delete();
          
          // Image chunks'ları da sil
          const chunksQuery = await adminDb.collection('queue_image_chunks')
            .where('image_id', '==', removedImageId)
            .get();
          
          const deletePromises = chunksQuery.docs.map(doc => doc.ref.delete());
          await Promise.all(deletePromises);
        } catch (deleteError) {
          console.warn('Error deleting image documents:', deleteError);
        }
      }

    } else if (action === 'reorder_images') {
      // Resim sıralama
      if (typeof fromIndex !== 'number' || typeof toIndex !== 'number') {
        return NextResponse.json({ error: 'From and to indices required' }, { status: 400 });
      }

      const imageRefs = queueData.image_refs || [];
      if (fromIndex >= 0 && fromIndex < imageRefs.length && toIndex >= 0 && toIndex < imageRefs.length) {
        // Array'de sıralama yap
        const [removed] = imageRefs.splice(fromIndex, 1);
        imageRefs.splice(toIndex, 0, removed);

        // Firebase'de güncelle
        await adminDb.collection('queue').doc(itemId).update({
          image_refs: imageRefs,
          updated_at: new Date()
        });
      }

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Media updated successfully',
      action
    });

  } catch (error) {
    console.error('Error updating media:', error);
    return NextResponse.json({ error: 'Failed to update media' }, { status: 500 });
  }
}