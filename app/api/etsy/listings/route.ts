import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest, createUnauthorizedResponse } from "@/lib/auth-middleware"
import { db } from "@/lib/firebase-admin"

// Geliştirme ortamında olup olmadığımızı kontrol et
const isDevelopment = process.env.NODE_ENV === 'development';

// Mock ürünler
const mockProducts = [
  {
    listing_id: 1,
    etsy_listing_id: 1,
    title: "Handmade Canvas Art",
    description: "Beautiful handmade canvas art",
    price: { amount: 2500, divisor: 100, currency_code: "USD" },
    quantity: 1,
    state: "active",
    created_timestamp: Date.now(),
    updated_timestamp: Date.now(),
    tags: ["art", "canvas", "handmade"],
    materials: ["Canvas", "Paint"],
    images: [],
    shop_section_id: null
  },
  {
    listing_id: 2,
    etsy_listing_id: 2,
    title: "Digital Print Wall Art",
    description: "Modern digital print for your home",
    price: { amount: 1500, divisor: 100, currency_code: "USD" },
    quantity: 5,
    state: "active",
    created_timestamp: Date.now(),
    updated_timestamp: Date.now(),
    tags: ["digital", "print", "wall art"],
    materials: ["Digital File"],
    images: [],
    shop_section_id: null
  }
];

export async function GET(request: NextRequest) {
  try {
    // Firebase authentication
    const authResult = await authenticateRequest(request)
    
    if (!authResult) {
      return createUnauthorizedResponse()
    }
    
    const userId = authResult.userId
    console.log('📦 Ürünler API çağrısı - kullanıcı:', userId)
    
    // URL parametrelerini al
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    
    // Geliştirme ortamında mock veri döndür
    if (isDevelopment) {
      console.log('⚠️ Geliştirme ortamında mock ürünler döndürülüyor');
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
    }
    
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
    
  } catch (error) {
    console.error('💥 Listings API genel hatası:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}