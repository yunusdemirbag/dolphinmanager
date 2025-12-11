import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemId, field, value } = body;
    
    if (!itemId || !field) {
      return NextResponse.json({ error: 'Item ID and field are required' }, { status: 400 });
    }
    
    initializeAdminApp();
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }
    
    // Queue item'ı güncelle
    const updateData: any = {};
    updateData[field] = value;
    updateData.updated_at = new Date();
    
    await adminDb.collection('queue').doc(itemId).update(updateData);
    
    console.log(`✅ Queue item ${itemId} field '${field}' updated successfully`);
    
    return NextResponse.json({ 
      success: true, 
      message: `Field '${field}' updated successfully` 
    });
    
  } catch (error) {
    console.error('❌ Queue item update error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to update queue item' 
    }, { status: 500 });
  }
}