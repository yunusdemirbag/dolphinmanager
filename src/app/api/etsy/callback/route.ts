import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase/admin'

async function exchangeCodeForToken(code: string, codeVerifier: string) {
  const response = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.ETSY_CLIENT_ID!,
      redirect_uri:
        process.env.ETSY_REDIRECT_URI ||
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/etsy/callback`,
      code,
      code_verifier: codeVerifier,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Etsy token exchange failed:', {
      status: response.status,
      body: errorBody,
    })
    throw new Error(`Token exchange failed: ${errorBody}`)
  }

  return response.json()
}

async function fetchEtsyShopInfo(accessToken: string) {
  const response = await fetch('https://openapi.etsy.com/v3/application/shops', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'x-api-key': process.env.ETSY_CLIENT_ID!,
    },
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Failed to fetch Etsy shop info:', {
      status: response.status,
      body: errorBody,
    })
    throw new Error(`Failed to fetch shop info: ${errorBody}`)
  }

  const data = await response.json()
  if (!data.results || data.results.length === 0) {
    throw new Error('No shop found for this user on Etsy.')
  }
  return data.results[0] // Return the first shop
}

async function saveEtsyData(
  userId: string,
  tokenData: any,
  shopData: any,
) {
  const batch = db.batch()

  // Save/update token
  const tokenRef = db.collection('etsy_tokens').doc(userId)
  batch.set(tokenRef, {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: new Date(Date.now() + tokenData.expires_in * 1000),
    user_id: userId,
    updated_at: new Date(),
  }, { merge: true })

  // Save/update store
  const storeRef = db.collection('etsy_stores').doc(shopData.shop_id.toString())
  batch.set(storeRef, {
    user_id: userId,
    shop_id: shopData.shop_id,
    shop_name: shopData.shop_name,
    title: shopData.title || shopData.shop_name,
    currency_code: shopData.currency_code,
    url: shopData.url,
    updated_at: new Date(),
  }, { merge: true })
  
  // Delete the temporary auth session
  const sessionRef = db.collection('etsy_auth_sessions').doc(userId)
  batch.delete(sessionRef)

  await batch.commit()
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const userId = searchParams.get('state') // 'state' should be the userId
  const error = searchParams.get('error')

  const redirectError = (errorCode: string, details?: string) => {
    const url = new URL('/stores', request.url)
    url.searchParams.set('error', errorCode)
    if (details) url.searchParams.set('details', details)
    return NextResponse.redirect(url)
  }

  if (error) {
    return redirectError('etsy_auth_failed', error)
  }

  if (!code || !userId) {
    return redirectError('missing_params', 'Code or state is missing.')
  }

  try {
    const authSessionDoc = await db
      .collection('etsy_auth_sessions')
      .doc(userId)
      .get()
    const codeVerifier = authSessionDoc.data()?.code_verifier

    if (!codeVerifier) {
      return redirectError(
        'pkce_missing',
        'Session expired or invalid. Please try connecting again.',
      )
    }

    const tokenData = await exchangeCodeForToken(code, codeVerifier)
    const shopData = await fetchEtsyShopInfo(tokenData.access_token)
    await saveEtsyData(userId, tokenData, shopData)

    const successUrl = new URL('/stores', request.url)
    successUrl.searchParams.set('etsy_connected', shopData.shop_name)
    return NextResponse.redirect(successUrl)
  } catch (err: any) {
    console.error('💥 Etsy callback failed:', err)
    return redirectError('callback_failed', err.message)
  }
}