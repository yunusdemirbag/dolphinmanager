import { NextRequest, NextResponse } from 'next/server';
import { aiTitleTagSystem } from '@/lib/ai-title-tag-system';
import { initializeAdminApp } from '@/lib/firebase-admin';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🚀 New AI Title-Tag System başlatılıyor...');
    
    // OpenAI API key kontrolü
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key bulunamadı');
      return NextResponse.json({ 
        error: 'OpenAI API key not configured' 
      }, { status: 500 });
    }
    
    // Initialize Firebase Admin
    initializeAdminApp();
    
    // Force update templates (only for debugging - remove in production)
    await aiTitleTagSystem.forceUpdateTemplates();
    
    // FormData'dan image ve diğer parametreleri al
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    
    let availableCategories = JSON.parse(formData.get('categories') as string || '[]');
    
    // Kategoriler gelmiyorsa manuel liste kullan - geçici düzeltme
    if (availableCategories.length === 0) {
      console.log('⚠️ Kategoriler gelmiyor, manuel liste kullanılıyor...');
      availableCategories = [
        { title: 'Abstract Art', shop_section_id: 52817067 },
        { title: 'Love Art', shop_section_id: 52817069 },
        { title: 'Woman Art', shop_section_id: 52817075 },
        { title: 'Flowers Art', shop_section_id: 52806532 },
        { title: 'Landscape Art', shop_section_id: 52806536 },
        { title: 'Animal Art', shop_section_id: 52817083 },
        { title: 'Mark Rothko Art Print', shop_section_id: 52806538 },
        { title: 'Modern Art', shop_section_id: 52806540 },
        { title: 'Surreal Canvas Art', shop_section_id: 52806542 },
        { title: 'Banksy & Graffiti Art', shop_section_id: 52806544 },
        { title: 'Music & Dance Art', shop_section_id: 52817093 },
        { title: 'Ethnic', shop_section_id: 52817095 },
        { title: 'Religious Art', shop_section_id: 52806554 },
        { title: 'Peacock Art', shop_section_id: 52806558 },
        { title: 'Kitchen Art', shop_section_id: 52817099 },
        { title: 'Buddha and Zen Stones', shop_section_id: 52817101 },
        { title: 'Oil Painting', shop_section_id: 54279354 }
      ];
    }
    
    console.log('✅ Kategoriler alındı:', availableCategories.length, 'adet');
    console.log('📋 Kategori listesi:', availableCategories.map(c => c.title || c.name).join(', '));
    
    if (!imageFile) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }

    // Image'ı base64'e çevir
    const buffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    console.log('📸 Resim işlendi, AI analizi başlıyor...');

    // Use new AI Title-Tag System for title and tags
    let result;
    try {
      result = await aiTitleTagSystem.generateTitleAndTags(base64);
    } catch (aiError) {
      console.error('❌ AI sistem hatası:', aiError);
      
      // OpenAI API kredi/quota hatası kontrolü
      const errorMessage = aiError instanceof Error ? aiError.message : String(aiError);
      if (errorMessage.includes('insufficient_quota') || 
          errorMessage.includes('You exceeded your current quota') ||
          errorMessage.includes('429')) {
        
        console.error('❌ OpenAI API kredisi/quota hatası tespit edildi!');
        return NextResponse.json({
          success: false,
          error: 'OpenAI API kredisi tükenmiş. Lütfen API kredinizi kontrol edin ve yenileyin.',
          error_type: 'openai_quota_exceeded',
          processing_time: Date.now() - startTime
        }, { status: 429 });
      }
      
      // Fallback basit sistem
      return NextResponse.json({
        success: true,
        title: "Modern Canvas Wall Art Print | Contemporary Home Decor | Statement Piece",
        tags: ["canvas art", "wall decor", "modern art", "home decoration", "living room", "bedroom art", "contemporary", "statement piece", "ready to hang", "gift idea", "wall hanging", "art print", "interior design"],
        analysis: { primarySubject: 'modern', artStyle: 'contemporary' },
        category: availableCategories[0],
        suggestedCategoryId: availableCategories[0]?.shop_section_id,
        processing_time: Date.now() - startTime,
        ai_system: 'fallback_basic'
      });
    }
    
    console.log(`✅ AI Title-Tag System completed in ${result.processing_time}ms`);
    console.log(`🎯 Generated: "${result.title}"`);
    console.log(`🏷️ Tags: ${result.tags.join(', ')}`);

    // Generate basic analysis for compatibility (simplified)
    const analysis = {
      primarySubject: result.category,
      artStyle: result.category,
      mood: 'Creative',
      colors: ['Various'],
      composition: 'Balanced',
      commercialViability: 'High',
      targetAudience: 'Art Lovers',
      suggestedPrice: '$25-45',
      marketingAngle: 'Statement Piece',
      seasonality: 'Year-round',
      competition: 'Medium',
      uniqueness: 'High'
    };

    // SADECE BAŞLIK + OPENAI KATEGORİ SEÇİMİ
    let selectedCategory = null;
    
    if (availableCategories.length > 0) {
      console.log('📋 Kanvas kategorileri:', availableCategories.map((cat: any) => cat.title || cat.name).join(', '));
      console.log(`🤖 OpenAI ile başlık bazlı kategori seçimi: "${result.title}"`);
      
      try {
        if (process.env.OPENAI_API_KEY) {
          const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
          });

          const categoryNames = availableCategories.map((cat: any) => cat.title || cat.name || '').filter(Boolean);
          
          // Özel kategori kontrolleri
          // 1. Rothko için özel kontrol
          if (result.title.toLowerCase().includes('rothko')) {
            const rothkoCategory = availableCategories.find((cat: any) => 
              (cat.title || cat.name || '').toLowerCase().includes('rothko')
            );
            
            if (rothkoCategory) {
              selectedCategory = rothkoCategory;
              console.log(`✅ Rothko kategorisi manuel seçildi: "${rothkoCategory.title || rothkoCategory.name}"`);
            }
          }
          
          // 2. Buddha/Religious başlık için özel kontrol  
          if (!selectedCategory && (result.title.toLowerCase().includes('buddha') || 
              result.title.toLowerCase().includes('zen') || 
              result.title.toLowerCase().includes('meditation'))) {
            const buddhaCategory = availableCategories.find((cat: any) => 
              (cat.title || cat.name || '').toLowerCase().includes('buddha') ||
              (cat.title || cat.name || '').toLowerCase().includes('zen')
            );
            
            if (buddhaCategory) {
              selectedCategory = buddhaCategory;
              console.log(`✅ Buddha/Zen kategorisi manuel seçildi: "${buddhaCategory.title || buddhaCategory.name}"`);
            }
          }
          
          // Eğer özel kategori seçilmediyse OpenAI'ye sor
          if (!selectedCategory) {
            const prompt = `Look at this canvas wall art title and choose the best category:

TITLE: "${result.title}"

AVAILABLE CATEGORIES:
${categoryNames.join('\n')}

Choose the most suitable category from the list above. Return only the exact category name.`;

            console.log('📤 OpenAI prompt gönderiliyor...');
            
            const openaiResponse = await openai.chat.completions.create({
              model: "gpt-3.5-turbo",
              messages: [{ role: "user", content: prompt }],
              max_tokens: 50,
              temperature: 0.1,
            });

            const selectedCategoryName = openaiResponse.choices[0]?.message?.content?.trim();
            console.log(`🎯 OpenAI seçimi: "${selectedCategoryName}"`);
            
            // Kategori bul
            const matchedCategory = availableCategories.find((cat: any) => 
              (cat.title || cat.name || '').toLowerCase() === selectedCategoryName?.toLowerCase()
            );
            
            if (matchedCategory) {
              selectedCategory = matchedCategory;
              console.log(`✅ Kategori bulundu: "${matchedCategory.title || matchedCategory.name}"`);
            } else {
              console.log(`⚠️ "${selectedCategoryName}" listede bulunamadı, fallback yapılıyor...`);
            }
          }
        }
      } catch (error) {
        console.error('❌ OpenAI kategori seçimi hatası:', error);
      }
      
      // FALLBACK: OpenAI başarısızsa Abstract Art seç
      if (!selectedCategory) {
        console.log('⚠️ OpenAI seçimi başarısız, Abstract Art fallback...');
        
        const abstractCategory = availableCategories.find((cat: any) => 
          (cat.title || cat.name || '').toLowerCase() === 'abstract art'
        );
        
        selectedCategory = abstractCategory || availableCategories[0];
        console.log(`🔄 Fallback kategori: "${selectedCategory?.title || selectedCategory?.name}"`);
      }
    }

    const totalTime = Date.now() - startTime;

    // Kategori ID'sini doğru şekilde belirle
    const categoryId = selectedCategory?.shop_section_id || selectedCategory?.id || null;
    console.log('🏷️ Seçilen kategori ID:', categoryId);

    return NextResponse.json({
      success: true,
      title: result.title,
      tags: result.tags,
      analysis,
      category: selectedCategory,
      suggestedCategoryId: categoryId,
      processing_time: totalTime,
      ai_system: 'firebase_enhanced',
      results: {
        title: result.title,
        tags: result.tags.join(', '),
        analysis,
        category: selectedCategory,
        processing_time: totalTime,
        ai_system: 'firebase_enhanced'
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ New AI analysis error:', error);
    
    const totalTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      processing_time: totalTime
    }, { status: 500 });
  }
}