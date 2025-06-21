import { NextRequest, NextResponse } from 'next/server'

// Proxy endpoint that fetches external images and serves them without CORS issues
export async function GET(request: NextRequest) {
  // Get the URL from the query parameter
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL parametresi gerekli' }, { status: 400 })
  }

  try {
    // Make sure we only proxy Etsy images for security
    if (!url.includes('i.etsystatic.com') && !url.includes('etsystatic.com')) {
      return NextResponse.json(
        { error: 'Sadece Etsy görselleri destekleniyor' },
        { status: 403 }
      )
    }

    // Fetch the image
    const response = await fetch(url)
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Görsel yüklenemedi: ${response.status}` },
        { status: response.status }
      )
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer()
    
    // Set appropriate headers
    const headers = new Headers()
    
    // Copy content type
    const contentType = response.headers.get('content-type')
    if (contentType) {
      headers.set('content-type', contentType)
    }
    
    // Set caching headers
    headers.set('cache-control', 'public, max-age=86400') // 24 hours
    
    // Return the image with headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Görsel proxy hatası' },
      { status: 500 }
    )
  }
} 