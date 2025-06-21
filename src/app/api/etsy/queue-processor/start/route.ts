import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 KUYRUK İŞLEMCİSİ BAŞLATMA İSTEĞİ')
    
    // Şimdilik mock response
    console.log('✅ Kuyruk işlemcisi başlatıldı (mock)')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Kuyruk işlemcisi başlatıldı' 
    })

  } catch (error) {
    console.error('💥 Kuyruk başlatma hatası:', error)
    return NextResponse.json({ 
      error: 'Kuyruk başlatılamadı' 
    }, { status: 500 })
  }
} 