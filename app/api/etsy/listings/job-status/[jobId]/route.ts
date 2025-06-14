import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  return NextResponse.json(
    { 
      error: "Bu API uç noktası artık kullanılmıyor. Ürün yükleme işlemleri doğrudan gerçekleştirilmektedir.", 
      deprecated: true 
    },
    { status: 410 }
  )
} 