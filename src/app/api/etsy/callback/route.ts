import { NextRequest, NextResponse } from 'next/server'
import { db as adminDb } from '@/lib/firebase/admin'

export async function GET(request: NextRequest) {
  try {
    console.log('Etsy callback received')
    
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // state = userId
    const error = searchParams.get('error')

    console.log('Callback params:', { 
      code: code ? code.substring(0, 5) + '...' : null, 
      state, 
      error 
    })

    const redirectError = (errorCode: string, details?: string) => {
      const url = new URL('/stores', request.url)
      url.searchParams.set('error', errorCode)
      if (details) url.searchParams.set('details', details)
      console.error('Redirecting with error:', errorCode, details)
      return NextResponse.redirect(url)
    }

    if (error) {
      return redirectError('etsy_auth_failed', error)
    }

    if (!code || !state) {
      return redirectError('missing_params', 'Code or state is missing.')
    }

    // Kullanıcı ID'sini state parametresinden alıyoruz
    const userId = state
    
    // Auth session'ı kontrol et
    const authSessionRef = adminDb.collection('etsy_auth_sessions').doc(userId)
    const authSessionDoc = await authSessionRef.get()

    if (!authSessionDoc.exists) {
      return redirectError('session_expired', 'Auth session not found.')
    }

    const { code_verifier } = authSessionDoc.data()!

    console.log('Auth session found:', {
      exists: authSessionDoc.exists,
      hasVerifier: !!code_verifier
    })

    if (!code_verifier) {
      return redirectError(
        'pkce_missing',
        'Session expired or invalid. Please try connecting again.',
      )
    }

    // Token değişimi
    console.log('Exchanging code for token with code verifier:', code_verifier.substring(0, 10) + '...')
    
    const redirectUri = process.env.ETSY_REDIRECT_URI || 
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/etsy/callback`
    
    console.log('Using redirect URI:', redirectUri)
    
    const tokenResponse = await fetch('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.ETSY_CLIENT_ID!,
        client_secret: process.env.ETSY_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        code,
        code_verifier,
      }),
    })

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text()
      console.error('Etsy token exchange failed:', {
        status: tokenResponse.status,
        body: errorBody,
      })
      return redirectError('token_exchange_failed', errorBody)
    }

    const tokenData = await tokenResponse.json()
    console.log('Token exchange successful')
    
    // Etsy kullanıcı ID'sini token'dan çıkar
    const etsyUserId = tokenData.access_token.split('.')[0]
    console.log('Etsy user ID extracted from token:', etsyUserId)
    
    // Mağaza bilgilerini çek - Kullanıcıya özel endpoint kullanılıyor
    console.log('Fetching Etsy shop info with access token')
    
    const shopsResponse = await fetch(`https://openapi.etsy.com/v3/application/users/${etsyUserId}/shops`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'x-api-key': process.env.ETSY_CLIENT_ID!,
      },
    })

    if (!shopsResponse.ok) {
      const errorBody = await shopsResponse.text()
      console.error('Failed to fetch Etsy shop info:', {
        status: shopsResponse.status,
        body: errorBody,
      })
      return redirectError('shop_info_failed', errorBody)
    }

    const shopsData = await shopsResponse.json()
    if (!shopsData.results || shopsData.results.length === 0) {
      return redirectError('no_shop_found', 'No shop found for this user on Etsy.')
    }
    
    const shop = shopsData.results[0]
    console.log('Shop info fetched successfully:', shop.shop_name)
    
    // Veritabanına kaydet
    console.log('Saving Etsy data for user:', userId, 'and shop:', shop.shop_name)
    
    const batch = adminDb.batch()

    // Token'ı kaydet
    const tokenRef = adminDb.collection('etsy_tokens').doc(userId)
    batch.set(tokenRef, {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000),
      user_id: userId,
      updated_at: new Date(),
    }, { merge: true })

    // Mağazayı kaydet
    const storeRef = adminDb.collection('etsy_stores').doc(shop.shop_id.toString())
    batch.set(storeRef, {
      user_id: userId,
      shop_id: shop.shop_id,
      shop_name: shop.shop_name,
      title: shop.title || shop.shop_name,
      currency_code: shop.currency_code,
      url: shop.url,
      updated_at: new Date(),
    }, { merge: true })
    
    // Geçici auth session'ı sil
    batch.delete(authSessionRef)

    await batch.commit()
    console.log('Etsy data saved successfully')

    // Başarılı yönlendirme
    const successUrl = new URL('/stores', request.url)
    successUrl.searchParams.set('etsy_connected', shop.shop_name)
    console.log('Redirecting to success URL')
    return NextResponse.redirect(successUrl)
  } catch (err: any) {
    console.error('💥 Etsy callback failed:', err)
    return NextResponse.redirect(
      new URL(`/stores?error=callback_failed&details=${encodeURIComponent(err.message)}`, request.url)
    )
  }
}