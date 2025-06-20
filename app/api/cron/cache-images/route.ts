import { NextResponse } from 'next/server';
// // import { createClient } from '@/lib/supabase/server';

// Bu endpoint Vercel cron tarafından çağrılacak (günde bir kez)
// Cron yapılandırması için vercel.json'a ekleyin:
// {
//   "crons": [
//     {
//       "path": "/api/cron/cache-images",
//       "schedule": "0 3 * * *"
//     }
//   ]
// }

export const maxDuration = 60; // 1 dakika

export async function GET(request: Request) {
  // Basic auth veya API key kontrolü - production'da daha güvenli hale getirin
  const authHeader = request.headers.get('authorization');
  const url = new URL(request.url);
  const apiKey = url.searchParams.get('apiKey');
  
  // Basit bir güvenlik kontrolü
  const expectedApiKey = process.env.CRON_API_KEY || 'dolphin-manager-cron-secret';
  
  // API key doğrulama
  if (apiKey !== expectedApiKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  console.log('Starting scheduled image cache update');
  
  try {
    // Resimleri önbelleğe al
    const imageCacheResponse = await fetch(`${url.origin}/api/etsy/image-cache`, {
      method: 'POST'
    });
    
    if (!imageCacheResponse.ok) {
      const errorData = await imageCacheResponse.json();
      console.error('Failed to cache images:', errorData);
      return NextResponse.json(
        { error: 'Failed to cache images', details: errorData },
        { status: 500 }
      );
    }
    
    const results = await imageCacheResponse.json();
    
    // İşlem tarihini veritabanına kaydet
    try {
      const supabase = await createClient();
      await supabase
        .from('cron_logs')
        .insert({
          task_name: 'cache_images',
          result: results.success ? 'success' : 'partial',
          details: {
            total: results.results.total,
            success: results.results.success,
            failed: results.results.failed,
            skipped: results.results.skipped,
            duration: results.duration
          }
        });
    } catch (dbError) {
      console.error('Failed to log cron execution:', dbError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Scheduled image cache update completed successfully',
      results: {
        cached: results.results.success,
        skipped: results.results.skipped,
        failed: results.results.failed,
        duration: results.duration
      }
    });
  } catch (error) {
    console.error('Error in scheduled image cache update:', error);
    return NextResponse.json(
      { error: 'Failed to run scheduled task', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 