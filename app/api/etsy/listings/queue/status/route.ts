import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";
import { getUserJobs } from '@/lib/queue-manager';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  console.log('🔍 KUYRUK DURUMU KONTROLÜ BAŞLADI');
  
  try {
    // Supabase client oluştur
    const supabase = await createClient();
    
    // Kullanıcıyı doğrula
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Oturum doğrulama hatası:', sessionError);
      return NextResponse.json(
        { error: 'Yetkisiz erişim', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    
    if (!session || !session.user) {
      console.error('❌ Oturum bulunamadı');
      return NextResponse.json(
        { error: 'Yetkisiz erişim', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Kullanıcının tüm işlerini al
    const jobs = await getUserJobs(userId);
    
    // İşleri durumlarına göre grupla
    const pendingJobs = jobs.filter(job => job.status === 'pending');
    const processingJobs = jobs.filter(job => job.status === 'processing');
    const completedJobs = jobs.filter(job => job.status === 'completed');
    const failedJobs = jobs.filter(job => job.status === 'failed');
    
    // Daha detaylı bilgi için işleri dönüştür
    const formatJob = (job: any) => {
      // Etsy listing işleri için ek bilgiler ekle
      if (job.type === 'create_etsy_listing') {
        return {
          id: job.id,
          type: job.type,
          status: job.status,
          progress: job.progress,
          created_at: job.created_at,
          started_at: job.started_at,
          completed_at: job.completed_at,
          error: job.error,
          title: job.data?.listingData?.title || 'İsimsiz Ürün',
          image_count: job.data?.imageFiles?.length || 0,
          video_count: job.data?.videoFiles?.length || 0,
          listing_id: job.data?.listing_id,
          has_variations: job.data?.listingData?.has_variations || false
        };
      }
      
      // Diğer iş türleri için genel bilgiler
      return {
        id: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress,
        created_at: job.created_at,
        started_at: job.started_at,
        completed_at: job.completed_at,
        error: job.error
      };
    };
    
    return NextResponse.json({
      success: true,
      queue_summary: {
        total: jobs.length,
        pending: pendingJobs.length,
        processing: processingJobs.length,
        completed: completedJobs.length,
        failed: failedJobs.length
      },
      jobs: {
        pending: pendingJobs.map(formatJob),
        processing: processingJobs.map(formatJob),
        completed: completedJobs.map(formatJob),
        failed: failedJobs.map(formatJob)
      }
    });
    
  } catch (error: any) {
    console.error('💥 GENEL HATA:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Bilinmeyen hata',
        code: 'UNKNOWN_ERROR',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 