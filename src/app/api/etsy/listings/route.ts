import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest, createUnauthorizedResponse } from "@/lib/auth"
import { db } from "@/lib/firebase/admin"

// Geliştirme ortamında olup olmadığımızı kontrol et
const isDevelopment = process.env.NODE_ENV === 'development';

// Mock ürünler - daha zengin veri
const mockProducts = [
  {
    listing_id: 1,
    etsy_listing_id: 1001,
    title: "Handmade Canvas Art - Abstract Modern Painting",
    description: "Beautiful handmade canvas art with abstract design, perfect for modern home decor. Each piece is unique and handcrafted with care.",
    price: { amount: 2500, divisor: 100, currency_code: "USD" },
    quantity: 4,
    state: "active",
    created_timestamp: Date.now() - 1000000,
    updated_timestamp: Date.now(),
    tags: ["art", "canvas", "handmade", "abstract", "modern", "painting", "wall art", "home decor", "unique", "gift", "living room", "bedroom", "office"],
    materials: ["Canvas", "Acrylic Paint", "Wood Frame"],
    taxonomy_id: 1027, // Wall Decor
    images: [
      {
        listing_image_id: 1001,
        url_75x75: "https://via.placeholder.com/75",
        url_170x135: "https://via.placeholder.com/170x135",
        url_570xN: "https://via.placeholder.com/570",
        url_fullxfull: "https://via.placeholder.com/1000"
      },
      {
        listing_image_id: 1002,
        url_75x75: "https://via.placeholder.com/75",
        url_170x135: "https://via.placeholder.com/170x135",
        url_570xN: "https://via.placeholder.com/570",
        url_fullxfull: "https://via.placeholder.com/1000"
      },
      {
        listing_image_id: 1003,
        url_75x75: "https://via.placeholder.com/75",
        url_170x135: "https://via.placeholder.com/170x135",
        url_570xN: "https://via.placeholder.com/570",
        url_fullxfull: "https://via.placeholder.com/1000"
      }
    ],
    shop_section_id: 1,
    processing_min: 1,
    processing_max: 3,
    who_made: "i_did",
    is_customizable: false,
    is_digital: false,
    shipping_profile_id: 123,
    processing_profile_id: 456
  },
  {
    listing_id: 2,
    etsy_listing_id: 1002,
    title: "Digital Print Wall Art - Minimalist Line Art",
    description: "Modern digital print for your home featuring minimalist line art design. Instant download, print at home or at your local print shop.",
    price: { amount: 1500, divisor: 100, currency_code: "USD" },
    quantity: 999,
    state: "active",
    created_timestamp: Date.now() - 2000000,
    updated_timestamp: Date.now() - 100000,
    tags: ["digital", "print", "wall art", "minimalist", "line art", "instant download", "printable", "home decor", "modern", "black and white", "simple", "geometric", "face"],
    materials: ["Digital File", "JPG", "PDF"],
    taxonomy_id: 2078, // Digital Prints
    images: [
      {
        listing_image_id: 2001,
        url_75x75: "https://via.placeholder.com/75",
        url_170x135: "https://via.placeholder.com/170x135",
        url_570xN: "https://via.placeholder.com/570",
        url_fullxfull: "https://via.placeholder.com/1000"
      },
      {
        listing_image_id: 2002,
        url_75x75: "https://via.placeholder.com/75",
        url_170x135: "https://via.placeholder.com/170x135",
        url_570xN: "https://via.placeholder.com/570",
        url_fullxfull: "https://via.placeholder.com/1000"
      }
    ],
    shop_section_id: 2,
    processing_min: 0,
    processing_max: 0,
    who_made: "i_did",
    is_customizable: false,
    is_digital: true,
    shipping_profile_id: 124,
    processing_profile_id: 457
  },
  {
    listing_id: 3,
    etsy_listing_id: 1003,
    title: "Custom Portrait Canvas - Personalized Family Painting",
    description: "Personalized family portrait on premium canvas. Send your photo and we'll create a beautiful custom painting. Perfect gift for anniversaries, birthdays, or any special occasion.",
    price: { amount: 7500, divisor: 100, currency_code: "USD" },
    quantity: 4,
    state: "active",
    created_timestamp: Date.now() - 500000,
    updated_timestamp: Date.now() - 50000,
    tags: ["custom", "portrait", "canvas", "personalized", "family", "painting", "gift", "anniversary", "birthday", "wedding", "memorial", "keepsake", "wall art"],
    materials: ["Canvas", "Acrylic Paint", "Wood Frame"],
    taxonomy_id: 1027, // Wall Decor
    images: [
      {
        listing_image_id: 3001,
        url_75x75: "https://via.placeholder.com/75",
        url_170x135: "https://via.placeholder.com/170x135",
        url_570xN: "https://via.placeholder.com/570",
        url_fullxfull: "https://via.placeholder.com/1000"
      },
      {
        listing_image_id: 3002,
        url_75x75: "https://via.placeholder.com/75",
        url_170x135: "https://via.placeholder.com/170x135",
        url_570xN: "https://via.placeholder.com/570",
        url_fullxfull: "https://via.placeholder.com/1000"
      }
    ],
    shop_section_id: 1,
    processing_min: 3,
    processing_max: 7,
    who_made: "i_did",
    is_customizable: true,
    is_digital: false,
    shipping_profile_id: 123,
    processing_profile_id: 456
  }
];

export async function GET(request: NextRequest) {
  try {
    // Firebase authentication
    const authResult = await authenticateRequest(request)
    
    if (!authResult) {
      return createUnauthorizedResponse()
    }
    
    const userId = authResult.uid
    console.log('📦 Ürünler API çağrısı - kullanıcı:', userId)
    
    // URL parametrelerini al
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    
    // Her zaman mock veri döndür (geliştirme aşamasında)
    console.log('⚠️ Mock ürünler döndürülüyor');
    return NextResponse.json({
      success: true,
      results: mockProducts,
      count: mockProducts.length,
      totalCount: mockProducts.length,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(mockProducts.length / limit),
        per_page: limit,
        total_count: mockProducts.length
      },
      is_mock: true
    });
    
    /* Gerçek Firebase ve Etsy API çağrısı kodunu şimdilik yorum satırına alıyoruz
    // Firebase'den kullanıcının Etsy token'ını al
    const tokenDoc = await db.collection('etsy_tokens').doc(userId).get()
    
    if (!tokenDoc.exists) {
      console.log('❌ Etsy token bulunamadı')
      return NextResponse.json(
        { error: 'Etsy mağazası bağlanmamış', code: 'NO_ETSY_TOKEN' },
        { status: 404 }
      )
    }
    
    const tokenData = tokenDoc.data()
    
    // Token süresi kontrol et
    if (new Date() > tokenData.expires_at.toDate()) {
      console.log('⏰ Token süresi dolmuş')
      return NextResponse.json(
        { error: 'Etsy token süresi dolmuş', code: 'TOKEN_EXPIRED' },
        { status: 401 }
      )
    }
    
    // Etsy API'sinden listing'leri çek
    console.log('🔄 Etsy API\'sinden ürünler alınıyor...')
    
    const etsyResponse = await fetch(`https://openapi.etsy.com/v3/application/shops?limit=${limit}&offset=${(page - 1) * limit}`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'x-api-key': process.env.ETSY_CLIENT_ID!
      }
    })
    
    if (!etsyResponse.ok) {
      const errorText = await etsyResponse.text()
      console.error('❌ Etsy API hatası:', errorText)
      
      if (etsyResponse.status === 401) {
        return NextResponse.json(
          { error: 'Etsy yetkilendirme hatası', code: 'ETSY_AUTH_ERROR' },
          { status: 401 }
        )
      }
      
      return NextResponse.json(
        { error: 'Etsy API hatası', details: errorText },
        { status: 500 }
      )
    }
    
    const etsyData = await etsyResponse.json()
    console.log(`✅ ${etsyData.count || 0} ürün alındı`)
    
    return NextResponse.json({
      success: true,
      results: etsyData.results || [],
      count: etsyData.count || 0,
      totalCount: etsyData.count || 0,
      pagination: {
        current_page: page,
        total_pages: Math.ceil((etsyData.count || 0) / limit),
        per_page: limit,
        total_count: etsyData.count || 0
      }
    })
    */
    
  } catch (error) {
    console.error('💥 Listings API genel hatası:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}