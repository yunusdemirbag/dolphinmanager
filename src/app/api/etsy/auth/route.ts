import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { db } from '@/lib/firebase/admin'

// PKCE (Proof Key for Code Exchange) için yardımcı fonksiyonlar
function generateCodeVerifier(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  let result = ''
  for (let i = 0; i < 128; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  
  // ES5 uyumluluğu için Uint8Array'i manuel olarak string'e çevir
  let binary = ''
  const bytes = new Uint8Array(digest)
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      })
    }

    const clientId = process.env.ETSY_CLIENT_ID
    const redirectUri = process.env.ETSY_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL}/api/etsy/callback`
    const scope = 'shops_r shops_w listings_r listings_w transactions_r'
    const state = user.uid // Use user ID for security

    const codeVerifier = generateCodeVerifier()
    const codeChallenge = await generateCodeChallenge(codeVerifier)

    // Store the code_verifier in Firestore to retrieve it in the callback
    await db.collection('etsy_auth_sessions').doc(user.uid).set({
      code_verifier: codeVerifier,
      created_at: new Date(),
    })

    const authUrl = new URL('https://www.etsy.com/oauth/connect')
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', clientId!)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', scope)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('code_challenge', codeChallenge)
    authUrl.searchParams.set('code_challenge_method', 'S256')

    return NextResponse.json({ authUrl: authUrl.toString() })
  } catch (error: any) {
    console.error('Failed to create Etsy auth URL:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Failed to initiate Etsy connection' }),
      { status: 500 },
    )
  }
}