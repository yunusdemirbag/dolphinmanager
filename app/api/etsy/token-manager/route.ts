import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import EtsyApiManager from "@/lib/etsy-api-manager";
import { invalidateEtsyToken, cleanupDuplicateTokens } from "@/lib/etsy-api";

/**
 * GET: Token durumunu kontrol eder ve bilgi verir
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({
        error: "Kimlik doğrulama hatası",
        status: false
      }, { status: 401 });
    }
    
    const userId = user.id;
    
    // Kullanıcının token bilgilerini getir
    const { data: tokens, error: tokensError } = await supabase
      .from("etsy_tokens")
      .select("id, access_token, refresh_token, expires_at, created_at, is_valid, shop_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    
    if (tokensError) {
      console.error("Token bilgileri alınamadı:", tokensError);
      return NextResponse.json({
        error: "Token bilgileri alınamadı",
        status: false
      }, { status: 500 });
    }
    
    // Token durumlarını kontrol et
    const tokenStatus = tokens.map(token => {
      const expiresAt = new Date(token.expires_at);
      const now = new Date();
      const isExpired = expiresAt < now;
      const expiresInMs = expiresAt.getTime() - now.getTime();
      const expiresInDays = Math.floor(expiresInMs / (1000 * 60 * 60 * 24));
      
      return {
        id: token.id,
        token: token.access_token ? `${token.access_token.substring(0, 10)}...` : null,
        is_valid: token.is_valid,
        is_expired: isExpired,
        expires_in_days: expiresInDays,
        expires_at: token.expires_at,
        created_at: token.created_at,
        shop_id: token.shop_id
      };
    });
    
    return NextResponse.json({
      status: true,
      tokens: tokenStatus,
      tokens_count: tokens.length,
      has_duplicates: tokens.length > 1,
      has_expired: tokenStatus.some(t => t.is_expired)
    });
    
  } catch (error) {
    console.error("Token yönetimi hatası:", error);
    return NextResponse.json({
      error: "Beklenmeyen bir hata oluştu",
      status: false
    }, { status: 500 });
  }
}

/**
 * POST: Token temizleme ve yenileme işlemleri yapar
 */
export async function POST(request: NextRequest) {
  try {
    // İstek gövdesini analiz et
    const body = await request.json();
    const action = body.action; // 'cleanup', 'refresh', 'invalidate'
    
    if (!action) {
      return NextResponse.json({
        error: "Geçersiz istek - action parametresi gerekli",
        status: false
      }, { status: 400 });
    }
    
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({
        error: "Kimlik doğrulama hatası",
        status: false
      }, { status: 401 });
    }
    
    const userId = user.id;
    const tokenId = body.token_id;
    
    // İşlem tipine göre aksiyon al
    switch (action) {
      case "cleanup":
        // Yinelenen token'ları temizle
        await cleanupDuplicateTokens(userId);
        return NextResponse.json({
          status: true,
          message: "Token'lar başarıyla temizlendi"
        });
        
      case "invalidate":
        if (!tokenId) {
          return NextResponse.json({
            error: "Token ID belirtilmedi",
            status: false
          }, { status: 400 });
        }
        
        // Belirli bir token'ı geçersiz kıl
        await supabase
          .from("etsy_tokens")
          .update({ is_valid: false })
          .eq("id", tokenId)
          .eq("user_id", userId);
          
        return NextResponse.json({
          status: true,
          message: "Token başarıyla geçersiz kılındı"
        });
        
      case "refresh_all":
        // Tüm token'ları yenile
        const etsyApiManager = EtsyApiManager.getInstance();
        
        try {
          const accessToken = await etsyApiManager.getValidAccessToken(userId);
          return NextResponse.json({
            status: true,
            message: "Token'lar başarıyla yenilendi",
            token_preview: accessToken ? `${accessToken.substring(0, 10)}...` : null
          });
        } catch (tokenError) {
          console.error("Token yenileme hatası:", tokenError);
          return NextResponse.json({
            error: "Token yenilenemedi",
            status: false,
            message: tokenError instanceof Error ? tokenError.message : "Bilinmeyen hata"
          }, { status: 500 });
        }
        
      default:
        return NextResponse.json({
          error: "Geçersiz işlem tipi",
          status: false
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error("Token yönetimi hatası:", error);
    return NextResponse.json({
      error: "Beklenmeyen bir hata oluştu",
      status: false
    }, { status: 500 });
  }
} 