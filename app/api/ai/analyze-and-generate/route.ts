import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getPromptById } from '@/lib/prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Unified AI analysis başlatılıyor...');
    
    // FormData'dan image ve diğer parametreleri al
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const availableCategories = JSON.parse(formData.get('categories') as string || '[]');
    const customPrompts = JSON.parse(formData.get('customPrompts') as string || '{}');
    
    if (!imageFile) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // Image'ı base64'e çevir
    const buffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const imageDataUrl = `data:${imageFile.type};base64,${base64}`;

    console.log('📸 Resim işlendi, AI analizi başlıyor...');

    // Prompt'ları al (custom veya default)
    const titlePromptConfig = getPromptById('title-prompt');
    const tagsPromptConfig = getPromptById('tags-prompt');
    
    const titlePrompt = customPrompts.title || titlePromptConfig?.prompt || `
TASK: Generate a single, SEO-optimized, high-conversion Etsy product title for a physical canvas wall art print based on this image.

REQUIREMENTS:
- Maximum 140 characters
- Include primary keyword: "canvas wall art" or "wall decor"
- Include 2-3 relevant style descriptors (modern, minimalist, abstract, etc.)
- Include room/space keywords (living room, bedroom, office, etc.)
- Must be in English
- Focus on physical canvas prints, not digital downloads

OUTPUT FORMAT:
Return only the title, no quotes, no explanations.
`;

    const tagsPrompt = customPrompts.tags || tagsPromptConfig?.prompt || `
TASK: Generate a hyper-optimized list of 13 Etsy tags for a physical canvas wall art print, based on the provided product title.

REQUIREMENTS:
- Exactly 13 tags
- Each tag maximum 20 characters
- Focus on high-search volume keywords
- Mix of broad and specific terms
- Include style, room, and occasion keywords
- All lowercase
- No special characters or quotes
- Separate with commas

OUTPUT FORMAT:
Return only the tags separated by commas, no explanations.
`;

    // SIRA SİSTEMİ - Önce başlık, sonra etiketler (kesinlikle paralel değil!)
    // ⚡ SPEED: Debug logları kaldırıldı
    const titleResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${titlePrompt}\n\nOUTPUT: Return ONLY the title, no quotes, no explanations.`
            },
            {
              type: "image_url",
              image_url: {
                url: imageDataUrl,
                detail: "low"
              }
            }
          ]
        }
      ],
      max_tokens: 80,
      temperature: 0.7,
    });
    
    const titleResult = titleResponse.choices[0]?.message?.content?.trim() || '';
    const tagsResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `TITLE: "${titleResult}"

${tagsPrompt}

Use this title to generate relevant tags. OUTPUT: Return ONLY comma-separated tags, no explanations.`
            },
            {
              type: "image_url", 
              image_url: {
                url: imageDataUrl,
                detail: "low"
              }
            }
          ]
        }
      ],
      max_tokens: 120,
      temperature: 0.7,
    });
    
    const tagsResult = tagsResponse.choices[0]?.message?.content?.trim() || '';
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Select best category from:
${availableCategories.map((cat: any) => `- ${cat.title}`).join('\n')}

Also provide: colors, style, brief description.

OUTPUT (JSON):
{
  "suggestedCategory": "Category Name",
  "imageAnalysis": "Brief description",
  "dominantColors": ["color1", "color2"], 
  "detectedStyle": ["style1", "style2"]
}`
            },
            {
              type: "image_url",
              image_url: {
                url: imageDataUrl,
                detail: "low"
              }
            }
          ]
        }
      ],
      max_tokens: 200,
      temperature: 0.7,
    });
    
    const analysisResult = analysisResponse.choices[0]?.message?.content?.trim() || '';

    // Sonuçları işle
    let parsedTags = [];
    try {
      parsedTags = tagsResult.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0);
    } catch (e) {
      console.error('Tags parsing error:', e);
      parsedTags = ["wall art", "canvas print", "home decor", "modern art"];
    }
    
    let parsedAnalysis = {
      suggestedCategory: availableCategories[0]?.title || "Modern Art",
      imageAnalysis: "Unable to analyze",
      dominantColors: ["blue", "white"],
      detectedStyle: ["modern"]
    };
    
    try {
      let cleanAnalysis = analysisResult;
      if (cleanAnalysis.includes('```json')) {
        cleanAnalysis = cleanAnalysis.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      }
      if (cleanAnalysis.includes('```')) {
        cleanAnalysis = cleanAnalysis.replace(/```\s*/g, '');
      }
      parsedAnalysis = JSON.parse(cleanAnalysis.trim());
    } catch (e) {
      console.error('Analysis parsing error:', e);
    }

    // Final result
    const parsedResult = {
      title: titleResult,
      tags: parsedTags,
      ...parsedAnalysis
    };
    
    // ⚡ SPEED: Debug log kaldırıldı

    // ⚡ SPEED OPTIMIZATION: İlk başlığı kullan, retry kaldırıldı

    // Kategori ID'sini bul
    const selectedCategory = availableCategories.find((cat: any) => 
      cat.title.toLowerCase() === parsedResult.suggestedCategory?.toLowerCase()
    );

    const result = {
      title: parsedResult.title, // Artık fallback yok
      tags: Array.isArray(parsedResult.tags) ? parsedResult.tags.slice(0, 13) : [],
      suggestedCategory: parsedResult.suggestedCategory || availableCategories[0]?.title,
      suggestedCategoryId: selectedCategory?.shop_section_id || null,
      imageAnalysis: parsedResult.imageAnalysis || "Canvas wall art image",
      dominantColors: parsedResult.dominantColors || [],
      detectedStyle: parsedResult.detectedStyle || [],
      processingTime: Date.now(),
      success: true,
      retryAttempted: false // Retry kaldırıldı
    };

    // ⚡ SPEED: Final debug log kaldırıldı

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Unified AI analysis hatası:', error);
    console.error('❌ Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    
    // Return error response instead of fallback
    return NextResponse.json({
      title: null,
      tags: [],
      suggestedCategory: null,
      suggestedCategoryId: null,
      imageAnalysis: "Başlık üretilemedi - API hatası",
      dominantColors: [],
      detectedStyle: [],
      error: `API Error: ${error instanceof Error ? error.message : 'Analysis failed'}`,
      success: false,
      debugInfo: {
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        keyPrefix: process.env.OPENAI_API_KEY?.substring(0, 20) + '...',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}