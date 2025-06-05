import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth';

export async function GET() {
  try {
    // Kullanıcı kontrolü
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Supabase client oluştur
    const supabase = await createClient();

    // Etsy token tablosunun var olup olmadığını kontrol et
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'etsy_tokens');

    // Veritabanı şema durumu
    const dbStatus = {
      etsy_tokens_table_exists: tables && tables.length > 0,
      tables_error: tablesError ? JSON.stringify(tablesError) : null
    };

    // Kullanıcının token'larını kontrol et
    const { data: tokens, error: tokensError } = await supabase
      .from('etsy_tokens')
      .select('*')
      .eq('user_id', user.id);

    // Kullanıcı bilgileri
    const userInfo = {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    };

    // Güvenlik için token içeriğini gizle ama varlığını bildir
    const tokenStatus = tokens?.map(token => ({
      user_id: token.user_id,
      has_access_token: !!token.access_token,
      has_refresh_token: !!token.refresh_token,
      expires_at: token.expires_at ? new Date(token.expires_at * 1000).toISOString() : null,
      is_expired: token.expires_at ? token.expires_at < Math.floor(Date.now() / 1000) : true,
      created_at: token.created_at,
      updated_at: token.updated_at
    })) || [];

    return NextResponse.json({
      user: userInfo,
      database: dbStatus,
      tokens: tokenStatus,
      tokens_error: tokensError ? JSON.stringify(tokensError) : null,
      environment: {
        has_etsy_client_id: !!process.env.ETSY_CLIENT_ID,
        has_etsy_redirect_uri: !!process.env.ETSY_REDIRECT_URI,
        has_etsy_scope: !!process.env.ETSY_SCOPE,
        next_public_supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 10) + '...',
        has_next_public_supabase_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: String(error) }, { status: 500 });
  }
} 