import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/auth'
import { getEtsyAuthUrl } from "@/lib/etsy-api"
import crypto from 'crypto'
import { db } from '@/lib/firebase/admin'

// Etsy API sabitleri
const ETSY_CLIENT_ID = process.env.ETSY_CLIENT_ID || ""
const ETSY_CLIENT_SECRET = process.env.ETSY_CLIENT_SECRET || ""
const REDIRECT_URI = process.env.ETSY_REDIRECT_URI || 'https://dolphinmanager-phi.vercel.app/api/etsy/callback'
const ETSY_SCOPE = process.env.ETSY_SCOPE || "email_r profile_r shops_r shops_w listings_r listings_w listings_d transactions_r transactions_w profile_r address_r address_w billing_r cart_r cart_w"

export async function GET(request: NextRequest) {
  try {
    console.log('[etsy/auth] Auth URL isteği alındı')
    
    // Kimlik doğrulama
    const user = await getAuthenticatedUser(request);
    if (!user) {
      console.log('[etsy/auth] Kimlik doğrulama hatası')
      return createUnauthorizedResponse();
    }
    
    console.log('[etsy/auth] Kullanıcı:', user.uid)
    
    // PKCE için code_verifier oluştur (Node.js uyumlu)
    const codeVerifier = crypto.randomBytes(64).toString('base64url')
    
    // code_challenge = SHA256(code_verifier) (Node.js uyumlu)
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url')
    
    // Auth session bilgilerini Firebase'e kaydet
    await db.collection('etsy_auth_sessions').doc(user.uid).set({
      user_id: user.uid,
      code_verifier: codeVerifier,
      state: user.uid, // User ID'yi state olarak kullan
      created_at: new Date().toISOString()
    })
    
    console.log('[etsy/auth] Auth session kaydedildi')
    
    // Etsy OAuth URL'ini oluştur
    const authUrl = new URL('https://www.etsy.com/oauth/connect')
    authUrl.searchParams.append('response_type', 'code')
    authUrl.searchParams.append('client_id', ETSY_CLIENT_ID)
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI)
    authUrl.searchParams.append('scope', ETSY_SCOPE)
    authUrl.searchParams.append('state', user.uid)
    authUrl.searchParams.append('code_challenge', codeChallenge)
    authUrl.searchParams.append('code_challenge_method', 'S256')
    
    console.log('[etsy/auth] Auth URL oluşturuldu:', authUrl.toString())
    
    // URL'yi JSON olarak döndür
    return NextResponse.json({ url: authUrl.toString() })
    
  } catch (error) {
    console.error('[etsy/auth] Hata:', error)
    return NextResponse.json(
      { error: 'Failed to generate auth URL', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}