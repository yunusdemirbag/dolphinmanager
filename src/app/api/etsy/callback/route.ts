import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase/admin'

// Node.js runtime kullan
export const runtime = 'nodejs';

// Etsy API kimlik bilgileri
const ETSY_CLIENT_ID = process.env.ETSY_CLIENT_ID!
const ETSY_CLIENT_SECRET = process.env.ETSY_CLIENT_SECRET!
const REDIRECT_URI = process.env.ETSY_REDIRECT_URI || 'https://dolphinmanager-phi.vercel.app/api/etsy/callback'

export async function GET(request: NextRequest) {
  try {
    console.log('[etsy/callback] Callback başlangıç')
    
    // URL parametrelerini al
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')
    
    console.log('[etsy/callback] Parametreler:', { code: !!code, state: !!state, error })
    
    // Hata kontrolü
    if (error) {
      console.error('[etsy/callback] Etsy error:', error)
      return NextResponse.redirect('/stores?error=' + encodeURIComponent(error))
    }
    
    if (!code || !state) {
      console.error('[etsy/callback] Eksik parametreler')
      return NextResponse.redirect('/stores?error=missing_params')
    }
    
    // State değerine göre auth session'ı bul
    const sessionsSnapshot = await db.collection('etsy_auth_sessions')
      .where('state', '==', state)
      .get()
    
    if (sessionsSnapshot.empty) {
      console.error('[etsy/callback] Geçersiz state')
      return NextResponse.redirect('/stores?error=invalid_state')
    }
    
    // Auth session bilgilerini al
    const sessionDoc = sessionsSnapshot.docs[0]
    const sessionData = sessionDoc.data()
    const userId = sessionData.state // state = userId
    const codeVerifier = sessionData.code_verifier
    
    console.log('[etsy/callback] Session bulundu:', { userId })
    
    // Token takası için Etsy API'ye istek gönder
    try {
      const tokenResponse = await fetch('https://api.etsy.com/v3/public/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: ETSY_CLIENT_ID,
          client_secret: ETSY_CLIENT_SECRET, // Önemli: client_secret gerekli
          code: code,
          redirect_uri: REDIRECT_URI,
          code_verifier: codeVerifier,
        }).toString(),
      })
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        console.error('[etsy/callback] Token hatası:', tokenResponse.status, errorText)
        return NextResponse.redirect(`/stores?error=token_error&details=${encodeURIComponent(errorText)}`)
      }
      
      // Token yanıtını parse et
      const tokenData = await tokenResponse.json()
      console.log('[etsy/callback] Token alındı:', { 
        has_access_token: !!tokenData.access_token,
        has_refresh_token: !!tokenData.refresh_token,
        expires_in: tokenData.expires_in
      })
      
      // Token bilgilerini Firebase'e kaydet
      const expiresAt = new Date()
      expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in)
      
      await db.collection('etsy_tokens').doc(userId).set({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_type: tokenData.token_type,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      
      console.log('[etsy/callback] Token kaydedildi')
      
      // Etsy mağaza bilgilerini çek - EN GÜVENİLİR YÖNTEM: /me/shops endpoint'ini kullan
      try {
        const shopsResponse = await fetch('https://openapi.etsy.com/v3/application/me/shops', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'x-api-key': ETSY_CLIENT_ID,
          },
        })
        
        if (!shopsResponse.ok) {
          const errorText = await shopsResponse.text()
          console.error('[etsy/callback] Mağaza bilgileri hatası:', shopsResponse.status, errorText)
          return NextResponse.redirect('/stores?success=token_saved&error=shops_error')
        }
        
        // Mağaza bilgilerini parse et
        const shopsData = await shopsResponse.json()
        console.log('[etsy/callback] Mağazalar alındı:', shopsData.count)
        
        // Mağaza bilgilerini Firebase'e kaydet
        if (shopsData.count > 0) {
          const batch = db.batch()
          
          for (const shop of shopsData.results) {
            const shopRef = db.collection('etsy_stores').doc(`${userId}_${shop.shop_id}`)
            batch.set(shopRef, {
              user_id: userId,
              shop_id: shop.shop_id,
              shop_name: shop.shop_name,
              title: shop.title,
              currency_code: shop.currency_code,
              is_vacation: shop.is_vacation || false,
              listing_active_count: shop.listing_active_count || 0,
              num_favorers: shop.num_favorers || 0,
              url: shop.url || `https://www.etsy.com/shop/${shop.shop_name}`,
              image_url_760x100: shop.image_url_760x100,
              review_count: shop.review_count || 0,
              review_average: shop.review_average || 0,
              is_active: true,
              last_synced_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
          }
          
          await batch.commit()
          console.log('[etsy/callback] Mağaza bilgileri kaydedildi')
        }
        
        // Kullanıcıyı mağaza sayfasına yönlendir
        return NextResponse.redirect('/stores?success=true')
      } catch (shopError) {
        console.error('[etsy/callback] Mağaza bilgileri alınırken hata:', shopError)
        return NextResponse.redirect('/stores?success=token_saved&error=shops_error')
      }
    } catch (tokenError) {
      console.error('[etsy/callback] Token takası hatası:', tokenError)
      return NextResponse.redirect('/stores?error=token_exchange_error')
    }
  } catch (error) {
    console.error('[etsy/callback] Hata:', error)
    return NextResponse.redirect('/stores?error=unexpected_error')
  }
}