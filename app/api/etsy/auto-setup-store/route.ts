import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

interface EtsyTaxonomyNode {
  id: number;
  level: number;
  name: string;
  parent_id: number | null;
  children?: EtsyTaxonomyNode[];
}

interface EtsyShippingProfile {
  shipping_profile_id: number;
  title: string;
  user_id: number;
  min_processing_days: number;
  max_processing_days: number;
}

export async function POST(request: NextRequest) {
  try {
    const { shopId } = await request.json();
    
    if (!shopId) {
      return NextResponse.json({ error: 'ShopId gerekli' }, { status: 400 });
    }

    console.log(`🚀 Auto Setup Store başlıyor - ShopId: ${shopId}`);
    
    initializeAdminApp();
    if (!adminDb) {
      throw new Error('Firebase Admin başlatılamadı');
    }

    // API token'ını al
    const apiKeysDoc = await adminDb.collection('etsy_api_keys').doc(shopId).get();
    
    if (!apiKeysDoc.exists) {
      return NextResponse.json({ error: 'API token bulunamadı' }, { status: 404 });
    }

    const { access_token } = apiKeysDoc.data()!;
    const apiKey = process.env.ETSY_API_KEY;
    
    if (!access_token || !apiKey) {
      return NextResponse.json({ error: 'API credentials eksik' }, { status: 500 });
    }

    console.log(`🔑 Token bulundu, otomatik setup başlıyor...`);

    // 1. Canvas kategorilerini çek
    console.log('🎨 Canvas kategorileri çekiliyor...');
    const canvasCategories = await fetchCanvasCategories(apiKey, access_token);
    
    // 2. Kargo profillerini çek
    console.log('🚚 Kargo profilleri çekiliyor...');
    const shippingProfiles = await fetchShippingProfiles(shopId, apiKey, access_token);
    
    // 3. Shop sections çek
    console.log('🏪 Shop sections çekiliyor...');
    const shopSections = await fetchShopSections(shopId, apiKey, access_token);
    
    // 4. Cache'e kaydet
    console.log('💾 Cache\'e kaydediliyor...');
    await saveToCache(shopId, canvasCategories, shippingProfiles, shopSections);
    
    return NextResponse.json({
      success: true,
      data: {
        canvasCategories: canvasCategories.length,
        shippingProfiles: shippingProfiles.length,
        shopSections: shopSections.length,
        shopId
      }
    });

  } catch (error) {
    console.error('❌ Auto setup hatası:', error);
    return NextResponse.json(
      { error: 'Auto setup başarısız: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata') },
      { status: 500 }
    );
  }
}

async function fetchCanvasCategories(apiKey: string, accessToken: string): Promise<EtsyTaxonomyNode[]> {
  try {
    // Etsy taxonomy'den Canvas/Wall Art kategorilerini bul
    const response = await fetch('https://openapi.etsy.com/v3/application/seller-taxonomy/nodes', {
      headers: {
        'x-api-key': apiKey,
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Taxonomy API error: ${response.status}`);
    }

    const data = await response.json();
    const allNodes: EtsyTaxonomyNode[] = data.results || [];
    
    // Canvas/Wall Art ile ilgili kategorileri filtrele
    const canvasKeywords = [
      'canvas', 'wall art', 'painting', 'print', 'poster', 'artwork', 
      'wall decor', 'home decor', 'art', 'picture'
    ];
    
    const canvasCategories = allNodes.filter(node => {
      const nameStr = node.name.toLowerCase();
      return canvasKeywords.some(keyword => nameStr.includes(keyword));
    });

    console.log(`✅ ${canvasCategories.length} Canvas kategorisi bulundu`);
    return canvasCategories;
    
  } catch (error) {
    console.error('❌ Canvas kategorileri çekilemedi:', error);
    return [];
  }
}

async function fetchShippingProfiles(shopId: string, apiKey: string, accessToken: string): Promise<EtsyShippingProfile[]> {
  try {
    const response = await fetch(`https://openapi.etsy.com/v3/application/shops/${shopId}/shipping-profiles`, {
      headers: {
        'x-api-key': apiKey,
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Shipping profiles API error: ${response.status}`);
    }

    const data = await response.json();
    const profiles: EtsyShippingProfile[] = data.results || [];
    
    console.log(`✅ ${profiles.length} kargo profili bulundu`);
    return profiles;
    
  } catch (error) {
    console.error('❌ Kargo profilleri çekilemedi:', error);
    return [];
  }
}

async function fetchShopSections(shopId: string, apiKey: string, accessToken: string): Promise<any[]> {
  try {
    const response = await fetch(`https://openapi.etsy.com/v3/application/shops/${shopId}/sections`, {
      headers: {
        'x-api-key': apiKey,
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Shop sections API error: ${response.status}`);
    }

    const data = await response.json();
    const sections = data.results || [];
    
    console.log(`✅ ${sections.length} shop section bulundu`);
    return sections;
    
  } catch (error) {
    console.error('❌ Shop sections çekilemedi:', error);
    return [];
  }
}

async function saveToCache(shopId: string, canvasCategories: EtsyTaxonomyNode[], shippingProfiles: EtsyShippingProfile[], shopSections: any[]) {
  try {
    const batch = adminDb.batch();
    
    // Canvas kategorilerini kaydet
    if (canvasCategories.length > 0) {
      const canvasCategoriesRef = adminDb.collection('canvas_categories').doc(shopId);
      batch.set(canvasCategoriesRef, {
        shop_id: shopId,
        categories: canvasCategories,
        updated_at: new Date(),
        count: canvasCategories.length
      });
    }
    
    // Kargo profillerini kaydet (mevcut sistemi güncelle)
    if (shippingProfiles.length > 0) {
      const shippingProfilesRef = adminDb.collection('shipping_profiles').doc(shopId);
      batch.set(shippingProfilesRef, {
        shop_id: shopId,
        profiles: shippingProfiles,
        default_profile_id: shippingProfiles[0]?.shipping_profile_id,
        updated_at: new Date(),
        count: shippingProfiles.length
      });
    }
    
    // Shop sections'ı kaydet
    if (shopSections.length > 0) {
      const shopSectionsRef = adminDb.collection('shop_sections').doc(shopId);
      batch.set(shopSectionsRef, {
        shop_id: shopId,
        sections: shopSections,
        updated_at: new Date(),
        count: shopSections.length
      });
    }
    
    await batch.commit();
    console.log('✅ Cache başarıyla güncellendi');
    
  } catch (error) {
    console.error('❌ Cache kaydetme hatası:', error);
    throw error;
  }
}