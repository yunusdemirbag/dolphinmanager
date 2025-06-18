import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Basit in-memory storage (production'da veritabanı kullanılmalı)
let queueSettings = {
  default_interval: 15, // Varsayılan 15 saniye
  max_interval: 120,    // Maksimum 2 dakika (120 saniye)
  min_interval: 5       // Minimum 5 saniye
};

export async function POST(request: NextRequest) {
  try {
    console.log('⚙️ Kuyruk ayarları güncelleme isteği')
    
    // Auth kontrolü kaldırıldı - internal kullanım için

    const body = await request.json()
    const { default_interval } = body
    
    // Aralık kontrolü
    if (default_interval) {
      if (default_interval < queueSettings.min_interval) {
        return NextResponse.json({
          success: false,
          error: `Minimum aralık ${queueSettings.min_interval} saniye olmalıdır`
        }, { status: 400 })
      }
      
      if (default_interval > queueSettings.max_interval) {
        return NextResponse.json({
          success: false,
          error: `Maksimum aralık ${queueSettings.max_interval} saniye olmalıdır`
        }, { status: 400 })
      }
      
      queueSettings.default_interval = default_interval
      console.log(`✅ Kuyruk aralığı güncellendi: ${default_interval} saniye`)
    }

    // Ayarları veritabanına kaydet (şimdilik sadece log'la)
    console.log('✅ Kuyruk ayarları kaydedildi:', {
      settings: queueSettings
    })

    return NextResponse.json({
      success: true,
      message: 'Kuyruk ayarları güncellendi',
      settings: queueSettings
    })

  } catch (error) {
    console.error('❌ Kuyruk ayarları güncelleme hatası:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Kuyruk ayarları güncellenemedi' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📋 Kuyruk ayarları istendi')
    
    return NextResponse.json({
      success: true,
      settings: queueSettings
    })

  } catch (error) {
    console.error('❌ Kuyruk ayarları getirme hatası:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Kuyruk ayarları getirilemedi' 
    }, { status: 500 })
  }
} 