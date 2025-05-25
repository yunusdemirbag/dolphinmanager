import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Döviz.com'dan USD/TRY kurunu çek
    const response = await fetch('https://www.doviz.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch exchange rate')
    }

    const html = await response.text()
    
    // Daha gelişmiş regex pattern'ler
    const patterns = [
      // DOLAR 38,9344 formatı
      /DOLAR[^0-9]*([0-9]+[,.]?[0-9]+)/i,
      // "Amerikan Doları" sonrası sayı
      /Amerikan\s+Doları[^0-9]*([0-9]+[,.]?[0-9]+)/i,
      // USD sonrası sayı
      /USD[^0-9]*([0-9]+[,.]?[0-9]+)/i,
      // JSON formatında dolar kurunu ara
      /"USD"[^0-9]*([0-9]+[,.]?[0-9]+)/i,
      // Daha genel pattern
      /dolar[^0-9]*([0-9]+[,.]?[0-9]+)/i
    ]

    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        // Türkçe virgülü noktaya çevir
        const rateString = match[1].replace(',', '.')
        const rate = parseFloat(rateString)
        
        // Makul bir kur aralığında olup olmadığını kontrol et (25-50 TL arası)
        if (!isNaN(rate) && rate >= 25 && rate <= 50) {
          return NextResponse.json({
            rate: rate,
            source: 'doviz.com',
            timestamp: new Date().toISOString(),
            pattern: pattern.toString()
          })
        }
      }
    }

    // Eğer hiçbir pattern çalışmazsa, web scraping'den ziyade güncel kuru döndür
    console.warn('Could not parse exchange rate from doviz.com, using current fallback rate')
    
    // Güncel USD/TRY kuru (yaklaşık)
    const fallbackRate = 38.93
    
    return NextResponse.json({
      rate: fallbackRate,
      source: 'fallback',
      timestamp: new Date().toISOString(),
      note: 'Could not parse from doviz.com, using fallback rate'
    })

  } catch (error) {
    console.error('Exchange rate fetch error:', error)
    
    // Hata durumunda güncel varsayılan değer döndür
    return NextResponse.json({
      rate: 38.93,
      source: 'fallback',
      timestamp: new Date().toISOString(),
      error: 'Failed to fetch from doviz.com'
    })
  }
} 