import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { exchangeCodeForToken } from '@/lib/etsy-api';

export async function GET(request: NextRequest) {
  try {
    // URL'den code ve state değerlerini al
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const error_description = searchParams.get('error_description');

    // Hata kontrolü
    if (error) {
      console.error("Etsy OAuth hata döndürdü:", error, error_description);
      return NextResponse.redirect(new URL(`/stores?error=${error}&description=${error_description}`, request.url));
    }

    if (!code || !state) {
      console.error("Eksik code veya state parametresi");
      return NextResponse.redirect(new URL('/stores?error=missing_params', request.url));
    }

    // Kullanıcıyı al (oturum açmış olmalı)
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("Kullanıcı kimliği alınamadı:", userError);
      return NextResponse.redirect(new URL('/auth/signin?error=authentication_required&redirect=/stores', request.url));
    }

    try {
      console.log("Etsy code token'a çevriliyor. Code:", code.substring(0, 5) + "...", "State:", state.substring(0, 5) + "...");
      
      // Token almak için code değerini kullan
      const tokens = await exchangeCodeForToken(code, user.id);
      
      console.log("Token başarıyla alındı. Tokens:", {
        access_token_length: tokens.access_token ? tokens.access_token.length : 0,
        refresh_token_length: tokens.refresh_token ? tokens.refresh_token.length : 0,
        expires_in: tokens.expires_in,
        token_type: tokens.token_type
      });

      // Başarılı yönlendirme
      return NextResponse.redirect(new URL('/stores?success=true', request.url));
    } catch (tokenError) {
      console.error("Token alınırken hata:", tokenError);
      return NextResponse.redirect(new URL('/stores?error=token_exchange_failed', request.url));
    }
  } catch (error) {
    console.error("Callback işleyicide beklenmeyen hata:", error);
    return NextResponse.redirect(new URL('/stores?error=unknown_error', request.url));
  }
} 