import { NextRequest, NextResponse } from 'next/server';
// import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'; // Supabase şimdilik kaldırıldı
// import { cookies } from 'next/headers'; // Supabase şimdilik kaldırıldı
import { fetchEtsyProcessingProfiles } from '@/lib/etsy-api'; // etsy-api kütüphanenizden import edin

// Frontend'in beklediği Hazırlık Süresi Seçeneği formatı
interface ProcessingProfileOption {
  id: string; 
  label: string; 
  min_processing_time: number;
  max_processing_time: number;
  processing_time_unit: string;
}

export async function GET(request: NextRequest) {
  console.log("[PROCESSING-PROFILES-ROUTE] GET request received.");

  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shop_id');

    if (!shopId) {
      return NextResponse.json({ error: 'shop_id parameter is required.' }, { status: 400 });
    }

    // TODO: Kullanıcı kimlik doğrulaması ve Etsy token alma mekanizması buraya eklenecek.
    // Şimdilik doğrudan API çağrısı yapılıyor, bu durum auth sorununu çözmeyecektir.
    // Etsy API kütüphanenizde kimlik doğrulama token'ını yönettiğinizi varsayıyorum.
    
    console.log(`[PROCESSING-PROFILES-ROUTE] Fetching processing profiles for shop ID: ${shopId}`);
    const processingProfiles = await fetchEtsyProcessingProfiles(parseInt(shopId, 10));
    console.log(`[PROCESSING-PROFILES-ROUTE] Fetched ${processingProfiles.length} processing profiles.`);

    // Etsy API yanıtını frontend formatına çevirin (örneğin, readiness_state_definitions varsa)
    const formattedProfiles: ProcessingProfileOption[] = (processingProfiles as any).readiness_state_definitions?.map((profile: any) => ({
      id: profile.readiness_state_id.toString(), // ID string olmalı
      label: profile.readiness_state, // Etsy API'den gelen isim
      min_processing_time: profile.min_processing_time,
      max_processing_time: profile.max_processing_time,
      processing_time_unit: profile.processing_time_unit,
    })) || [];

    return NextResponse.json({ readiness_state_definitions: formattedProfiles });

  } catch (error: any) {
    console.error("[PROCESSING-PROFILES-ROUTE] An error occurred:", error.message);
    // Hata durumunda 401 hatasını yakalayabiliriz, ancak diğer hatalar için 500 döndürelim
    if (error.message.includes('Unauthorized') || error.message.includes('401')) {
       return NextResponse.json({ error: 'Failed to fetch processing profiles: Unauthorized.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch processing profiles.', details: error.message }, { status: 500 });
  }
} 