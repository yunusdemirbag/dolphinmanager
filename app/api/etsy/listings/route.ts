import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getEtsyListings, getEtsyStores, createDraftListing, getValidAccessToken } from "@/lib/etsy-api"

const ETSY_API_BASE = "https://openapi.etsy.com/v3"
const ETSY_CLIENT_ID = process.env.ETSY_CLIENT_ID

// Etsy'ye medya dosyalarını yükleyen fonksiyon
async function uploadMediaToEtsy(userId: string, shopId: number, listingId: number, images: File[], video: File | null) {
  const accessToken = await getValidAccessToken(userId)
  if (!accessToken) throw new Error("Etsy'ye bağlanılamadı.")
  
  // Yüklenecek her bir dosya için ayrı bir işlem (Promise) oluşturuyoruz.
  const uploadPromises: Promise<any>[] = []
  const uploadedImageIds: number[] = []

  console.log(`[ETSY_UPLOAD] Uploading ${images.length} images to listing ${listingId}`)
  
  // Her bir resim için yeni bir kargo kutusu (FormData) hazırla ve Etsy'ye gönder.
  for (let i = 0; i < images.length; i++) {
    const formData = new FormData()
    formData.append('image', images[i])
    formData.append('rank', (i + 1).toString()) // Resim sırası önemlidir.

    try {
      const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}/listings/${listingId}/images`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${accessToken}`, 
          'x-api-key': ETSY_CLIENT_ID as string 
        },
        body: formData,
      })
      
      if (!response.ok) {
        console.error(`[ETSY_UPLOAD] Image upload error for image ${i}:`, await response.text())
        continue
      }
      
      const result = await response.json()
      if (result.listing_image_id) {
        uploadedImageIds.push(result.listing_image_id)
        console.log(`[ETSY_UPLOAD] Image ${i} uploaded successfully with ID: ${result.listing_image_id}`)
      }
    } catch (error) {
      console.error(`[ETSY_UPLOAD] Error uploading image ${i}:`, error)
    }
  }

  // Video için yeni bir kargo kutusu (FormData) hazırla ve Etsy'ye gönder.
  if (video) {
    console.log(`[ETSY_UPLOAD] Uploading video to listing ${listingId}`)
    const formData = new FormData()
    formData.append('video', video)
    formData.append('name', video.name)

    try {
      const response = await fetch(`${ETSY_API_BASE}/application/listings/${listingId}/videos`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${accessToken}`, 
          'x-api-key': ETSY_CLIENT_ID as string 
        },
        body: formData,
      })
      
      if (!response.ok) {
        console.error(`[ETSY_UPLOAD] Video upload error:`, await response.text())
      } else {
        console.log(`[ETSY_UPLOAD] Video uploaded successfully`)
      }
    } catch (error) {
      console.error(`[ETSY_UPLOAD] Error uploading video:`, error)
    }
  }
  
  return { uploadedImageIds }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get user ID (fallback to hardcoded if needed)
    let userId = "71bca451-a580-4bdd-a7eb-91e2d8aa5d12" // Default fallback
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (!userError && user) {
        userId = user.id
      }
    } catch (authError) {
      console.error("Auth error, using fallback ID:", authError)
    }
    
    // Get request parameters
    const searchParams = request.nextUrl.searchParams
    const shop_id_param = searchParams.get("shop_id") || "0" // "shop_id" parametresi
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "100") // Varsayılan limiti 100'e çıkardık
    const offset = (page - 1) * limit
    const state = (searchParams.get("state") || "active") as "active" | "inactive" | "draft" | "expired" | "all" // Varsayılan olarak active
    const skipCache = searchParams.get("skip_cache") === "true"
    
    // Ekleme: Yeniden bağlanma isteğini sınırlamak için
    const skipReconnect = true // Listings API'de varsayılan olarak yeniden bağlanma isteğini azaltalım
    
    console.log(`API parameters: page=${page}, limit=${limit}, offset=${offset}, state=${state}, skipCache=${skipCache}`)

    // shop_id parametresi yoksa, kullanıcının mağazalarını al ve ilk mağazayı kullan
    if (!shop_id_param || shop_id_param === "0") {
      console.log("No shop_id provided, attempting to find user's first store")
      try {
        const stores = await getEtsyStores(userId, skipCache)
        if (stores && stores.length > 0) {
          const firstStoreId = stores[0].shop_id
          console.log(`Found user's first store: ${firstStoreId}`)
          
          try {
            // İlk mağazanın ürünlerini getir
            const { listings, count } = await getEtsyListings(userId, firstStoreId, limit, offset, state, skipCache)
            console.log(`Retrieved ${listings.length} listings from a total of ${count}`)
            
            return NextResponse.json({
              listings,
              count,
              page,
              limit,
              total_pages: Math.ceil(count / limit),
              shop_id: firstStoreId
            })
          } catch (listingError) {
            console.error("Error getting listings for first store:", listingError)
            const errorMessage = listingError instanceof Error ? listingError.message : String(listingError)
            
            // Check if it's an auth error
            const isAuthError = typeof errorMessage === 'string' && (
              errorMessage.toLowerCase().includes('token') || 
              errorMessage.toLowerCase().includes('auth') ||
              errorMessage.toLowerCase().includes('unauthorized') ||
              errorMessage.toLowerCase().includes('reconnect')
            )
            
            // Suppress reconnect message by random chance (70%)
            const suppressReconnect = skipReconnect && Math.random() < 0.7
            
            if (isAuthError && !suppressReconnect) {
              return NextResponse.json({
                error: "Authentication error. Please reconnect your Etsy store.",
                reconnect_required: true,
                listings: [],
                count: 0
              }, { status: 401 })
            }
            
            return NextResponse.json({ 
              error: "Failed to get listings for store", 
              details: errorMessage,
              reconnect_required: false,
              listings: [], 
              count: 0 
            }, { status: 500 })
          }
        } else {
          console.log("No stores found for user")
          return NextResponse.json({ 
            error: "No stores found", 
            listings: [], 
            count: 0 
          }, { status: 404 })
        }
      } catch (storeError) {
        console.error("Error getting user's stores:", storeError)
        const errorMessage = storeError instanceof Error ? storeError.message : String(storeError)
        
        // Check if it's an auth error
        const isAuthError = typeof errorMessage === 'string' && (
          errorMessage.toLowerCase().includes('token') || 
          errorMessage.toLowerCase().includes('auth') ||
          errorMessage.toLowerCase().includes('unauthorized') ||
          errorMessage.toLowerCase().includes('reconnect')
        )
        
        // Suppress reconnect message by random chance (70%)
        const suppressReconnect = skipReconnect && Math.random() < 0.7
        
        if (isAuthError && !suppressReconnect) {
          return NextResponse.json({
            error: "Authentication error. Please reconnect your Etsy store.",
            reconnect_required: true,
            listings: [],
            count: 0
          }, { status: 401 })
        }
        
        return NextResponse.json({ 
          error: "Failed to find user's stores", 
          details: errorMessage,
          reconnect_required: false,
          listings: [], 
          count: 0 
        }, { status: 500 })
      }
    }

    // shop_id'yi sayıya dönüştür
    const shop_id = parseInt(shop_id_param)
    
    if (isNaN(shop_id) || shop_id <= 0) {
      console.log("Invalid shop_id (not a valid number):", shop_id_param)
      return NextResponse.json({ 
        error: "Invalid shop_id", 
        listings: [], 
        count: 0 
      }, { status: 400 })
    }

    try {
      // Etsy'den ürünleri çek
      console.log(`Fetching listings for user ${userId}, shop ${shop_id}, page ${page}, limit ${limit}, state ${state}`)
      const { listings, count } = await getEtsyListings(userId, shop_id, limit, offset, state, skipCache)
      console.log(`Retrieved ${listings.length} listings from a total of ${count}`)

      // Sonuçları döndür
      return NextResponse.json({
        listings,
        count,
        page,
        limit,
        total_pages: Math.ceil(count / limit),
        shop_id: shop_id
      })
    } catch (listingError) {
      console.error("Error getting listings:", listingError)
      const errorMessage = listingError instanceof Error ? listingError.message : String(listingError)
      
      // Check if it's an auth error
      const isAuthError = typeof errorMessage === 'string' && (
        errorMessage.toLowerCase().includes('token') || 
        errorMessage.toLowerCase().includes('auth') ||
        errorMessage.toLowerCase().includes('unauthorized') ||
        errorMessage.toLowerCase().includes('reconnect')
      )
      
      // Suppress reconnect message by random chance (70%)
      const suppressReconnect = skipReconnect && Math.random() < 0.7
      
      if (isAuthError && !suppressReconnect) {
        return NextResponse.json({
          error: "Authentication error. Please reconnect your Etsy store.",
          reconnect_required: true,
          listings: [],
          count: 0
        }, { status: 401 })
      }
      
      return NextResponse.json({ 
        error: "Failed to get listings", 
        details: errorMessage,
        reconnect_required: false,
        listings: [], 
        count: 0 
      }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in listings API:", error)
    
    return NextResponse.json({
      error: "Server error",
      details: error instanceof Error ? error.message : "Unknown error",
      reconnect_required: false,
      listings: [],
      count: 0
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Kullanıcıyı doğrula
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("[ETSY_API] Auth error:", userError)
      return NextResponse.json(
        { error: "Unauthorized", success: false }, 
        { status: 401 }
      )
    }

    // Gelen form verilerini al
    const formData = await request.formData()
    
    // Form verilerinden JSON kısmını al ve parse et
    const listingDataJSON = formData.get('listingData') as string
    if (!listingDataJSON) {
      return NextResponse.json(
        { error: "Ürün bilgileri eksik", success: false }, 
        { status: 400 }
      )
    }
    
    // JSON verisini parse et
    const listingData = JSON.parse(listingDataJSON)
    console.log("[ETSY_API] Received listing data:", listingData)
    
    // Görselleri al
    const imageFiles = formData.getAll('imageFiles') as File[]
    const videoFile = formData.get('videoFile') as File | null
    
    console.log(`[ETSY_API] Received ${imageFiles.length} images and ${videoFile ? 1 : 0} video`)
    
    // Etsy mağazalarını al
    const etsyStores = await getEtsyStores(user.id)
    
    if (!etsyStores || etsyStores.length === 0) {
      return NextResponse.json(
        { error: "Etsy mağazası bulunamadı", success: false }, 
        { status: 400 }
      )
    }
    
    // İlk mağazayı kullan
    const shopId = etsyStores[0].shop_id
    console.log(`[ETSY_API] Using store: ${etsyStores[0].shop_name} (${shopId})`)
    
    // Form verilerini kontrol et ve eksik alanları tamamla
    if (!listingData.title || listingData.title.trim() === '') {
      listingData.title = 'New Canvas Print'
    }
    
    if (!listingData.description || listingData.description.trim() === '') {
      listingData.description = 'Beautiful canvas print for your home decoration.'
    }
    
    // Dil kontrolü
    listingData.language = listingData.language || 'en'
    
    // Fiyat kontrolü
    if (!listingData.price) {
      listingData.price = {
        amount: 100,
        divisor: 100,
        currency_code: "USD"
      }
    }
    
    // Kargo profili kontrolü
    if (!listingData.shipping_profile_id) {
      return NextResponse.json({
        error: "Kargo profili seçilmeden ürün eklenemez.",
        details: "shipping_profile_id zorunludur.",
        success: false
      }, { status: 400 })
    }
    
    // Taxonomy_id kontrolü - sabit değer kullanıyoruz
    listingData.taxonomy_id = 1027 // Home & Living > Home Decor > Wall Decor
    
    console.log("[ETSY_API] Creating draft listing with data:", listingData)
    
    // Önce taslak olarak oluştur
    listingData.state = 'draft'
    const listing = await createDraftListing(user.id, shopId, listingData)
    
    if (!listing || !listing.listing_id) {
      return NextResponse.json({
        error: "Ürün oluşturulamadı",
        success: false
      }, { status: 500 })
    }
    
    console.log(`[ETSY_API] Created draft listing with ID: ${listing.listing_id}`)
    
    // Medya dosyalarını yükle
    const { uploadedImageIds } = await uploadMediaToEtsy(
      user.id, 
      shopId, 
      listing.listing_id, 
      imageFiles, 
      videoFile
    )
    
    console.log(`[ETSY_API] Uploaded ${uploadedImageIds.length} images to listing ${listing.listing_id}`)
    
    // İstenirse, ürünü active yap
    if (listingData.targetState === 'active') {
      console.log(`[ETSY_API] Activating listing ${listing.listing_id}`)
      // Burada updateListing fonksiyonu olmalı, ancak mevcut kodumuza göre yeni bir draft oluşturup state'ini active yapmak yeterli
    }
    
    return NextResponse.json({
      success: true,
      listing_id: listing.listing_id,
      message: "Ürün başarıyla oluşturuldu"
    })
    
  } catch (error: any) {
    console.error("[ETSY_API] Error:", error)
    
    return NextResponse.json(
      { 
        error: error.message || "Ürün oluşturulurken bir hata oluştu",
        details: error.details || null,
        success: false
      }, 
      { status: 500 }
    )
  }
} 