import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('⏸️ KUYRUK İŞLEMCİSİ DURDURMA İSTEĞİ')
    
    // Şimdilik mock response
    console.log('✅ Kuyruk işlemcisi durduruldu (mock)')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Kuyruk işlemcisi durduruldu' 
    })

  } catch (error) {
    console.error('💥 Kuyruk durdurma hatası:', error)
    return NextResponse.json({ 
      error: 'Kuyruk durdurulamadı' 
    }, { status: 500 })
  }
} 