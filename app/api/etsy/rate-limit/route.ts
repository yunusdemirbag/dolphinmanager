import { NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

// Simple mechanism to track API usage for displaying to users
// In a real implementation, this would likely be more sophisticated
// and stored in a database with proper tracking of Etsy API headers

export async function GET(request: NextRequest) {
  try {
    // Kullanıcı kimliğini doğrula
    const user = await getUser()
    
    if (!user?.id) {
      return NextResponse.json(
        { error: "Yetkilendirme hatası" },
        { status: 401 }
      )
    }
    
    // Kullanıcının API kullanım bilgilerini veritabanından al
    const { data: rateLimitData } = await supabaseAdmin
      .from("rate_limits")
      .select("*")
      .eq("user_id", user.id)
      .single();
    
    // Varsayılan değerler
    let rateLimit = {
      used: 0,
      limit: 40, // Etsy günlük API çağrı limiti (varsayılan)
      resetAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(), // Gece yarısı sıfırlanır
      percentage: 0
    };
    
    if (rateLimitData) {
      // Veritabanında kayıt varsa onu kullan
      rateLimit = {
        used: rateLimitData.used_count || 0,
        limit: rateLimitData.limit || 40,
        resetAt: rateLimitData.reset_at || rateLimit.resetAt,
        percentage: Math.min(Math.round(((rateLimitData.used_count || 0) / (rateLimitData.limit || 40)) * 100), 100)
      };
    } else {
      // Yeni kayıt oluştur
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      await supabaseAdmin
        .from("rate_limits")
        .insert({
          user_id: user.id,
          used_count: 0,
          limit: 40,
          reset_at: tomorrow.toISOString()
        });
    }
    
    return NextResponse.json(rateLimit);
  } catch (error) {
    console.error("Rate limit API error:", error);
    
    return NextResponse.json(
      { 
        error: "Rate limit bilgisi alınamadı",
        used: 0,
        limit: 40,
        resetAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
        percentage: 0
      },
      { status: 500 }
    );
  }
} 