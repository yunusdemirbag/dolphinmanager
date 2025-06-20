import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Kullanıcı doğrulama
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log("Auth error in refresh-token endpoint:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    console.log(`Attempting to refresh token for user ${user.id}`);
    
    // En son token'ı bul
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("etsy_tokens")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);
      
    if (tokenError) {
      console.error("Token query error:", tokenError);
      return NextResponse.json({ 
        error: "DATABASE_ERROR", 
        message: "Veritabanından token bilgisi alınamadı"
      }, { status: 500 });
    }
    
    if (!tokenData || tokenData.length === 0) {
      console.log("No token found for user");
      return NextResponse.json({ 
        error: "NO_TOKEN", 
        message: "Kullanıcıya ait token bulunamadı"
      }, { status: 404 });
    }
    
    // En son oluşturulan token'ı kullan
    const latestToken = tokenData[0];
    console.log(`Using latest token created at: ${latestToken.created_at}`);
    
    // Token yenileme isteği
    const ETSY_CLIENT_ID = process.env.ETSY_CLIENT_ID;
    
    if (!ETSY_CLIENT_ID) {
      console.error("Etsy client ID not configured");
      return NextResponse.json({ 
        error: "CONFIGURATION_ERROR", 
        message: "Etsy API anahtarları eksik" 
      }, { status: 500 });
    }
    
    const response = await fetch("https://api.etsy.com/v3/public/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "x-api-key": ETSY_CLIENT_ID,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: ETSY_CLIENT_ID,
        refresh_token: latestToken.refresh_token,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Token refresh failed: ${response.status} - ${errorText}`);
      
      // Eğer refresh token hatası varsa Supabase'dan tokenı sil
      if (response.status === 400 && errorText.includes('invalid_grant')) {
        // Tokenı sil
        await supabaseAdmin.from('etsy_tokens').delete().eq('user_id', user.id);
        
        return NextResponse.json({ 
          error: "RECONNECT_REQUIRED", 
          message: "Yenileme token'ı geçersiz. Yeniden bağlanma gerekiyor."
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: "REFRESH_FAILED", 
        message: `Token yenileme başarısız: ${response.status} - ${errorText}` 
      }, { status: response.status });
    }
    
    const newTokens = await response.json();
    
    // Yeni token'ı veritabanına kaydet
    const { error: updateError } = await supabaseAdmin
      .from("etsy_tokens")
      .upsert({
        user_id: user.id,
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      });
      
    if (updateError) {
      console.error("Token update error:", updateError);
      return NextResponse.json({ 
        error: "UPDATE_FAILED", 
        message: `Token güncellenemedi: ${updateError.message}` 
      }, { status: 500 });
    }
    
    console.log("Token refreshed successfully");
    
    return NextResponse.json({ 
      success: true, 
      message: "Token başarıyla yenilendi" 
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    
    return NextResponse.json({ 
      error: "INTERNAL_ERROR", 
      message: `Token yenileme hatası: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
} 