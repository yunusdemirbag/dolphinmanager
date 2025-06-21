import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase/admin'
import { getAuthenticatedUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // 1. Önce isteği yapan kullanıcının kimliğini doğrula (en güvenli yöntem)
    const user = await getAuthenticatedUser(request)
    if (!user) {
      console.error('❌ Callback - Yetkisiz istek. Oturum çerezi bulunamadı veya geçersiz.')
      return NextResponse.redirect(new URL('/stores?error=unauthorized', request.url))
    }
    const userId = user.uid

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // Bu, CSRF koruması için kullanılır
    const error = searchParams.get('error')
    
    console.log('🔄 Etsy callback alındı:', { code: !!code, state, error })
    console.log('🔧 Production debug - userId:', state)
    console.log('🔧 Environment vars:', {
      ETSY_CLIENT_ID: !!process.env.ETSY_CLIENT_ID,
      ETSY_CLIENT_SECRET: !!process.env.ETSY_CLIENT_SECRET,
      ETSY_REDIRECT_URI: process.env.ETSY_REDIRECT_URI
    })
    
    if (error) {
      console.error('❌ Etsy OAuth hatası:', error)
      return NextResponse.redirect(new URL('/stores?error=etsy_auth_failed&details=' + encodeURIComponent(error), request.url))
    }
    
    if (!code || !state) {
      console.error('❌ Callback - Eksik parametreler.')
      return NextResponse.redirect(new URL('/stores?error=missing_params', request.url))
    }
    
    // 2. Auth session'dan code_verifier'ı ve state'i al
    const authSessionRef = db.collection('etsy_auth_sessions').doc(userId)
    const authSessionDoc = await authSessionRef.get()

    if (!authSessionDoc.exists) {
      console.error('❌ Callback - Auth session bulunamadı. Akış zaman aşımına uğramış olabilir.')
      return NextResponse.redirect(new URL('/stores?error=session_expired', request.url))
    }

    const { code_verifier, state: sessionState } = authSessionDoc.data()!

    // CSRF Koruması: Etsy'den dönen state ile bizim kaydettiğimiz state eşleşmeli
    if (state !== sessionState) {
      console.error('❌ Callback - State uyuşmazlığı! CSRF saldırısı olabilir.')
      return NextResponse.redirect(new URL('/stores?error=state_mismatch', request.url))
    }
    
    // 3. Etsy'den token'ları al
    console.log('🔄 Etsy token exchange başlatılıyor - kullanıcı:', userId)
    
    const tokenResponse = await fetch('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.ETSY_CLIENT_ID!,
        redirect_uri: process.env.ETSY_REDIRECT_URI!,
        code,
        code_verifier,
      }),
    })
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('❌ Etsy token exchange hatası:', errorText)
      return NextResponse.redirect(new URL('/stores?error=token_exchange_failed&details=' + encodeURIComponent(errorText), request.url))
    }
    
    const tokenData = await tokenResponse.json()
    console.log('✅ Etsy token alındı')
    
    // 4. Etsy'den mağaza bilgilerini al
    console.log('🔄 Kullanıcının mağaza bilgileri alınıyor...')
    
    const shopsResponse = await fetch('https://openapi.etsy.com/v3/application/shops', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'x-api-key': process.env.ETSY_CLIENT_ID!,
      },
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
    
    // 5. Tüm verileri Firestore'a toplu olarak yaz
    const batch = db.batch()
    
    // Token'ları kaydet (Doküman ID = kullanıcı ID)
    const tokenRef = db.collection('etsy_tokens').doc(userId)
    batch.set(tokenRef, {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000),
      token_type: tokenData.token_type || 'Bearer',
      user_id: userId,
      created_at: new Date(),
      updated_at: new Date()
    })
    
    // Mağaza bilgilerini kaydet (Doküman ID = kullanıcı ID)
    const storeRef = db.collection('etsy_stores').doc(userId)
    batch.set(storeRef, {
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
    
    // Kullanılan auth session'ı sil
    batch.delete(authSessionRef)
    
    await batch.commit()

    // Başarılı yönlendirme
    console.log(`✅ Etsy bağlantısı kullanıcı ${userId} için başarıyla tamamlandı.`)
    return NextResponse.redirect(new URL('/stores?etsy=connected', request.url))
    
  } catch (error) {
    console.error('💥 Callback genel hatası:', error)
    const errorMessage = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu."
    return NextResponse.redirect(new URL('/stores?error=callback_failed&details=' + encodeURIComponent(errorMessage), request.url))
  }
}