import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

interface PreUploadCheckResult {
  canvasCategories: {
    available: boolean;
    count: number;
    lastUpdated?: Date;
    needsUpdate: boolean;
  };
  shippingProfiles: {
    available: boolean;
    count: number;
    defaultProfileId?: number;
    needsUpdate: boolean;
  };
  shopSections: {
    available: boolean;
    count: number;
    needsUpdate: boolean;
  };
  allReady: boolean;
  actions: string[];
}

const CACHE_DURATION_HOURS = 24; // 24 saat cache süresi

export async function POST(request: NextRequest) {
  try {
    const { shopId } = await request.json();
    
    if (!shopId) {
      return NextResponse.json({ error: 'ShopId gerekli' }, { status: 400 });
    }

    console.log(`🔍 Pre-upload check başlıyor - ShopId: ${shopId}`);
    
    initializeAdminApp();
    if (!adminDb) {
      throw new Error('Firebase Admin başlatılamadı');
    }

    const result: PreUploadCheckResult = {
      canvasCategories: { available: false, count: 0, needsUpdate: false },
      shippingProfiles: { available: false, count: 0, needsUpdate: false },
      shopSections: { available: false, count: 0, needsUpdate: false },
      allReady: false,
      actions: []
    };

    // 1. Canvas kategorileri kontrol et
    console.log('🎨 Canvas kategorileri kontrol ediliyor...');
    const canvasCheck = await checkCanvasCategories(shopId);
    result.canvasCategories = canvasCheck;
    
    if (!canvasCheck.available || canvasCheck.needsUpdate) {
      result.actions.push('fetch_canvas_categories');
    }

    // 2. Kargo profilleri kontrol et
    console.log('🚚 Kargo profilleri kontrol ediliyor...');
    const shippingCheck = await checkShippingProfiles(shopId);
    result.shippingProfiles = shippingCheck;
    
    if (!shippingCheck.available || shippingCheck.needsUpdate) {
      result.actions.push('fetch_shipping_profiles');
    }

    // 3. Shop sections kontrol et
    console.log('🏪 Shop sections kontrol ediliyor...');
    const sectionsCheck = await checkShopSections(shopId);
    result.shopSections = sectionsCheck;
    
    if (!sectionsCheck.available || sectionsCheck.needsUpdate) {
      result.actions.push('fetch_shop_sections');
    }

    // 4. Tümü hazır mı?
    result.allReady = result.canvasCategories.available && 
                     result.shippingProfiles.available && 
                     result.shopSections.available &&
                     result.actions.length === 0;

    console.log(`✅ Pre-upload check tamamlandı:`, {
      canvas: result.canvasCategories.available,
      shipping: result.shippingProfiles.available,
      sections: result.shopSections.available,
      allReady: result.allReady,
      actionsNeeded: result.actions.length
    });

    // 5. Eksik veriler varsa otomatik çek
    if (result.actions.length > 0) {
      console.log(`🚀 ${result.actions.length} otomatik işlem tetikleniyor...`);
      
      // Background'da eksik verileri çek (non-blocking)
      setTimeout(async () => {
        await performAutoFetch(shopId, result.actions);
      }, 100);
    }

    return NextResponse.json({
      success: true,
      result,
      message: result.allReady ? 'Tüm veriler hazır' : `${result.actions.length} işlem yapılıyor...`
    });

  } catch (error) {
    console.error('❌ Pre-upload check hatası:', error);
    return NextResponse.json(
      { error: 'Pre-upload check başarısız: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata') },
      { status: 500 }
    );
  }
}

async function checkCanvasCategories(shopId: string) {
  try {
    const doc = await adminDb.collection('canvas_categories').doc(shopId).get();
    
    if (!doc.exists) {
      return { available: false, count: 0, needsUpdate: true };
    }

    const data = doc.data()!;
    const lastUpdated = data.updated_at?.toDate();
    const count = data.count || 0;
    
    // Cache süresi kontrolü
    const needsUpdate = !lastUpdated || 
                       (Date.now() - lastUpdated.getTime()) > (CACHE_DURATION_HOURS * 60 * 60 * 1000);

    return {
      available: count > 0,
      count,
      lastUpdated,
      needsUpdate
    };
  } catch (error) {
    console.error('❌ Canvas kategorileri kontrol hatası:', error);
    return { available: false, count: 0, needsUpdate: true };
  }
}

async function checkShippingProfiles(shopId: string) {
  try {
    const doc = await adminDb.collection('shipping_profiles').doc(shopId).get();
    
    if (!doc.exists) {
      return { available: false, count: 0, needsUpdate: true };
    }

    const data = doc.data()!;
    const lastUpdated = data.updated_at?.toDate();
    const count = data.count || 0;
    const defaultProfileId = data.default_profile_id;
    
    // Cache süresi kontrolü
    const needsUpdate = !lastUpdated || 
                       (Date.now() - lastUpdated.getTime()) > (CACHE_DURATION_HOURS * 60 * 60 * 1000);

    return {
      available: count > 0,
      count,
      defaultProfileId,
      needsUpdate
    };
  } catch (error) {
    console.error('❌ Kargo profilleri kontrol hatası:', error);
    return { available: false, count: 0, needsUpdate: true };
  }
}

async function checkShopSections(shopId: string) {
  try {
    const doc = await adminDb.collection('shop_sections').doc(shopId).get();
    
    if (!doc.exists) {
      return { available: false, count: 0, needsUpdate: true };
    }

    const data = doc.data()!;
    const lastUpdated = data.updated_at?.toDate();
    const count = data.sections?.length || 0;
    
    // Cache süresi kontrolü
    const needsUpdate = !lastUpdated || 
                       (Date.now() - lastUpdated.getTime()) > (CACHE_DURATION_HOURS * 60 * 60 * 1000);

    return {
      available: count > 0,
      count,
      needsUpdate
    };
  } catch (error) {
    console.error('❌ Shop sections kontrol hatası:', error);
    return { available: false, count: 0, needsUpdate: true };
  }
}

async function performAutoFetch(shopId: string, actions: string[]) {
  try {
    console.log(`🔄 Otomatik veri çekme başlıyor - ShopId: ${shopId}, Actions: ${actions.join(', ')}`);
    
    // Auto-setup'ı tetikle (tüm verileri çeker)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/etsy/auto-setup-store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopId })
    });
    
    if (response.ok) {
      console.log(`✅ ${shopId} için otomatik veri çekme tamamlandı`);
    } else {
      const errorText = await response.text();
      console.error(`❌ ${shopId} için otomatik veri çekme başarısız:`, {
        status: response.status,
        statusText: response.statusText,
        url: `${baseUrl}/api/etsy/auto-setup-store`,
        error: errorText
      });
    }
  } catch (error) {
    console.error('❌ Otomatik veri çekme hatası:', error);
  }
}