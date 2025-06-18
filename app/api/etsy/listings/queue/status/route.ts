import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Kullanıcı oturumunu kontrol et
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Kuyruk istatistiklerini al
    const { data: queueStats, error: statsError } = await supabase
      .from('etsy_uploads')
      .select('state')
      .eq('user_id', user.id);
    
    if (statsError) {
      console.error('Kuyruk istatistikleri alınırken hata:', statsError);
      return NextResponse.json({ error: 'Failed to fetch queue stats' }, { status: 500 });
    }
    
    // İstatistikleri hesapla
    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total: queueStats?.length || 0
    };
    
    queueStats?.forEach(item => {
      if (item.state === 'pending') stats.pending++;
      else if (item.state === 'processing') stats.processing++;
      else if (item.state === 'completed') stats.completed++;
      else if (item.state === 'failed') stats.failed++;
    });
    
    // Son 10 öğeyi al
    const { data: recentItems, error: recentError } = await supabase
      .from('etsy_uploads')
      .select('id, state, created_at, listing_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (recentError) {
      console.error('Son öğeler alınırken hata:', recentError);
    }
    
    return NextResponse.json({
      success: true,
      stats,
      recent_items: recentItems || [],
      message: `Queue contains ${stats.total} items total`
    });
    
  } catch (error) {
    console.error('Kuyruk durumu API hatası:', error);
    return NextResponse.json({ 
      error: 'Failed to get queue status', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 