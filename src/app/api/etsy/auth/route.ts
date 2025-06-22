import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import crypto from 'crypto'
import { db } from '@/lib/firebase/admin'

// Etsy API kimlik bilgileri
const ETSY_CLIENT_ID = process.env.ETSY_CLIENT_ID!
const ETSY_CLIENT_SECRET = process.env.ETSY_CLIENT_SECRET!
const REDIRECT_URI = process.env.ETSY_REDIRECT_URI || 'https://dolphinmanager-phi.vercel.app/api/etsy/callback'
const ETSY_SCOPE = 'transactions_r transactions_w listings_r listings_w shops_r shops_w profile_r'

export async function GET(request: NextRequest) {
  try {
    console.log('[etsy/auth] Auth başlangıç')
    
    // Kullanıcı kimlik doğrulaması
    const user = await getAuthenticatedUser(request)
    if (!user) {
      console.log('[etsy/auth] Kimlik doğrulama hatası')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('[etsy/auth] Kullanıcı:', user.uid)
    
    // PKCE için code_verifier oluştur
    const codeVerifier = crypto.randomBytes(64).toString('base64url')
    // code_challenge = SHA256(code_verifier)
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url')
    
    // State değeri oluştur (CSRF koruması için)
    const state = crypto.randomBytes(16).toString('hex')
    
    // Auth session bilgilerini Firebase'e kaydet
    await db.collection('etsy_auth_sessions').doc(user.uid).set({
      user_id: user.uid,
      code_verifier: codeVerifier,
      state: state,
      created_at: new Date().toISOString()
    })
    
    console.log('[etsy/auth] Auth session kaydedildi')
    
    // Etsy OAuth URL'ini oluştur
    const authUrl = new URL('https://www.etsy.com/oauth/connect')
    authUrl.searchParams.append('response_type', 'code')
    authUrl.searchParams.append('client_id', ETSY_CLIENT_ID)
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI)
    authUrl.searchParams.append('scope', ETSY_SCOPE)
    authUrl.searchParams.append('state', state)
    authUrl.searchParams.append('code_challenge', codeChallenge)
    authUrl.searchParams.append('code_challenge_method', 'S256')
    
    console.log('[etsy/auth] Auth URL oluşturuldu:', authUrl.toString())
    
    // Kullanıcıyı Etsy OAuth sayfasına yönlendir
    return NextResponse.json({ 
      success: true, 
      url: authUrl.toString() 
    })
    
  } catch (error) {
    console.error('[etsy/auth] Hata:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}