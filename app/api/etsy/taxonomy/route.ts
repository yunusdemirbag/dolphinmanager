import { NextRequest, NextResponse } from "next/server"
import { getSellerTaxonomyNodes, getPropertiesByTaxonomyId } from "@/lib/etsy-api"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taxonomyId = searchParams.get('taxonomy_id')

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