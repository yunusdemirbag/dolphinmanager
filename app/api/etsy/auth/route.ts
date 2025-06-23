import { NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';
import { generateCodeVerifier, generateCodeChallenge, generateState } from '@/lib/crypto-utils';

export async function GET() {
  try {
    // Firebase Admin'i başlat
    initializeAdminApp();
    
    const clientId = process.env.ETSY_CLIENT_ID;
    const redirectUri = process.env.ETSY_REDIRECT_URI;
    const scope = process.env.ETSY_SCOPE;

    if (!clientId || !redirectUri || !scope) {
      console.error('Etsy API yapılandırması eksik:', {
        clientId: !!clientId,
        redirectUri: !!redirectUri,
        scope: !!scope,
      });
      return NextResponse.json(
        { error: 'Etsy API yapılandırması eksik' },
        { status: 500 }
      );
    }

    // PKCE parametrelerini oluştur
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();
    const sessionId = Math.random().toString(36).substring(7);
    const userId = process.env.MOCK_USER_ID || 'local-user-123';

    // Session bilgilerini Firebase'e kaydet
    if (adminDb) {
      await adminDb.collection('etsy_auth_sessions').doc(sessionId).set({
        codeVerifier,
        state,
        userId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 dakika
      });
    }

    // Etsy OAuth URL'si oluştur
    const authUrl = new URL('https://www.etsy.com/oauth/connect');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('state', `${state}:${sessionId}`);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    console.log('Etsy yetkilendirme URL\'si oluşturuldu');

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Etsy auth hatası:', error);
    return NextResponse.json(
      { error: 'Yetkilendirme hatası' },
      { status: 500 }
    );
  }
}