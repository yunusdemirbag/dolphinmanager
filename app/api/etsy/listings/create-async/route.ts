import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { queueManager } from "@/src/lib/queue-manager"

export async function POST(request: NextRequest) {
  try {
    // 1. Kullanıcıyı doğrula
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("Create listing API auth error:", userError)
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      )
    }

    // 2. Form verilerini al
    const formData = await request.formData()
    console.log('[API] FormData keys:', Array.from(formData.keys()))
    
    const listingDataJSON = formData.get('listingData') as string
    if (!listingDataJSON) {
      console.error('[API] Missing listingData in FormData')
      return NextResponse.json(
        { error: "Listeleme verisi eksik" },
        { status: 400 }
      )
    }
    
    const imageFiles = formData.getAll('imageFiles') as File[]
    if (imageFiles.length === 0) {
      console.error('[API] No image files received')
      return NextResponse.json(
        { error: "En az bir resim dosyası gerekli" },
        { status: 400 }
      )
    }
    
    const videoFile = formData.get('videoFile') as File | null
    
    const listingData = JSON.parse(listingDataJSON)
    
    // 3. Queue'ya job ekle
    const jobId = await queueManager.addJob({
      userId: user.id,
      type: 'CREATE_LISTING',
      data: {
        listingData: { ...listingData, userId: user.id },
        files: { 
          imageFiles,
          videoFile
        }
      }
    });
    
    // 4. Queue'yu işlemeye başla (arka planda)
    setTimeout(() => {
      queueManager.processQueue().catch(err => {
        console.error('Queue processing error:', err);
      });
    }, 100);
    
    // 5. Hemen yanıt döndür
    return NextResponse.json({
      success: true,
      jobId,
      message: 'Ürün oluşturma işlemi arka planda başlatıldı'
    });
    
  } catch (error: any) {
    console.error('[API] Error creating async listing:', error);
    return NextResponse.json({
      error: error.message || 'Ürün oluşturulurken bir hata oluştu'
    }, { status: 500 });
  }
} 