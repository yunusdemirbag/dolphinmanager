import { NextRequest, NextResponse } from "next/server"
import { titlePrompt, descriptionPrompt, tagsPrompt, categoryPrompt } from "@/lib/prompts"
import { ETSY_VALID_COLORS, EtsyColor } from "@/lib/etsy-api"
import { supabaseAdmin } from "@/lib/supabase"
import { getUser } from "@/lib/auth"

export const runtime = "edge"

// API istek loglarını veritabanına kaydetmek için yardımcı fonksiyon
async function logApiRequest(endpoint: string, userId: string | null, success: boolean, durationMs: number, details?: any) {
  try {
    await supabaseAdmin
      .from("api_logs")
      .insert({
        endpoint,
        user_id: userId,
        timestamp: new Date().toISOString(),
        success,
        duration_ms: durationMs,
        details
      });
    console.log(`API log kaydedildi: ${endpoint}, başarı: ${success}, süre: ${durationMs}ms`);
  } catch (error) {
    console.error("API log kaydederken hata:", error);
  }
}

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

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let userId = null;
  let success = false;
  
  try {
    // Kullanıcı kimliğini al
    try {
      const user = await getUser();
      userId = user?.id || null;
    } catch (error) {
      console.error("Kullanıcı kimliği alınamadı:", error);
    }
    
    const contentType = req.headers.get("content-type") || "";
    // Açıklama üretimi için JSON body
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const prompt = body.prompt;
      if (!prompt) {
        return NextResponse.json({ error: "Prompt gerekli" }, { status: 400 });
      }
      const apiKey = process.env.OPENAI_API_KEY;
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that generates product descriptions or tags for Etsy listings.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("OpenAI API error:", error);
        
        // Log API request with error
        await logApiRequest(
          "/api/ai/generate-etsy-title (JSON)", 
          userId, 
          false, 
          Date.now() - startTime, 
          { error, promptType: "JSON" }
        );
        
        return NextResponse.json(
          { error: "OpenAI API hatası" },
          { status: response.status }
        );
      }

      const result = await response.json();
      const generatedText = result.choices[0].message.content.trim();
      
      success = true;
      // Log successful API request
      await logApiRequest(
        "/api/ai/generate-etsy-title (JSON)", 
        userId, 
        true, 
        Date.now() - startTime, 
        { promptType: "JSON", promptLength: prompt.length }
      );
      
      return new NextResponse(generatedText, { status: 200 });
    }

    // Resim analizi için multipart/form-data
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const image = formData.get("image");

      if (!image || !(image instanceof File)) {
        // Log API request with error
        await logApiRequest(
          "/api/ai/generate-etsy-title (Image)", 
          userId, 
          false, 
          Date.now() - startTime, 
          { error: "Resim gerekli" }
        );
        
        return NextResponse.json({ error: "Resim gerekli" }, { status: 400 });
      }

      const bytes = await image.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64Image = buffer.toString("base64");

      const apiKey = process.env.OPENAI_API_KEY;
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that analyzes images and generates product titles, descriptions, and color information for Etsy listings.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: titlePrompt.prompt,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/${image.type};base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("OpenAI Vision API error:", error);
        
        // Log API request with error
        await logApiRequest(
          "/api/ai/generate-etsy-title (Image)", 
          userId, 
          false, 
          Date.now() - startTime, 
          { error, imageSize: image.size }
        );
        
        return NextResponse.json(
          { error: "OpenAI Vision API hatası" },
          { status: response.status }
        );
      }

      const result = await response.json();
      const generatedText = result.choices[0].message.content.trim();

      // Markdown kod bloğunu temizle
      const cleanedText = generatedText
        .replace(/```.*\n/g, "")
        .replace(/```/g, "")
        .trim();

      // Renk bilgilerini çıkar
      let title = cleanedText;
      let primaryColor = null;
      let secondaryColor = null;

      // Renk bilgilerini çıkarmak için ek bir API çağrısı yap
      try {
        const colorResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "You are a helpful assistant that analyzes images to identify colors.",
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Identify the two most dominant colors in this image. Return ONLY a JSON object with 'primaryColor' and 'secondaryColor' properties. Use simple color names like red, blue, green, etc.",
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/${image.type};base64,${base64Image}`,
                    },
                  },
                ],
              },
            ],
            temperature: 0.3,
            max_tokens: 150,
            response_format: { type: "json_object" }
          }),
        });

        if (colorResponse.ok) {
          const colorResult = await colorResponse.json();
          const colorData = JSON.parse(colorResult.choices[0].message.content);
          
          // Renkleri Etsy'nin kabul ettiği formata dönüştür
          if (colorData.primaryColor) {
            primaryColor = convertToEtsyColor(colorData.primaryColor);
          }
          if (colorData.secondaryColor) {
            secondaryColor = convertToEtsyColor(colorData.secondaryColor);
          }
        }
      } catch (colorError) {
        console.error("Renk analizi hatası:", colorError);
      }

      success = true;
      // Log successful API request
      await logApiRequest(
        "/api/ai/generate-etsy-title (Image)", 
        userId, 
        true, 
        Date.now() - startTime, 
        { 
          imageSize: image.size, 
          primaryColor, 
          secondaryColor 
        }
      );
      
      return NextResponse.json({ 
        title, 
        colors: {
          primary: primaryColor,
          secondary: secondaryColor
        }
      });
    }

    // Log API request with unsupported content type error
    await logApiRequest(
      "/api/ai/generate-etsy-title", 
      userId, 
      false, 
      Date.now() - startTime, 
      { error: "Desteklenmeyen content type", contentType }
    );
    
    return NextResponse.json(
      { error: "Desteklenmeyen content type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Generate Etsy title error:", error);
    
    // Log API request with error
    await logApiRequest(
      "/api/ai/generate-etsy-title", 
      userId, 
      false, 
      Date.now() - startTime, 
      { error: error instanceof Error ? error.message : String(error) }
    );
    
    return NextResponse.json(
      { error: "İstek işlenirken bir hata oluştu" },
      { status: 500 }
    );
  }
} 