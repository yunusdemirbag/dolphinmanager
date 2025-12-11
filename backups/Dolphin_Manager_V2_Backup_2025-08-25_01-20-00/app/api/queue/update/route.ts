import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

export async function PUT(request: NextRequest) {
  try {
    const { itemId, field, value } = await request.json();
    
    if (!itemId || !field || value === undefined) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Firebase bağlantısını başlat
    initializeAdminApp();
    
    if (!adminDb) {
      console.error('Firebase Admin not initialized');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Güncellenecek veriyi hazırla
    const updateData: any = {
      updated_at: new Date()
    };

    // Field'a göre veriyi güncelle
    if (field === 'title') {
      updateData.title = value;
    } else if (field === 'price') {
      updateData.price = parseFloat(value);
    } else if (field === 'tags') {
      updateData.tags = Array.isArray(value) ? value : value.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
    } else {
      return NextResponse.json({ error: 'Invalid field' }, { status: 400 });
    }

    // Firebase'de güncelle
    await adminDb.collection('queue').doc(itemId).update(updateData);

    return NextResponse.json({ 
      success: true, 
      message: 'Queue item updated successfully',
      updatedField: field,
      updatedValue: value
    });

  } catch (error) {
    console.error('Error updating queue item:', error);
    return NextResponse.json({ error: 'Failed to update queue item' }, { status: 500 });
  }
}