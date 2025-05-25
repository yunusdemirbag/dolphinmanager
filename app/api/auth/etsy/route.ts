import { NextResponse } from 'next/server';
import { createClientSupabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  
  if (!code) {
    return NextResponse.redirect('/stores?error=no_code');
  }

  try {
    // Etsy'den access token al
    const tokenResponse = await fetch('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.ETSY_CLIENT_ID as string,
        redirect_uri: process.env.ETSY_REDIRECT_URI as string,
        code: code,
        code_verifier: state as string,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get access token');
    }

    const tokenData = await tokenResponse.json();
    
    // Supabase'e kaydet
    const supabase = createClientSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.redirect('/stores?error=no_user');
    }

    // Token'ları kaydet
    const { error } = await supabase
      .from('etsy_tokens')
      .upsert({
        user_id: user.id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Token save error:', error);
      throw error;
    }

    return NextResponse.redirect('/stores?success=true');
  } catch (error) {
    console.error('Etsy OAuth error:', error);
    return NextResponse.redirect('/stores?error=oauth_failed');
  }
} 