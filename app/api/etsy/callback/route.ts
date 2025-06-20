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
    
    // Şimdilik basit token exchange (gerçek implementasyon sonra)
    console.log('🔄 Token exchange simülasyonu - kullanıcı:', userId)
    
    // Mock token data - gerçek Etsy API'sine istek atmayalım şimdilik
    const mockTokenData = {
      access_token: 'mock_access_token_' + Date.now(),
      refresh_token: 'mock_refresh_token_' + Date.now(),
      expires_in: 3600,
      token_type: 'Bearer'
    }
    
    // Token'ı Firebase'e kaydet
    try {
      await db.collection('etsy_tokens').doc(userId).set({
        access_token: mockTokenData.access_token,
        refresh_token: mockTokenData.refresh_token,
        expires_at: new Date(Date.now() + mockTokenData.expires_in * 1000),
        token_type: mockTokenData.token_type,
        user_id: userId,
        created_at: new Date(),
        updated_at: new Date()
      })
      
      console.log('✅ Token Firebase\'e kaydedildi')
    } catch (tokenError) {
      console.error('❌ Token kaydetme hatası:', tokenError)
      return NextResponse.redirect(new URL('/stores?error=token_save_failed', request.url))
    }
    
    // Mock mağaza data - gerçek Etsy API'sine istek atmayalım şimdilik  
    const mockStoreData = {
      shop_id: Math.floor(Math.random() * 1000000),
      shop_name: 'TestShop_' + Date.now(),
      title: 'Test Etsy Mağazası',
      currency_code: 'USD',
      listing_active_count: 5,
      num_favorers: 100,
      review_count: 50,
      review_average: 4.5,
      url: 'https://etsy.com/shop/testshop',
      is_active: true
    }
    
    // Mağaza bilgilerini Firebase'e kaydet
    try {
      await db.collection('etsy_stores').doc(`${userId}_${mockStoreData.shop_id}`).set({
        user_id: userId,
        shop_id: mockStoreData.shop_id,
        shop_name: mockStoreData.shop_name,
        title: mockStoreData.title,
        currency_code: mockStoreData.currency_code,
        listing_active_count: mockStoreData.listing_active_count,
        num_favorers: mockStoreData.num_favorers,
        review_count: mockStoreData.review_count,
        review_average: mockStoreData.review_average,
        url: mockStoreData.url,
        is_active: mockStoreData.is_active,
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