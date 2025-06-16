import { NextRequest, NextResponse } from "next/server"
import { titlePrompt, descriptionPrompt, tagsPrompt, categoryPrompt } from "@/lib/openai-yonetim"
import { ETSY_VALID_COLORS, EtsyColor } from "@/lib/etsy-api"
import { supabaseAdmin } from "@/lib/supabase"
import { getUser } from "@/lib/auth"
import { analyzeImageWithOpenAI, analyzeImageColors, generateTitle, generateTitleWithFocus } from "@/lib/openai-yonetim"

export const runtime = "edge"

// Tespit edilen rengi Etsy'nin kabul ettiği renk formatına dönüştürür
function convertToEtsyColor(detectedColor: string): EtsyColor | null {
  const colorMap: Record<string, EtsyColor> = {
    // Pembe tonları
    'pink': 'pink',
    'rose': 'pink',
    'magenta': 'pink',
    'fuchsia': 'pink',
    'salmon': 'pink',
    'coral': 'pink',
    
    // Mavi tonları  
    'blue': 'blue',
    'navy': 'blue',
    'cyan': 'blue',
    'turquoise': 'blue',
    'teal': 'blue',
    'aqua': 'blue',
    'azure': 'blue',
    'cerulean': 'blue',
    'indigo': 'blue',
    
    // Yeşil tonları
    'green': 'green',
    'lime': 'green',
    'olive': 'green',
    'emerald': 'green',
    'mint': 'green',
    'sage': 'green',
    'forest': 'green',
    
    // Kırmızı tonları
    'red': 'red',
    'crimson': 'red',
    'scarlet': 'red',
    'maroon': 'red',
    'ruby': 'red',
    'burgundy': 'red',
    
    // Mor tonları
    'purple': 'purple',
    'violet': 'purple',
    'lavender': 'purple',
    'lilac': 'purple',
    'plum': 'purple',
    
    // Sarı tonları
    'yellow': 'yellow',
    'gold': 'gold',
    'amber': 'yellow',
    'mustard': 'yellow',
    'lemon': 'yellow',
    
    // Turuncu tonları
    'orange': 'orange',
    'tangerine': 'orange',
    'peach': 'orange',
    
    // Kahverengi tonları
    'brown': 'brown',
    'chocolate': 'brown',
    'coffee': 'brown',
    'tan': 'brown',
    'beige': 'beige',
    'khaki': 'beige',
    
    // Gri tonları
    'gray': 'gray',
    'grey': 'gray',
    'silver': 'silver',
    'charcoal': 'gray',
    'ash': 'gray',
    
    // Siyah ve beyaz
    'black': 'black',
    'white': 'white',
    'ivory': 'white',
    'cream': 'white',
    'snow': 'white',
    
    // Türkçe renk isimleri
    'mavi': 'blue',
    'lacivert': 'blue',
    'turkuaz': 'blue',
    'yeşil': 'green',
    'zümrüt': 'green',
    'kırmızı': 'red',
    'bordo': 'red',
    'pembe': 'pink',
    'mor': 'purple',
    'sarı': 'yellow',
    'altın': 'gold',
    'turuncu': 'orange',
    'kahverengi': 'brown',
    'bej': 'beige',
    'gri': 'gray',
    'siyah': 'black',
    'beyaz': 'white',
    'gümüş': 'silver',
    'bakır': 'copper'
  };

  const lowerColor = detectedColor.toLowerCase();
  return colorMap[lowerColor] || null;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image');
    if (!imageFile || !(imageFile instanceof File)) {
      return NextResponse.json({ error: "Resim gerekli" }, { status: 400 });
    }
    const focusKeyword = formData.get('focusKeyword') as string;
    const requestType = formData.get('requestType') as string;

    // Convert image to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const imageType = imageFile.type.split('/')[1] || 'jpeg';

    let title: string;

    if (requestType === 'focus' && focusKeyword) {
      // Focus başlık üret
      title = await generateTitleWithFocus({
        imageBase64: base64,
        imageType,
        focusKeyword: focusKeyword.trim()
      });
    } else {
      // Normal başlık üret  
      title = await generateTitle({
        imageBase64: base64,
        imageType
      });
    }

    return NextResponse.json({ 
      title: title.trim(),
      success: true 
    });

  } catch (error) {
    console.error("Başlık oluşturulamadı:", error);
    return NextResponse.json(
      { error: 'Başlık oluşturulamadı' },
      { status: 500 }
    );
  }
} 