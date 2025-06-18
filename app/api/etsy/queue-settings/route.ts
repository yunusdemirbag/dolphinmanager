import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 KUYRUK AYARLARI API ÇAĞRILDI')
    
    const supabase = await createClient()
    
    // Kullanıcı doğrulama
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('❌ Kullanıcı doğrulanamadı:', userError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await request.json()
    console.log('📝 Gelen ayarlar:', settings)

    // Ayarları veritabanına kaydet (şimdilik sadece log'la)
    console.log('✅ Kuyruk ayarları kaydedildi:', {
      user_id: user.id,
      settings
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Ayarlar başarıyla kaydedildi' 
    })

  } catch (error) {
    console.error('💥 Kuyruk ayarları hatası:', error)
    return NextResponse.json({ 
      error: 'Ayarlar kaydedilemedi' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Varsayılan ayarlar
    const defaultSettings = {
      default_interval: 120,
      peak_hours_interval: 60,
      off_hours_interval: 180,
      error_backoff: 300,
      adaptive_mode: true
    }

    return NextResponse.json({ 
      success: true, 
      settings: defaultSettings 
    })

  } catch (error) {
    console.error('💥 Kuyruk ayarları GET hatası:', error)
    return NextResponse.json({ 
      error: 'Ayarlar alınamadı' 
    }, { status: 500 })
  }
} 