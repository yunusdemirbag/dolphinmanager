import { NextRequest, NextResponse } from 'next/server';
import { aiTitleTagSystem } from '@/lib/ai-title-tag-system';
import { initializeAdminApp } from '@/lib/firebase-admin';
import OpenAI from 'openai';
import { FAMOUS_LANDMARKS, LandmarkAnalysisResult } from '@/lib/landmarks-database';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Landscape Analysis System başlatılıyor...');
    
    // OpenAI API key kontrolü
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key bulunamadı');
      return NextResponse.json({ 
        error: 'OpenAI API key not configured' 
      }, { status: 500 });
    }
    
    // Initialize Firebase Admin
    initializeAdminApp();
    
    // FormData'dan image al
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    
    if (!imageFile) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }

    // Image'ı base64'e çevir
    const buffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    console.log('📸 Resim işlendi, manzara analizi başlıyor...');

    // OpenAI nesnesi oluştur
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Landmark tespiti için prompt
    const landmarkDetectionPrompt = `
      Analyze this image carefully. If it contains a landscape, cityscape, famous landmark, flower garden, or botanical scene, identify:
      1. The specific landmark name (if any) or flower/plant types
      2. The city name or garden/park name
      3. The country name or region
      4. Time of day (morning, sunset, night, etc.)
      5. Notable features (river, mountain, sea, flowers, trees, etc.)
      6. Dominant colors
      7. Scene type (cityscape, landscape, floral, garden, etc.)
      
      Format your response as JSON:
      {
        "isLandscape": true/false,
        "landmark": "landmark name or null",
        "city": "city name or null",
        "country": "country name or null",
        "timeOfDay": "time of day or null",
        "features": ["feature1", "feature2"],
        "colors": ["color1", "color2"],
        "sceneType": "cityscape/landscape/floral/garden/etc",
        "flowerTypes": ["flower1", "flower2"] (if applicable),
        "confidence": 0-1 (how confident you are in this identification)
      }
      
      If it's a flower garden or botanical scene, set isLandscape to true and include flower types.
      If it's not a landscape, cityscape, landmark, or floral scene, set isLandscape to false.
    `;
    
    // Landmark tespiti için OpenAI çağrısı
    const landmarkResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: landmarkDetectionPrompt },
            { 
              type: "image_url", 
              image_url: {
                url: `data:image/jpeg;base64,${base64}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
      temperature: 0.1
    });
    
    let landmarkData: LandmarkAnalysisResult = { isLandscape: false };
    try {
      landmarkData = JSON.parse(landmarkResponse.choices[0]?.message?.content || '{"isLandscape": false}');
      console.log('🏞️ Landmark detection result:', landmarkData);
    } catch (e) {
      console.error('Error parsing landmark JSON:', e);
    }
    
    // Eğer manzara değilse, normal başlık üretimi yap
    if (!landmarkData.isLandscape || (landmarkData.confidence !== undefined && landmarkData.confidence < 0.7)) {
      console.log('⚠️ Görsel manzara olarak tespit edilmedi veya güven düşük, normal başlık üretimi yapılıyor...');
      const result = await aiTitleTagSystem.generateTitleAndTags(base64);
      
      const totalTime = Date.now() - startTime;
      
      return NextResponse.json({
        success: true,
        title: result.title,
        tags: result.tags,
        category: result.category,
        isLandscape: false,
        processing_time: totalTime
      });
    }
    
    // Manzara için Etsy başlık formatı
    const etsyLandscapeTitlePrompt = `
      # ETSY LANDSCAPE TITLE FORMAT GUIDE

      ## TITLE STRUCTURE (135-140 characters ideal)
      [Location] [Landmark/Feature] Canvas Wall Art Print, [Style] [Country/Region] [Time] [Scene], Gift for [Audience]

      ## EXAMPLES FOR LANDMARKS/CITYSCAPES
      "Paris Eiffel Tower Canvas Wall Art Print, Romantic France Sunset Cityscape, Gift for Travel Lovers"
      "Istanbul Bosphorus Canvas Wall Art Print, Turkish Blue Water Cityscape, Gift for Mediterranean Decor"
      "London Eye Thames River Canvas Wall Art Print, UK Night City Skyline, Gift for British Style Lovers"
      "Santorini Blue Domes Canvas Wall Art Print, Greek Islands White Village Seascape, Gift for Beach Lovers"

      ## EXAMPLES FOR FLORAL/GARDEN SCENES
      "Vibrant Lavender Field Canvas Wall Art Print, Purple French Countryside Landscape, Gift for Flower Lovers"
      "Cherry Blossom Garden Canvas Wall Art Print, Pink Japanese Spring Botanical Scene, Gift for Nature Enthusiasts"
      "Colorful Tulip Garden Canvas Wall Art Print, Dutch Floral Landscape Morning View, Gift for Gardening Lovers"
      "Sunflower Field Sunset Canvas Wall Art Print, Golden Summer Countryside Panorama, Gift for Botanical Decor"

      ## MANDATORY ELEMENTS
      1. Start with [Location] [Landmark] - Always include specific location if recognizable
      2. Include "Canvas Wall Art Print" exactly once
      3. Use commas (not pipes |) to separate sections
      4. Include style descriptors (Romantic, Modern, Vibrant, etc.)
      5. End with "Gift for [Audience]" (Travel Lovers, Home Decor, etc.)
      6. Title Case for all words
      7. 135-140 characters total length
      8. No emojis, quotes, or special characters

      ## LOCATION NAMING CONVENTIONS
      - European landmarks: "[City] [Landmark], [Country]" (Paris Eiffel Tower, France)
      - Asian landmarks: "[City] [Landmark], [Country]" (Tokyo Skyline, Japan)
      - American landmarks: "[City] [Landmark], [Country/State]" (New York Skyline, USA)
      - Natural landmarks: "[Landmark] [Feature], [Country/Region]" (Grand Canyon Sunset, Arizona USA)

      ## AUDIENCE TARGETING
      - Travel enthusiasts: "Gift for Travel Lovers"
      - Home decorators: "Gift for Home Decor Enthusiasts"
      - Country/region fans: "Gift for [Country] Lovers" (Italy Lovers, Paris Lovers)
      - Style enthusiasts: "Gift for [Style] Decor" (Mediterranean Decor, Modern Home)
      
      ## DETECTED LANDMARK INFORMATION
      - Landmark: ${landmarkData.landmark || 'Unknown'}
      - City: ${landmarkData.city || 'Unknown'}
      - Country: ${landmarkData.country || 'Unknown'}
      - Time of Day: ${landmarkData.timeOfDay || 'Daytime'}
      - Features: ${landmarkData.features?.join(', ') || 'Scenic view'}
      - Colors: ${landmarkData.colors?.join(', ') || 'Vibrant colors'}
      
      ## TASK
      Create ONE perfect Etsy title for this landscape/cityscape canvas wall art print.
      Follow the Etsy title format exactly.
      Ensure the title is 135-140 characters long.
      Include the specific location and landmark information provided.
      Use commas to separate sections.
      End with "Gift for [appropriate audience]".
      
      ## OUTPUT
      Return ONLY the final title—no quotes, no explanations.
    `;
    
    // Manzara için Etsy etiket formatı
    const etsyLandscapeTagPrompt = `
      # ETSY LANDSCAPE TAGS OPTIMIZATION
      
      ## DETECTED LANDMARK INFORMATION
      - Landmark: ${landmarkData.landmark || 'Unknown'}
      - City: ${landmarkData.city || 'Unknown'}
      - Country: ${landmarkData.country || 'Unknown'}
      - Features: ${landmarkData.features?.join(', ') || 'Scenic view'}
      - Colors: ${landmarkData.colors?.join(', ') || 'Vibrant colors'}
      
      ## TASK
      Create EXACTLY 13 optimized Etsy tags for this landscape canvas wall art print.
      Each tag must be 2-3 words and maximum 20 characters including spaces.
      All tags must be lowercase and comma-separated.
      
      ## TAG CATEGORIES TO INCLUDE
      - Location tags (city wall art, country decor, landmark print)
      - Travel tags (travel gift, wanderlust decor)
      - Style tags (cityscape art, sunset painting)
      - Room tags (living room art, office decor)
      - Product tags (canvas print, wall art)
      
      ## OUTPUT
      Return ONLY the 13 tags, comma-separated, nothing else.
    `;
    
    // Başlık üretimi için OpenAI çağrısı
    const titleResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: etsyLandscapeTitlePrompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64}`
              }
            }
          ]
        }
      ],
      max_tokens: 150,
      temperature: 0.7
    });

    let title = titleResponse.choices[0]?.message?.content?.trim() || '';
    
    // Başlık uzunluğunu kontrol et ve düzenle
    if (title.length > 140) {
      console.log(`⚠️ Title too long (${title.length} chars), trimming...`);
      title = title.substring(0, 137) + '...';
    } else if (title.length < 135) {
      console.log(`⚠️ Title too short (${title.length} chars), enhancing...`);
      // Kısa başlıkları uzatmak için ek açıklayıcı kelimeler ekle
      if (!title.includes('Beautiful')) {
        title = title.replace('Canvas Wall Art Print', 'Beautiful Canvas Wall Art Print');
      }
      if (title.length < 135 && !title.includes('Home Decor')) {
        title += ', Perfect Home Decor';
      }
    }
    
    // Etiket üretimi için OpenAI çağrısı
    const tagsResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: etsyLandscapeTagPrompt }],
      max_tokens: 200,
      temperature: 0.5
    });

    const tagsString = tagsResponse.choices[0]?.message?.content?.trim() || '';
    let tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    
    // Etiket sayısını kontrol et
    if (tags.length > 13) {
      console.log(`⚠️ Too many tags (${tags.length}), trimming to 13...`);
      tags = tags.slice(0, 13);
    } else if (tags.length < 13) {
      console.log(`⚠️ Not enough tags (${tags.length}), adding generic ones...`);
      
      // Eksik etiketleri tamamlamak için genel etiketler
      const genericTags = [
        'wall art print',
        'home decoration',
        'canvas art',
        'wall hanging',
        'room decor',
        'art print',
        'wall decor',
        'travel gift',
        'office decor',
        'living room art',
        'bedroom decor',
        'gift idea',
        'landscape art'
      ];
      
      // Eksik etiket sayısı kadar genel etiket ekle
      const missingCount = 13 - tags.length;
      tags = [...tags, ...genericTags.slice(0, missingCount)];
    }
    
    // Manzara açıklaması oluştur
    const description = generateLandscapeDescription(landmarkData);
    
    // Kategori belirle
    let category = 'landscape';
    let shopSection = '52806536'; // Varsayılan Landscape Art kategori ID'si
    
    // Bölgeye göre kategori belirleme
    if (landmarkData.country && typeof landmarkData.country === 'string') {
      const country = landmarkData.country.toLowerCase();
      
      // Avrupa ülkeleri
      if (['france', 'italy', 'spain', 'uk', 'germany', 'greece', 'netherlands', 'switzerland'].includes(country)) {
        category = 'landscape-europe';
      } 
      // Asya ülkeleri
      else if (['japan', 'china', 'india', 'thailand', 'vietnam', 'turkey', 'indonesia', 'singapore'].includes(country)) {
        category = 'landscape-asia';
      }
      // Amerika ülkeleri
      else if (['usa', 'canada', 'mexico', 'brazil', 'argentina', 'peru', 'chile'].includes(country)) {
        category = 'landscape-america';
      }
    }
    
    const totalTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      title,
      tags,
      description,
      category,
      shopSection,
      isLandscape: true,
      landmarkData,
      processing_time: totalTime
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Landscape analysis error:', error);
    
    const totalTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      processing_time: totalTime
    }, { status: 500 });
  }
}

// Manzara açıklaması oluşturma
function generateLandscapeDescription(landmarkData: any): string {
  // Temel açıklama şablonu
  const baseDescription = `
🖼️ PREMIUM CANVAS WALL ART - READY TO HANG

▶︎ HIGH-QUALITY MATERIALS: Printed on premium canvas with fade-resistant inks for vibrant, long-lasting colors.

▶︎ READY TO HANG: Stretched over a solid wood frame with hanging hardware already installed.

▶︎ MULTIPLE SIZES AVAILABLE: Choose the perfect size for your space from our various options.

▶︎ PERFECT GIFT: Ideal for travel enthusiasts, home decorators, and anyone who appreciates beautiful wall art.

▶︎ SATISFACTION GUARANTEED: We stand behind the quality of our canvas prints with a 100% satisfaction guarantee.
`;

  // Landmark bilgisi varsa özel açıklama ekle
  if (landmarkData.isLandscape && landmarkData.confidence !== undefined && landmarkData.confidence > 0.7) {
    // Sahne tipine göre başlık belirleme
    let sceneTitle = "STUNNING LANDSCAPE";
    let sceneDescription = "landscape";
    
    if (landmarkData.sceneType) {
      const sceneType = landmarkData.sceneType.toLowerCase();
      
      if (sceneType.includes('floral') || sceneType.includes('flower') || sceneType.includes('garden') || sceneType.includes('botanical')) {
        sceneTitle = "BEAUTIFUL FLORAL SCENE";
        sceneDescription = "floral scene";
        
        // Çiçek türleri varsa ekle
        if (landmarkData.flowerTypes && landmarkData.flowerTypes.length > 0) {
          sceneTitle = `STUNNING ${landmarkData.flowerTypes[0].toUpperCase()} GARDEN`;
          sceneDescription = `${landmarkData.flowerTypes.join(' and ')} garden`;
        }
      }
      else if (sceneType.includes('cityscape') || sceneType.includes('city') || sceneType.includes('urban')) {
        sceneTitle = "STUNNING CITYSCAPE";
        sceneDescription = "cityscape";
      }
    }
    
    const locationInfo = [];
    
    if (landmarkData.landmark) locationInfo.push(landmarkData.landmark);
    if (landmarkData.city) locationInfo.push(landmarkData.city);
    if (landmarkData.country) locationInfo.push(landmarkData.country);
    
    const locationText = locationInfo.join(', ');
    
    const featuresText = landmarkData.features && landmarkData.features.length > 0
      ? `featuring ${landmarkData.features.join(', ')}`
      : 'with its stunning views';
    
    const timeText = landmarkData.timeOfDay
      ? `during a beautiful ${landmarkData.timeOfDay}`
      : 'in perfect lighting';
    
    const colorsText = landmarkData.colors && landmarkData.colors.length > 0
      ? `with vibrant ${landmarkData.colors.join(' and ')} tones`
      : 'with vibrant colors';
    
    const customDescription = `
🌍 ${sceneTitle} ${locationText ? locationText.toUpperCase() : ''} CANVAS WALL ART

This beautiful canvas print captures the breathtaking ${sceneDescription} of ${locationText || 'this stunning scene'} ${timeText}. This artwork ${featuresText} ${colorsText} will transform any room into an elegant space.

Perfect for ${landmarkData.sceneType?.includes('floral') ? 'flower enthusiasts, botanical lovers,' : 'travel enthusiasts, home decorators,'} and anyone who appreciates the beauty of ${landmarkData.country || landmarkData.sceneType || 'nature and landscapes'}.
`;
    
    return customDescription + baseDescription;
  }
  
  // Landmark bilgisi yoksa genel açıklama
  return `
🌍 STUNNING LANDSCAPE CANVAS WALL ART

This beautiful canvas print captures a breathtaking scenic view with vibrant colors and perfect composition. This artwork will transform any room into an elegant space.

Perfect for nature enthusiasts, home decorators, and anyone who appreciates beautiful landscape art.
` + baseDescription;
}