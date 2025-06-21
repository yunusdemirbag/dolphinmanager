import { NextResponse } from 'next/server';
import { getShippingProfiles, getEtsyStores, getProcessingProfiles } from '@/lib/etsy-api';
import { auth } from '@/lib/firebase/admin';
import { db } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { createClient } from "@/lib/supabase/server";

// Frontend'in beklediği Hazırlık Süresi Seçeneği formatı
interface ProcessingProfileOption {
  id: string; 
  label: string; 
  min_processing_time: number;
  max_processing_time: number;
  processing_time_unit: string;
}

// Processing profillerini listele - aslında shipping profilelardan çekiyoruz
export async function GET(request: Request) {
  try {
    console.log('[PROCESSING-PROFILES-ROUTE] Starting to fetch processing profiles...');

    // Auth kontrolü - hem token hem de session cookie desteği
    let userId = null;
    
    // 1. Bearer token kontrolü
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await auth.verifyIdToken(token);
        userId = decodedToken.uid;
        console.log('✅ Token ile kullanıcı doğrulandı:', userId);
      } catch (error) {
        console.error('❌ Token doğrulama hatası:', error);
      }
    }
    
    // 2. Session cookie kontrolü (token başarısız olursa)
    if (!userId) {
      try {
        // Next.js 15'te cookies() API'si yerine request.headers.get('cookie') kullanıyoruz
        const cookieHeader = request.headers.get('cookie');
        const sessionCookie = cookieHeader?.split(';')
          .find(c => c.trim().startsWith('session='))
          ?.split('=')[1];
        
        if (sessionCookie) {
          const decodedCookie = await auth.verifySessionCookie(sessionCookie);
          userId = decodedCookie.uid;
          console.log('✅ Cookie ile kullanıcı doğrulandı:', userId);
        }
      } catch (error) {
        console.error('❌ Session cookie doğrulama hatası:', error);
      }
    }
    
    // 3. Kullanıcı doğrulanamadıysa mock data döndür
    if (!userId) {
      console.log('⚠️ Kullanıcı doğrulanamadı, mock data döndürülüyor');
      return NextResponse.json(mockProcessingProfiles());
    }

    // Kullanıcının Etsy mağaza bilgilerini al
    try {
      const storeSnapshot = await db.collection('etsy_stores').where('userId', '==', userId).get();
      
      if (storeSnapshot.empty) {
        console.log('⚠️ Etsy mağazası bulunamadı, mock data döndürülüyor');
        return NextResponse.json(mockProcessingProfiles());
      }

      const storeData = storeSnapshot.docs[0].data();
      const { shop_id } = storeData;

      // Processing profilleri getir
      try {
        const profiles = await getProcessingProfiles(userId, shop_id);
        return NextResponse.json(profiles);
      } catch (error) {
        console.error('[PROCESSING-PROFILES-ROUTE] Error fetching profiles:', error);
        return NextResponse.json(mockProcessingProfiles());
      }
    } catch (error) {
      console.error('[PROCESSING-PROFILES-ROUTE] Error getting store data:', error);
      return NextResponse.json(mockProcessingProfiles());
    }
  } catch (error: any) {
    console.error('[PROCESSING-PROFILES-ROUTE] Detailed error in processing profiles:', error);
    return NextResponse.json(mockProcessingProfiles());
  }
}

// Mock processing profiles for development
function mockProcessingProfiles() {
  return {
    options: [
      {
        id: "1-2d",
        label: "1-2 gün",
        min_processing_time: 1,
        max_processing_time: 2,
        processing_time_unit: "business_days"
      },
      {
        id: "3-5d",
        label: "3-5 gün",
        min_processing_time: 3,
        max_processing_time: 5,
        processing_time_unit: "business_days"
      },
      {
        id: "1-2w",
        label: "1-2 hafta",
        min_processing_time: 1,
        max_processing_time: 2,
        processing_time_unit: "weeks"
      }
    ],
    is_mock: true
  };
} 