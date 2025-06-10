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

export async function POST(request: NextRequest) {
  try {
    console.log('[API] Starting Etsy listing creation process');
    
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

    // 2. Access token al
    const accessToken = await getValidAccessToken(user.id)
    if (!accessToken) {
      console.error('[API] No valid access token found')
      return NextResponse.json({ error: 'Etsy bağlantısı gerekli' }, { status: 401 })
    }

    // 3. Kullanıcının Etsy mağazasını al
    const stores = await getEtsyStores(user.id, true) // true = önbelleği atla
    if (!stores || stores.length === 0) {
      console.error('[API] No Etsy stores found for user')
      return NextResponse.json(
        { error: "Kullanıcıya ait Etsy mağazası bulunamadı" },
        { status: 400 }
      )
    }

    const shopId = stores[0].shop_id
    console.log(`[API] Using shop ID: ${shopId}`)

    if (!shopId || shopId <= 0) {
      console.error('[API] Invalid shop ID:', shopId)
      return NextResponse.json(
        { error: "Geçersiz mağaza ID'si" },
        { status: 400 }
      )
    }
    
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
    console.log('[API] Parsed listing data:', {
      title: listingData.title,
      price: listingData.price,
      hasVariations: listingData.variations?.length > 0
    })

    // 5. Draft listing oluştur
    console.log('[API] Creating draft listing...')
    const draftListing = await createDraftListing(accessToken, shopId, listingData)
    
    if (!draftListing.listing_id) {
      throw new Error('Draft listing oluşturulamadı')
    }

    // 6. Medya dosyalarını yükle
    console.log('[API] Uploading media files...')
    await uploadFilesToEtsy(accessToken, shopId, draftListing.listing_id, imageFiles, videoFile)

    // 7. Varyasyonlar varsa ekle
    if (listingData.variations?.length > 0) {
      console.log('[API] Adding variations...')
      await addInventoryWithVariations(accessToken, draftListing.listing_id, listingData.variations)
    }

    // 8. Eğer active olarak işaretlendiyse, listing'i aktifleştir
    if (listingData.state === 'active') {
      console.log('[API] Activating listing...')
      await activateEtsyListing(accessToken, shopId, draftListing.listing_id)
    }

    console.log('[API] Listing creation completed successfully')
    return NextResponse.json({ 
      success: true, 
      listingId: draftListing.listing_id,
      message: 'Ürün başarıyla oluşturuldu'
    })
  } catch (error: any) {
    console.error('[API] Error creating listing:', error)
    
    // Özel hata mesajları
    if (error.message === 'RECONNECT_REQUIRED') {
      return NextResponse.json({ error: 'Etsy bağlantısı gerekli' }, { status: 401 })
    }
    
    return NextResponse.json({ 
      error: error.message || 'Ürün oluşturulurken bir hata oluştu' 
    }, { status: 500 })
  }
} 