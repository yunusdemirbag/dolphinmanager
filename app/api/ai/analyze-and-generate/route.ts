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

    // Unified prompt - tek çağrıda her şeyi al
    const unifiedPrompt = `
TASK: Analyze this image and generate complete Etsy listing data for a canvas wall art print.

TITLE GENERATION:
${titlePrompt}

TAG GENERATION:
${tagsPrompt}

CATEGORY SELECTION:
Select the best category from these options:
${availableCategories.map((cat: any) => `- ${cat.title}`).join('\n')}

ADDITIONAL ANALYSIS:
Provide brief description of what you see in the image, dominant colors, and detected art style.

OUTPUT FORMAT (JSON):
{
  "title": "Your generated title here",
  "tags": ["tag1", "tag2", "tag3", ...],
  "suggestedCategory": "Category Name",
  "imageAnalysis": "Brief description of the image",
  "dominantColors": ["color1", "color2", "color3"],
  "detectedStyle": ["style1", "style2"]
}

Return only valid JSON, no explanations.
`;

    // OpenAI'ye tek çağrı yap
    console.log('🔑 OpenAI API Key exists:', !!process.env.OPENAI_API_KEY);
    console.log('🔑 OpenAI API Key starts with:', process.env.OPENAI_API_KEY?.substring(0, 20) + '...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: unifiedPrompt
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
      max_tokens: 500,
      temperature: 0.7,
    });
    
    console.log('✅ OpenAI response received successfully');

    const aiResult = response.choices[0]?.message?.content?.trim();
    console.log('🤖 AI yanıtı alındı:', aiResult);

    if (!aiResult) {
      throw new Error('AI yanıt vermedi');
    }

    // JSON parse et - markdown code block'ları temizle
    let cleanedAiResult = aiResult;
    
    // ```json ... ``` formatını temizle
    if (cleanedAiResult.includes('```json')) {
      cleanedAiResult = cleanedAiResult.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    }
    
    // ``` ... ``` formatını temizle  
    if (cleanedAiResult.includes('```')) {
      cleanedAiResult = cleanedAiResult.replace(/```\s*/g, '');
    }
    
    cleanedAiResult = cleanedAiResult.trim();
    
    let parsedResult;
    try {
      parsedResult = JSON.parse(cleanedAiResult);
    } catch (parseError) {
      console.error('JSON parse hatası:', parseError);
      console.error('Raw AI result:', aiResult);
      console.error('AI result type:', typeof aiResult);
      console.error('AI result length:', aiResult?.length);
      
      // Fallback: Basit parsing
      parsedResult = {
        title: "Beautiful Canvas Wall Art Print - Modern Home Decor",
        tags: ["wall art", "canvas print", "home decor", "modern art", "wall decoration", "living room", "bedroom art", "office decor", "abstract art", "contemporary", "minimalist", "housewarming", "gift idea"],
        suggestedCategory: availableCategories[0]?.title || "Modern Art",
        imageAnalysis: "Unable to analyze image",
        dominantColors: ["blue", "white", "gray"],
        detectedStyle: ["modern", "abstract"]
      };
    }

    // Kategori ID'sini bul
    const selectedCategory = availableCategories.find((cat: any) => 
      cat.title.toLowerCase() === parsedResult.suggestedCategory?.toLowerCase()
    );

    const result = {
      title: parsedResult.title || "Beautiful Canvas Wall Art Print - Modern Home Decor",
      tags: Array.isArray(parsedResult.tags) ? parsedResult.tags.slice(0, 13) : [],
      suggestedCategory: parsedResult.suggestedCategory || availableCategories[0]?.title,
      suggestedCategoryId: selectedCategory?.shop_section_id || null,
      imageAnalysis: parsedResult.imageAnalysis || "Canvas wall art image",
      dominantColors: parsedResult.dominantColors || [],
      detectedStyle: parsedResult.detectedStyle || [],
      processingTime: Date.now(),
      success: true
    };

    console.log('✅ Unified AI analizi tamamlandı:', {
      title: result.title.substring(0, 50) + '...',
      tagCount: result.tags.length,
      category: result.suggestedCategory
    });

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