import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import * as jose from 'jose'

const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const JWKS_URL =
  'https://www.googleapis.com/service_account/v1/jwk/securetoken.google.com'

async function verifyToken(token: string) {
  try {
    if (!FIREBASE_PROJECT_ID) {
      throw new Error('Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable')
    }
    const JWKS = jose.createRemoteJWKSet(new URL(JWKS_URL))
    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    })
    return payload
  } catch (error: any) {
    console.error('Token verification failed:', error.message)
    return null
  }
}

export async function authMiddleware(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  
  // In development, if headers are not provided, we can bypass auth for ease of testing
  if (process.env.NODE_ENV === 'development' && !authHeader) {
    console.warn("Auth bypassed in development mode. No Authorization header found.");
    const devHeaders = new Headers(request.headers);
    devHeaders.set('x-user-id', 'dev-user-id');
    devHeaders.set('x-user-email', 'dev@example.com');
    return NextResponse.next({
      request: {
        headers: devHeaders,
      },
    });
  }

  const token = authHeader?.split('Bearer ')[1]

  if (!token) {
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized: No token provided' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const decodedToken = await verifyToken(token)

  if (!decodedToken || !decodedToken.sub) {
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized: Invalid token' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  console.log('Firebase token verified successfully for UID:', decodedToken.sub)

  // Add user info to headers to be accessed in API routes
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', decodedToken.sub)
  if (decodedToken.email) {
     requestHeaders.set('x-user-email', decodedToken.email as string);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export function createUnauthorizedResponse() {
  return Response.json(
    { error: 'Yetkisiz erişim', code: 'UNAUTHORIZED' },
    { status: 401 }
  )
}

// Helper function to verify the token
export async function verifyAuth(token: string) {
  try {
    const { payload } = await jose.jwtVerify(token, jose.createRemoteJWKSet(new URL(JWKS_URL)), {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });

    return payload;
  } catch (error) {
    console.error('Error verifying auth token with jose:', error);
    return null;
  }
}