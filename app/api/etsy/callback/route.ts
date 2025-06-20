import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // userId
    const error = searchParams.get('error')
    
    console.log('🔄 Etsy callback alındı:', { code: !!code, state, error })
    
    if (error) {
      console.error('❌ Etsy OAuth hatası:', error)
      return NextResponse.redirect(new URL('/stores?error=etsy_auth_failed&details=' + encodeURIComponent(error), request.url))
    }
    
    if (!code || !state) {
      console.error('❌ Eksik parametreler:', { code: !!code, state: !!state })
      return NextResponse.redirect(new URL('/stores?error=missing_params', request.url))
    }
    
    const userId = state
    
    // Gerçek Etsy token exchange
    console.log('🔄 Etsy token exchange başlatılıyor - kullanıcı:', userId)
    
    const tokenResponse = await fetch('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.ETSY_CLIENT_ID!,
        code: code,
        redirect_uri: process.env.ETSY_REDIRECT_URI!,
        // code_verifier gerekirse eklenecek
      }),
    })
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('❌ Etsy token exchange hatası:', errorText)
      return NextResponse.redirect(new URL('/stores?error=token_exchange_failed&details=' + encodeURIComponent(errorText), request.url))
    }
    
    const tokenData = await tokenResponse.json()
    console.log('✅ Etsy token alındı')
    
    // Token'ı Firebase'e kaydet
    try {
      await db.collection('etsy_tokens').doc(userId).set({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: new Date(Date.now() + tokenData.expires_in * 1000),
        token_type: tokenData.token_type || 'Bearer',
        user_id: userId,
        created_at: new Date(),
        updated_at: new Date()
      })
      
      console.log('✅ Token Firebase\'e kaydedildi')
    } catch (tokenError) {
      console.error('❌ Token kaydetme hatası:', tokenError)
      return NextResponse.redirect(new URL('/stores?error=token_save_failed', request.url))
    }
    
    // Gerçek mağaza bilgilerini Etsy API'sinden çek
    console.log('🔄 Kullanıcının mağaza bilgileri alınıyor...')
    
    const shopsResponse = await fetch('https://openapi.etsy.com/v3/application/shops', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'x-api-key': process.env.ETSY_CLIENT_ID!
      }
    })
    
    if (!shopsResponse.ok) {
      const errorText = await shopsResponse.text()
      console.error('❌ Etsy mağaza bilgisi alınamadı:', errorText)
      return NextResponse.redirect(new URL('/stores?error=shop_info_failed&details=' + encodeURIComponent(errorText), request.url))
    }
    
    const shopsData = await shopsResponse.json()
    console.log('✅ Mağaza bilgileri alındı:', shopsData)
    
    if (!shopsData.results || shopsData.results.length === 0) {
      console.error('❌ Kullanıcının mağazası bulunamadı')
      return NextResponse.redirect(new URL('/stores?error=no_shop_found', request.url))
    }
    
    const shop = shopsData.results[0] // İlk mağazayı al
    const storeData = {
      shop_id: shop.shop_id,
      shop_name: shop.shop_name,
      title: shop.title || shop.shop_name, // Gerçek mağaza adı
      currency_code: shop.currency_code || 'USD',
      listing_active_count: shop.listing_active_count || 0,
      num_favorers: shop.num_favorers || 0,
      review_count: shop.review_count || 0,
      review_average: shop.review_average || 0,
      url: shop.url || `https://etsy.com/shop/${shop.shop_name}`,
      image_url_760x100: shop.image_url_760x100 || '',
      is_active: shop.is_active !== false
    }
    
    // Mağaza bilgilerini Firebase'e kaydet
    try {
      await db.collection('etsy_stores').doc(`${userId}_${storeData.shop_id}`).set({
        user_id: userId,
        shop_id: storeData.shop_id,
        shop_name: storeData.shop_name,
        title: storeData.title, // Gerçek Etsy mağaza adı
        currency_code: storeData.currency_code,
        listing_active_count: storeData.listing_active_count,
        num_favorers: storeData.num_favorers,
        review_count: storeData.review_count,
        review_average: storeData.review_average,
        url: storeData.url,
        image_url_760x100: storeData.image_url_760x100,
        is_active: storeData.is_active,
        created_at: new Date(),
        updated_at: new Date(),
        last_synced_at: new Date()
      })
      
      console.log('✅ Mağaza Firebase\'e kaydedildi')
    } catch (storeError) {
      console.error('❌ Mağaza kaydetme hatası:', storeError)
      return NextResponse.redirect(new URL('/stores?error=store_save_failed', request.url))
    }
    
    // Başarılı yönlendirme
    console.log('✅ Etsy bağlantısı tamamlandı!')
    return NextResponse.redirect(new URL('/stores?etsy=connected', request.url))
    
  } catch (error) {
    console.error('💥 Callback genel hatası:', error)
    return NextResponse.redirect(new URL('/stores?error=callback_failed&details=' + encodeURIComponent(String(error)), request.url))
  }
}