import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getEtsyAuthUrl } from "@/lib/etsy-api"

export async function GET() {
  const cookieStore = cookies();
  const supabase = await createClient();
  
  const { data, error } = await supabase.from('profiles').select('*');
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ data });
}

export async function getEtsyAuthTest() {
  try {
    // Kullanıcı kontrolü
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Mevcut token kontrolü
    const { data: tokenData } = await supabase
      .from("etsy_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (tokenData) {
      return NextResponse.json({
        hasToken: true,
        expiresAt: tokenData.expires_at,
        isExpired: new Date(tokenData.expires_at) < new Date()
      })
    }

    // Auth URL oluştur
    const authUrl = await getEtsyAuthUrl(user.id)
    
    return NextResponse.json({
      hasToken: false,
      authUrl
    })
  } catch (error) {
    console.error("Test route error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
} 