import { createClient } from "@/lib/supabase/server"
import { auth } from '@/lib/firebase/admin';
import { db } from '@/lib/firebase/admin';
import { NextRequest, NextResponse } from "next/server"
import { getSellerTaxonomyNodes, getPropertiesByTaxonomyId } from "@/lib/etsy-api"
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Auth kontrolü - hem token hem de session cookie desteği
    let userId = null;
    
    // 1. Bearer token kontrolü
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await auth.verifyIdToken(token);
        userId = decodedToken.uid;
        console.log('✅ Token ile kullanıcı doğrulandı:', userId);
      } catch (error) {
        console.error('❌ Token doğrulama hatası:', error);
      }
    }
    
    // 2. Session cookie kontrolü (token başarısız olursa)
    if (!userId) {
      try {
        // Next.js 15'te cookies() API'si yerine request.headers.get('cookie') kullanıyoruz
        const cookieHeader = request.headers.get('cookie');
        const sessionCookie = cookieHeader?.split(';')
          .find(c => c.trim().startsWith('session='))
          ?.split('=')[1];
        
        if (sessionCookie) {
          const decodedCookie = await auth.verifySessionCookie(sessionCookie);
          userId = decodedCookie.uid;
          console.log('✅ Cookie ile kullanıcı doğrulandı:', userId);
        }
      } catch (error) {
        console.error('❌ Session cookie doğrulama hatası:', error);
      }
    }
    
    // 3. Kullanıcı doğrulanamadıysa mock data döndür
    if (!userId) {
      console.log('⚠️ Kullanıcı doğrulanamadı, mock data döndürülüyor');
      return NextResponse.json({
        success: true,
        nodes: mockTaxonomyNodes(),
        is_mock: true
      });
    }

    const { searchParams } = new URL(request.url)
    const taxonomyId = searchParams.get('taxonomy_id')

    try {
      if (taxonomyId) {
        // Belirli taxonomy ID için properties getir
        try {
          const properties = await getPropertiesByTaxonomyId(parseInt(taxonomyId))
          
          return NextResponse.json({
            success: true,
            properties,
            taxonomy_id: parseInt(taxonomyId)
          })
        } catch (error) {
          console.error("Taxonomy properties API error:", error);
          // Hata durumunda sabit değer döndür
          return NextResponse.json({
            success: true,
            properties: mockTaxonomyProperties(),
            taxonomy_id: parseInt(taxonomyId) || 68887271,
            is_mock: true
          })
        }
      } else {
        // Tüm taxonomy node'larını getir
        try {
          const taxonomyNodes = await getSellerTaxonomyNodes(userId);
          return NextResponse.json({
            success: true,
            nodes: taxonomyNodes
          });
        } catch (error) {
          console.error("Error fetching taxonomy nodes:", error);
          // Mock data döndür
          return NextResponse.json({
            success: true,
            nodes: mockTaxonomyNodes(),
            is_mock: true
          });
        }
      }
    } catch (apiError) {
      console.error("Etsy API error:", apiError)
      // Return mock data for development
      return NextResponse.json({
        success: true,
        nodes: mockTaxonomyNodes(),
        is_mock: true
      })
    }

  } catch (error: any) {
    console.error("Taxonomy API error:", error)
    // Hata durumunda da mock data döndür
    return NextResponse.json({
      success: true,
      nodes: mockTaxonomyNodes(),
      is_mock: true,
      error_details: error.message
    })
  }
}

// Mock taxonomy data for development
function mockTaxonomyNodes() {
  return [
    { id: 100, name: "Art & Collectibles", level: 1, path: ["Art & Collectibles"] },
    { id: 101, name: "Prints", level: 2, path: ["Art & Collectibles", "Prints"] },
    { id: 102, name: "Painting", level: 2, path: ["Art & Collectibles", "Painting"] },
    { id: 103, name: "Canvas Art", level: 3, path: ["Art & Collectibles", "Painting", "Canvas Art"] },
    { id: 104, name: "Wall Art", level: 2, path: ["Art & Collectibles", "Wall Art"] },
    { id: 105, name: "Home & Living", level: 1, path: ["Home & Living"] },
    { id: 106, name: "Home Decor", level: 2, path: ["Home & Living", "Home Decor"] },
    { id: 107, name: "Wall Decor", level: 3, path: ["Home & Living", "Home Decor", "Wall Decor"] },
    { id: 1027, name: "Wall Decor", level: 2, path: ["Home & Living", "Wall Decor"] },
    { id: 2078, name: "Digital Prints", level: 2, path: ["Art & Collectibles", "Digital Prints"] }
  ]
}

// Mock taxonomy properties for development
function mockTaxonomyProperties() {
  return [
    { 
      id: 513, 
      name: "Size", 
      property_values: [
        { value_id: 5001, value: "8\"x12\" - 20x30 cm" },
        { value_id: 5002, value: "14\"x20\" - 35x50cm" },
        { value_id: 5003, value: "16\"x24\" - 40x60cm" },
        { value_id: 5004, value: "20\"x28\" - 50x70cm" },
        { value_id: 5005, value: "24\"x36\" - 60x90cm" },
        { value_id: 5006, value: "28\"x40\" - 70x100cm" },
        { value_id: 5007, value: "32\"x48\" - 80x120cm" },
        { value_id: 5008, value: "36\"x51\" - 90x130cm" }
      ]
    },
    { 
      id: 514, 
      name: "Pattern", 
      property_values: [
        { value_id: 6001, value: "Roll" },
        { value_id: 6002, value: "Standard Canvas" },
        { value_id: 6003, value: "White Frame" },
        { value_id: 6004, value: "Gold Frame" },
        { value_id: 6005, value: "Silver Frame" },
        { value_id: 6006, value: "Black Frame" }
      ]
    }
  ]
} 