import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  console.log('🧪 VERİTABANI TEST API ÇAĞRILDI');
  
  try {
    const supabase = await createClient();
    
    // Kullanıcı oturumunu kontrol et (kuyruğa ekleme ile aynı session)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('⚠️ Test: Kullanıcı oturumu bulunamadı:', userError);
    } else {
      console.log('✅ Test: Kullanıcı oturumu bulundu:', user.id);
    }
    
    // Kullanıcı ID'si ile filtreleyerek sorgula
    const userId = user?.id || '71bca451-a580-4bdd-a7eb-91e2d8aa5d12'; // Fallback
    
    // Kullanıcının kayıtlarını al
    const { data: userRecords, error: userError2 } = await supabase
      .from('etsy_uploads')
      .select('*')
      .eq('user_id', userId);
    
    console.log('📊 Kullanıcı kayıtları:', { 
      count: userRecords?.length || 0, 
      error: userError2,
      userId: userId
    });
    
    // Tüm kayıtları da kontrol et (global)
    const { data: allRecords, error: allError, count } = await supabase
      .from('etsy_uploads')
      .select('*', { count: 'exact' });
    
    console.log('📊 Tüm kayıtlar:', { count, error: allError });
    
    // Pending kayıtları say
    const { data: pendingRecords, error: pendingError } = await supabase
      .from('etsy_uploads')
      .select('*')
      .eq('state', 'pending')
      .eq('user_id', userId);
    
    console.log('📊 Kullanıcı Pending kayıtlar:', { 
      count: pendingRecords?.length || 0, 
      error: pendingError,
      records: pendingRecords?.map(r => ({ 
        id: (r as any).id, 
        state: (r as any).state, 
        created_at: (r as any).created_at 
      })) || []
    });
    
    return NextResponse.json({
      success: true,
      user_id: userId,
      user_records: userRecords?.length || 0,
      total_records: count || allRecords?.length || 0,
      pending_records: pendingRecords?.length || 0,
      sample_pending: pendingRecords?.slice(0, 3).map(r => ({
        id: (r as any).id,
        state: (r as any).state,
        user_id: (r as any).user_id,
        created_at: (r as any).created_at,
        scheduled_at: (r as any).scheduled_at
      })) || []
    });
    
  } catch (error) {
    console.error('🚨 Test API hatası:', error);
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 