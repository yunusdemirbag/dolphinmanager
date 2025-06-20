import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, createUnauthorizedResponse } from '@/lib/auth-middleware'

export async function GET(request: NextRequest) {
  try {
    // Kullanıcı doğrulama
    const authResult = await authenticateRequest(request)
    
    if (!authResult) {
      return createUnauthorizedResponse()
    }
    
    // Etsy OAuth URL oluştur
    const clientId = process.env.ETSY_CLIENT_ID
    const redirectUri = process.env.ETSY_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL}/api/etsy/callback`
    const scope = process.env.ETSY_SCOPE || "shops_r shops_w listings_r listings_w"
    const state = authResult.userId // Güvenlik için user ID kullan
    
    // Code verifier oluştur (PKCE için)
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = await generateCodeChallenge(codeVerifier)
    
    // Code verifier'ı geçici olarak sakla (gerçek projede Redis/DB kullan)
    // Şimdilik cookie'de saklayalım
    
    const authUrl = new URL('https://www.etsy.com/oauth/connect')
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', clientId!)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', scope)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('code_challenge', codeChallenge)
    authUrl.searchParams.set('code_challenge_method', 'S256')
    
    return NextResponse.json({
      success: true,
      authUrl: authUrl.toString(),
      codeVerifier: codeVerifier // Frontend'de saklanacak
    })
    
  } catch (error: any) {
    console.error('Etsy auth URL error:', error)
    return NextResponse.json(
      { error: 'Etsy auth URL oluşturulamadı', details: error.message },
      { status: 500 }
    )
  }
}

// PKCE code verifier oluştur
function generateCodeVerifier(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  let result = ''
  for (let i = 0; i < 128; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// PKCE code challenge oluştur
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}