import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
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

    const state = Math.random().toString(36).substring(7);
    const codeChallenge = 'dummy-challenge'; // Gerçek implementasyonda PKCE kullanılmalı

    const authUrl = new URL('https://www.etsy.com/oauth/connect');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    console.log('Etsy yetkilendirme URL\'si oluşturuldu:', authUrl.toString());

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Etsy auth hatası:', error);
    return NextResponse.json(
      { error: 'Yetkilendirme hatası' },
      { status: 500 }
    );
  }
}