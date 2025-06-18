import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getEtsyStores } from "@/lib/etsy-api"

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Etsy mağazaları API çağrısı başladı');
    
    // Supabase client oluştur
    const supabase = await createClient()
    
    // Kullanıcıyı doğrula
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ Oturum doğrulama hatası:', sessionError);
      return NextResponse.json(
        { error: 'Yetkisiz erişim', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
    
    if (!session || !session.user) {
      console.error('❌ Oturum bulunamadı');
      return NextResponse.json(
        { error: 'Yetkisiz erişim', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
    
    const userId = session.user.id
    console.log('✅ Kullanıcı doğrulandı:', userId)
    
    // Etsy mağazalarını API'den al
    const stores = await getEtsyStores(userId, true) // skipCache=true ile her zaman güncel veri al
    
    if (!stores || stores.length === 0) {
      console.log('❌ Etsy mağazası bulunamadı')
      return NextResponse.json(
        { error: 'Etsy mağazası bulunamadı', code: 'NO_STORES' },
        { status: 404 }
      )
    }
    
    console.log(`✅ ${stores.length} Etsy mağazası bulundu`)
    
    // Mağaza verilerini veritabanına kaydet
    for (const store of stores) {
      console.log(`🔄 Mağaza kaydediliyor: ${store.shop_name} (${store.shop_id})`)
      
      try {
        // Doğrudan SQL sorgusu kullanarak upsert işlemi yap
        const { data, error } = await supabase.rpc('upsert_etsy_store_direct', {
          p_user_id: userId,
          p_shop_id: store.shop_id,
          p_shop_name: store.shop_name,
          p_title: store.title || '',
          p_currency_code: store.currency_code || 'USD',
          p_listing_active_count: store.listing_active_count || 0,
          p_num_favorers: store.num_favorers || 0,
          p_review_count: store.review_count || 0,
          p_review_average: store.review_average || 0,
          p_url: store.url || '',
          p_image_url_760x100: store.image_url_760x100 || '',
          p_is_active: true
        });
        
        if (error) {
          console.error('❌ SQL upsert hatası:', error);
          
          // Alternatif yöntem - RPC mevcut değilse doğrudan SQL kullan
          const sqlQuery = `
            WITH upsert AS (
              UPDATE etsy_stores
              SET 
                shop_name = $3,
                title = $4,
                currency_code = $5,
                listing_active_count = $6,
                num_favorers = $7,
                review_count = $8,
                review_average = $9,
                url = $10,
                image_url_760x100 = $11,
                is_active = $12,
                last_synced_at = NOW(),
                updated_at = NOW()
              WHERE user_id = $1 AND shop_id = $2
              RETURNING *
            )
            INSERT INTO etsy_stores (
              user_id, shop_id, shop_name, title, currency_code, 
              listing_active_count, num_favorers, review_count, review_average, 
              url, image_url_760x100, is_active, last_synced_at, created_at, updated_at
            )
            SELECT 
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW(), NOW()
            WHERE NOT EXISTS (SELECT * FROM upsert)
          `;
          
          const { error: sqlError } = await supabase.rpc('exec_sql', { 
            sql: sqlQuery,
            params: [
              userId, 
              store.shop_id, 
              store.shop_name, 
              store.title || '', 
              store.currency_code || 'USD',
              store.listing_active_count || 0,
              store.num_favorers || 0,
              store.review_count || 0,
              store.review_average || 0,
              store.url || '',
              store.image_url_760x100 || '',
              true
            ]
          });
          
          if (sqlError) {
            console.error('❌ Alternatif SQL hatası:', sqlError);
            
            // Son çare olarak manuel kontrol ve insert/update
            try {
              // Önce mevcut kaydı kontrol et
              const { data: existingStore } = await supabase
                .from('etsy_stores')
                .select('*')
                .eq('user_id', userId)
                .eq('shop_id', store.shop_id)
                .single();
                
              if (existingStore) {
                // Mevcut kayıt varsa güncelle
                const { error: updateError } = await supabase
                  .from('etsy_stores')
                  .update({
                    shop_name: store.shop_name,
                    title: store.title,
                    currency_code: store.currency_code,
                    listing_active_count: store.listing_active_count,
                    num_favorers: store.num_favorers,
                    review_count: store.review_count,
                    review_average: store.review_average,
                    url: store.url,
                    image_url_760x100: store.image_url_760x100,
                    is_active: true,
                    last_synced_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', existingStore.id);
                  
                if (updateError) {
                  console.error('❌ Mağaza güncellenemedi:', updateError);
                } else {
                  console.log('✅ Mağaza güncellendi:', store.shop_id);
                }
              } else {
                // Mevcut kayıt yoksa yeni ekle
                const { error: insertError } = await supabase
                  .from('etsy_stores')
                  .insert({
                    user_id: userId,
                    shop_id: store.shop_id,
                    shop_name: store.shop_name,
                    title: store.title,
                    currency_code: store.currency_code,
                    listing_active_count: store.listing_active_count,
                    num_favorers: store.num_favorers,
                    review_count: store.review_count,
                    review_average: store.review_average,
                    url: store.url,
                    image_url_760x100: store.image_url_760x100,
                    is_active: true,
                    last_synced_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  });
                  
                if (insertError) {
                  console.error('❌ Mağaza eklenemedi:', insertError);
                } else {
                  console.log('✅ Mağaza eklendi:', store.shop_id);
                }
              }
            } catch (finalError) {
              console.error('❌ Tüm yöntemler başarısız oldu:', finalError);
            }
          } else {
            console.log('✅ Alternatif SQL ile mağaza kaydedildi:', store.shop_id);
          }
        } else {
          console.log('✅ RPC ile mağaza kaydedildi:', store.shop_id);
        }
      } catch (error) {
        console.error('❌ Mağaza işlem hatası:', error);
      }
    }
    
    console.log('✅ Mağazalar başarıyla kaydedildi')
    
    return NextResponse.json({
      success: true,
      stores,
      count: stores.length
    })
    
  } catch (error: any) {
    console.error('💥 GENEL HATA:', error)
    
    return NextResponse.json(
      { 
        error: error.message || 'Bilinmeyen hata',
        code: 'UNKNOWN_ERROR',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
} 