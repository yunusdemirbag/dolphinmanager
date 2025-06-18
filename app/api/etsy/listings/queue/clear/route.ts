import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function DELETE(request: NextRequest) {
  return clearQueue();
}

export async function POST(request: NextRequest) {
  return clearQueue();
}

async function clearQueue() {
  console.log('🗑️ KUYRUK TEMİZLEME API ÇAĞRILDI');
  
  try {
    // Service role kullan - RLS bypass için
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    console.log('🔧 Service role ile kuyruk temizleme başlatıldı');
    
    // Tüm kayıtları sil
    const { data: deletedItems, error: deleteError } = await supabase
      .from('etsy_uploads')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Tüm kayıtları sil
      .select();
    
    if (deleteError) {
      console.error('❌ Kuyruk temizlenirken hata:', deleteError);
      return NextResponse.json({ 
        error: 'Kuyruk temizlenemedi', 
        details: deleteError 
      }, { status: 500 });
    }
    
    console.log(`✅ ${deletedItems?.length || 0} kayıt silindi`);
    
    return NextResponse.json({
      success: true,
      deleted_count: deletedItems?.length || 0,
      message: `Kuyruk temizlendi: ${deletedItems?.length || 0} kayıt silindi`
    });
    
  } catch (error) {
    console.error('❌ Kuyruk temizleme hatası:', error);
    return NextResponse.json({ 
      error: 'Kuyruk temizleme başarısız', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 