import { NextResponse } from 'next/server';
import { getShippingProfiles, createShippingProfile, getEtsyStores } from '@/lib/etsy-api';
import { auth, db } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { createClient } from "@/lib/supabase/server";

// Kargo profillerini listele
export async function GET(request: Request) {
  try {
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
      return NextResponse.json({
        profiles: mockShippingProfiles(),
        is_mock: true
      });
    }

    // Kullanıcının Etsy mağaza bilgilerini al
    try {
      const storeSnapshot = await db.collection('etsy_stores').where('userId', '==', userId).get();
      
      if (storeSnapshot.empty) {
        console.log('⚠️ Etsy mağazası bulunamadı, mock data döndürülüyor');
        return NextResponse.json({
          profiles: mockShippingProfiles(),
          is_mock: true,
          error_details: 'No Etsy store found'
        });
      }

      const storeData = storeSnapshot.docs[0].data();
      const shopId = storeData.shop_id;

      console.log('API: Starting to fetch shipping profiles...');
      console.log('API: Shop ID found and verified:', shopId);

      try {
        // Fetch shipping profiles
        console.log('API: Fetching shipping profiles for shop:', shopId);
        const profiles = await getShippingProfiles(userId, shopId);
        
        if (!profiles || !Array.isArray(profiles)) {
          console.error('API: Invalid profiles response:', profiles);
          return NextResponse.json({
            profiles: mockShippingProfiles(),
            is_mock: true,
            error_details: 'Invalid profiles response'
          });
        }

        if (profiles.length === 0) {
          console.log('API: No shipping profiles found, returning mock data');
          return NextResponse.json({
            profiles: mockShippingProfiles(),
            is_mock: true,
            error_details: 'No profiles found'
          });
        }

        console.log('API: Successfully fetched profiles:', profiles.length);
        return NextResponse.json({ profiles });
      } catch (error: any) {
        // Özel hata durumlarını kontrol et
        if (error?.message === 'RECONNECT_REQUIRED') {
          console.error('API: Etsy reconnection required, returning mock data');
          return NextResponse.json({
            profiles: mockShippingProfiles(),
            is_mock: true,
            error_details: 'Reconnect required'
          });
        }

        // Diğer API hataları
        console.error('API: Error fetching shipping profiles:', error);
        return NextResponse.json({
          profiles: mockShippingProfiles(),
          is_mock: true,
          error_details: error.message
        });
      }
    } catch (error: any) {
      console.error('API: Error getting store data:', error);
      return NextResponse.json({
        profiles: mockShippingProfiles(),
        is_mock: true,
        error_details: error.message
      });
    }
  } catch (error: any) {
    // Detaylı hata loglaması
    console.error('API: Detailed error in shipping profiles:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      cause: error?.cause
    });

    return NextResponse.json({
      profiles: mockShippingProfiles(),
      is_mock: true,
      error_details: error.message
    });
  }
}

// Mock shipping profiles for development
function mockShippingProfiles() {
  return [
    {
      shipping_profile_id: 1001,
      title: "Standart Kargo",
      min_processing_days: 1,
      max_processing_days: 3,
      processing_time: "1-3 iş günü",
      origin_country_iso: "TR",
      is_default: true
    },
    {
      shipping_profile_id: 1002,
      title: "Hızlı Kargo",
      min_processing_days: 1,
      max_processing_days: 1,
      processing_time: "1 iş günü",
      origin_country_iso: "TR",
      is_default: false
    }
  ];
}

// Yeni kargo profili oluştur
export async function POST(request: Request) {
  try {
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
    
    // 3. Kullanıcı doğrulanamadıysa hata döndür
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Kullanıcının Etsy mağaza bilgilerini al
    const storeSnapshot = await db.collection('etsy_stores').where('userId', '==', userId).get();
    
    if (storeSnapshot.empty) {
      return NextResponse.json({ error: 'No Etsy store found' }, { status: 404 });
    }

    const storeData = storeSnapshot.docs[0].data();
    const shopId = storeData.shop_id;

    const data = await request.json();
    const profile = await createShippingProfile(userId, shopId, data);
    return NextResponse.json({ profile });
  } catch (error: any) {
    console.error('Error creating shipping profile:', error);
    
    let errorMessage = 'Kargo profili oluşturulurken bir hata oluştu';
    let statusCode = 500;

    if (error?.message?.includes('RECONNECT_REQUIRED') || error?.message?.includes('401')) {
      errorMessage = 'Etsy hesabınıza erişim yetkisi bulunamadı. Lütfen tekrar giriş yapın.';
      statusCode = 401;
    } else if (error?.message?.includes('not found') || error?.message?.includes('404')) {
      errorMessage = 'Etsy mağaza bilgileriniz bulunamadı. Lütfen mağaza bağlantınızı kontrol edin.';
      statusCode = 404;
    } else if (error?.message?.includes('API error')) {
      errorMessage = 'Etsy API hatası: ' + error.message;
      statusCode = 502;
    } else if (error?.message?.includes('rate limit') || error?.message?.includes('429')) {
      errorMessage = 'Etsy API istek limiti aşıldı. Lütfen biraz bekleyip tekrar deneyin.';
      statusCode = 429;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
} 