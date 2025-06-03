import { NextResponse } from 'next/server';
// import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'; // Supabase şimdilik kaldırıldı
// import { cookies } from 'next/headers'; // Supabase şimdilik kaldırıldı
import { getProcessingProfiles } from '@/lib/etsy-api';
import { createClient } from '@/lib/supabase/server';

// Frontend'in beklediği Hazırlık Süresi Seçeneği formatı
interface ProcessingProfileOption {
  id: string; 
  label: string; 
  min_processing_time: number;
  max_processing_time: number;
  processing_time_unit: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shop_id');

    if (!shopId) {
      return NextResponse.json({
        success: false,
        error: 'Shop ID is required'
      }, { status: 400 });
    }

    // Get user ID from session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const processingProfiles = await getProcessingProfiles(user.id, parseInt(shopId));

    return NextResponse.json({
      success: true,
      data: processingProfiles
    });

  } catch (error) {
    console.error('Error fetching processing profiles:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch processing profiles'
    }, { status: 500 });
  }
} 