import { NextResponse } from 'next/server';

export async function GET() {
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
    
    // Basitleştirilmiş Etsy OAuth - PKCE olmadan
    const authUrl = new URL('https://www.etsy.com/oauth/connect');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('state', state);

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