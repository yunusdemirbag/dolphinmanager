import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { 
  createDraftListing, 
  getEtsyStores, 
  uploadFilesToEtsy, 
  activateEtsyListing, 
  addInventoryWithVariations, 
  getValidAccessToken 
} from "@/lib/etsy-api"
import { getConnection } from "@/lib/connection"

export async function POST(request: NextRequest) {
  console.log("🚀 [ETSYapi] Ürün yükleme işlemi başladı...")
  
  const startTime = Date.now()
  let productTitle = "" // Ürün başlığını saklamak için değişken
  
  try {
    // Kullanıcı bilgisini al
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 })
    }
    
    // Bağlantı bilgilerini tek seferde al
    const connection = await getConnection(user.id)
    const supabaseClient = connection.supabaseClient
    const token = connection.token
    const stores = connection.stores
    
    // Daha detaylı hata mesajları
    if (!token) {
      console.error("[API] Etsy token bulunamadı:", { userId: user.id });
      return NextResponse.json({ 
        error: "Etsy bağlantısı bulunamadı. Lütfen Etsy hesabınızı bağlayın.",
        code: "NO_ETSY_TOKEN" 
      }, { status: 401 })
    }
    
    if (!token.access_token) {
      console.error("[API] Etsy token içinde access_token yok:", { token });
      return NextResponse.json({ 
        error: "Etsy token geçersiz. Lütfen Etsy hesabınızı yeniden bağlayın.",
        code: "INVALID_ETSY_TOKEN" 
      }, { status: 401 })
    }
    
    if (!stores || stores.length === 0) {
      console.error("[API] Etsy mağazası bulunamadı:", { userId: user.id, token });
      return NextResponse.json({ 
        error: "Etsy mağazası bulunamadı. Lütfen Etsy hesabınızı kontrol edin.",
        code: "NO_ETSY_STORE" 
      }, { status: 401 })
    }
    
    // Dükkân bilgisini al
    const shop = stores[0]
    console.log("[API] Using shop ID:", shop.shop_id)
    
    // 4. Form verilerini al
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
    console.log('[API] Received image files:', imageFiles.map(f => ({
      name: f.name,
      size: f.size,
      type: f.type
    })))
    
    if (imageFiles.length === 0) {
      console.error('[API] No image files received')
      return NextResponse.json(
        { error: "En az bir resim dosyası gerekli" },
        { status: 400 }
      )
    }
    
    const videoFile = formData.get('videoFile') as File | null
    if (videoFile) {
      console.log('[API] Received video file:', {
        name: videoFile.name,
        size: videoFile.size,
        type: videoFile.type
      })
    }
    
    const listingData = JSON.parse(listingDataJSON)
    productTitle = listingData.title
    console.log(`📝 [ETSYapi] Ürün hazırlanıyor: "${productTitle}"`)
    console.log('[API] Parsed listing data:', {
      title: listingData.title,
      price: listingData.price,
      hasVariations: listingData.variations?.length > 0
    })

    // 5. Draft listing oluştur
    console.log('📋 [ETSYapi] Taslak ürün oluşturuluyor...')
    const draftListing = await createDraftListing(token.access_token, shop.shop_id, listingData)
    
    if (!draftListing.listing_id) {
      throw new Error('Draft listing oluşturulamadı')
    }

    // 6. Medya dosyalarını yükle
    console.log(`🖼️ [ETSYapi] ${imageFiles.length} adet medya dosyası yükleniyor...`)
    await uploadFilesToEtsy(token.access_token, shop.shop_id, draftListing.listing_id, imageFiles, videoFile)

    // 7. Varyasyonlar varsa ekle
    if (listingData.variations?.length > 0) {
      console.log('🔄 [ETSYapi] Varyasyonlar ekleniyor...')
      await addInventoryWithVariations(token.access_token, draftListing.listing_id, listingData.variations)
    }

    // 8. Eğer active olarak işaretlendiyse, listing'i aktifleştir
    if (listingData.state === 'active') {
      console.log('✅ [ETSYapi] Ürün aktifleştiriliyor...')
      await activateEtsyListing(token.access_token, shop.shop_id, draftListing.listing_id)
    }

    // İşlem süresini hesapla
    const endTime = Date.now()
    const duration = (endTime - startTime) / 1000 // saniye cinsinden
    
    console.log(`✨ [ETSYapi] Ürün yükleme işlemi tamamlandı! "${productTitle}" - Süre: ${duration.toFixed(2)} saniye`)
    
    return NextResponse.json({ 
      success: true, 
      listingId: draftListing.listing_id,
      message: 'Ürün başarıyla oluşturuldu'
    })
  } catch (error: any) {
    // İşlem süresini hesapla (hata durumunda da)
    const endTime = Date.now()
    const duration = (endTime - startTime) / 1000 // saniye cinsinden
    
    console.error(`❌ [ETSYapi] Ürün yükleme HATASI (${duration.toFixed(2)} saniye): ${error.message}`)
    
    // Özel hata mesajları
    if (error.message === 'RECONNECT_REQUIRED') {
      return NextResponse.json({ error: 'Etsy bağlantısı gerekli' }, { status: 401 })
    }
    
    return NextResponse.json({ 
      error: error.message || 'Ürün oluşturulurken bir hata oluştu' 
    }, { status: 500 })
  }
} 