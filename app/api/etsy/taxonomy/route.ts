import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSellerTaxonomyNodes, getPropertiesByTaxonomyId } from "@/lib/etsy-api"

export async function GET(request: NextRequest) {
  try {
    // Auth kontrolü ekleyelim
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.log("Taxonomy API auth error:", userError, "No user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const taxonomyId = searchParams.get('taxonomy_id')

    try {
      if (taxonomyId) {
        // Belirli taxonomy ID için properties getir
        const properties = await getPropertiesByTaxonomyId(parseInt(taxonomyId))
        
        return NextResponse.json({
          success: true,
          properties,
          taxonomy_id: parseInt(taxonomyId)
        })
      } else {
        // Tüm taxonomy node'larını getir
        const taxonomyNodes = await getSellerTaxonomyNodes()
        
        return NextResponse.json({
          success: true,
          taxonomy_nodes: taxonomyNodes
        })
      }
    } catch (apiError) {
      console.error("Etsy API error:", apiError)
      // Return mock data for development
      return NextResponse.json({
        success: true,
        taxonomy_nodes: mockTaxonomyNodes()
      })
    }

  } catch (error: any) {
    console.error("Taxonomy API error:", error)
    return NextResponse.json(
      { 
        error: "Failed to fetch taxonomy data", 
        details: error.message,
        success: false
      },
      { status: 500 }
    )
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
  ]
} 