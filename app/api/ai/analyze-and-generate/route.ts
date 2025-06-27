import { NextRequest, NextResponse } from 'next/server';
import { aiTitleTagSystem } from '@/lib/ai-title-tag-system';
import { initializeAdminApp } from '@/lib/firebase-admin';
import OpenAI from 'openai';
import { getPromptById } from '@/lib/prompts';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🚀 New AI Title-Tag System başlatılıyor...');
    
    // Initialize Firebase Admin
    initializeAdminApp();
    
    // Force update templates (only for debugging - remove in production)
    await aiTitleTagSystem.forceUpdateTemplates();
    
    // FormData'dan image ve diğer parametreleri al
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const availableCategories = JSON.parse(formData.get('categories') as string || '[]');
    const customPrompts = JSON.parse(formData.get('customPrompts') as string || '{}');
    
    if (!imageFile) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }

    // Image'ı base64'e çevir
    const buffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    console.log('📸 Resim işlendi, AI analizi başlıyor...');

    // Use new AI Title-Tag System for title and tags
    const result = await aiTitleTagSystem.generateTitleAndTags(base64);
    
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

    // Select category from available categories if provided
    let selectedCategory = null;
    if (availableCategories.length > 0) {
      console.log('📋 Kanvas kategorileri:', availableCategories.map((cat: any) => cat.title || cat.name).join(', '));
      
      // İLK ÖNCE AI ANALİZİNDEN GELEN KATEGORİ BİLGİSİNİ KULLAN
      console.log(`🎨 İlk analiz kategorisi: "${result.category}" - Hızlı eşleştirme yapılıyor...`);
      
      const detectedCategoryLower = result.category.toLowerCase();
      
      // Kategori eşleştirme haritası
      const categoryMapping = {
        'rothko': ['mark rothko', 'rothko'],
        'animal': ['animal'],
        'religious': ['religious'],
        'woman': ['woman'],
        'abstract': ['abstract'],
        'flowers': ['flower'],
        'landscape': ['landscape'],
        'modern': ['modern', 'fashion'],
        'zen': ['buddha', 'zen'],
        'african': ['ethnic'],
        'jazz': ['music', 'dance'],
        'asian': ['ethnic'],
        'frida': ['ethnic'],
        'klimt': ['woman', 'abstract'],
        'nature': ['landscape', 'flower']
      };
      
      // İlk analiz kategorisine göre eşleştir
      const mappedKeywords = categoryMapping[detectedCategoryLower as keyof typeof categoryMapping] || [detectedCategoryLower];
      
      for (const keyword of mappedKeywords) {
        const matchedCategory = availableCategories.find((cat: any) => {
          const categoryTitle = (cat.title || cat.name || '').toLowerCase();
          return categoryTitle.includes(keyword);
        });
        
        if (matchedCategory) {
          selectedCategory = matchedCategory;
          console.log(`✅ Hızlı kategori eşleştirmesi: "${result.category}" → "${matchedCategory.title || matchedCategory.name}"`);
          break;
        }
      }
      
      // Eğer hızlı eşleştirme başarısızsa, başlık bazlı OpenAI seçimi yap
      if (!selectedCategory) {
        console.log('⚠️ Hızlı eşleştirme başarısız, OpenAI başlık analizi yapılıyor...');
        
        // Kategori isimlerini al
        const categoryNames = availableCategories.map((cat: any) => cat.title || cat.name || '').filter(Boolean);
        
        try {
          if (categoryNames.length > 0 && process.env.OPENAI_API_KEY) {
            // OpenAI instance oluştur
            const openai = new OpenAI({
              apiKey: process.env.OPENAI_API_KEY,
            });

            // Basit ve temiz prompt
            const categoryPromptConfig = getPromptById('category-prompt');
            let prompt = categoryPromptConfig?.prompt || 'Select the best category for this product title.';
            
            // Replace variables
            prompt = prompt.replace('${title}', result.title);
            prompt = prompt.replace('${categoryNames}', categoryNames.join('\n'));

            // Hızlı OpenAI çağrısı
            const openaiResponse = await openai.chat.completions.create({
              model: "gpt-3.5-turbo",
              messages: [
                {
                  role: "user",
                  content: prompt
                }
              ],
              max_tokens: 50,
              temperature: 0.1,
            });

            const selectedCategoryName = openaiResponse.choices[0]?.message?.content?.trim();
            console.log(`🎯 OpenAI başlık bazlı kategori seçimi: "${selectedCategoryName}"`);
            
            // Eşleşme kontrolü
            if (selectedCategoryName && categoryNames.includes(selectedCategoryName)) {
              // Seçilen kategori adına göre kategori nesnesini bul
              const matchedCategory = availableCategories.find((cat: any) => 
                (cat.title || cat.name || '').toLowerCase() === selectedCategoryName.toLowerCase()
              );
              
              if (matchedCategory) {
                selectedCategory = matchedCategory;
                console.log(`✅ OpenAI kategorisi bulundu: "${matchedCategory.title || matchedCategory.name}"`);
              }
            }
          }
        } catch (error) {
          console.error('❌ OpenAI kategori seçimi hatası:', error);
        }
      }
      
      // GÜÇLÜ FALLBACK SİSTEMİ - Referans dosyadan alındı
      if (!selectedCategory) {
        console.log('⚠️ OpenAI kategori seçimi başarısız, güçlü keyword matching başlatılıyor...');
        
        const titleLower = result.title.toLowerCase();
        
        // Kapsamlı kategori eşleştirme anahtar kelimeleri
        const keywordMapping = {
          'animal': ['animal', 'lion', 'lioness', 'tiger', 'elephant', 'cat', 'dog', 'bird', 'wildlife', 'pet', 'fauna', 'wolf', 'bear', 'deer'],
          'religious': ['jesus', 'christ', 'religious', 'spiritual', 'sacred', 'divine', 'biblical', 'cross', 'angel', 'faith', 'prayer', 'holy'],
          'abstract': ['abstract', 'geometric', 'modern', 'contemporary', 'minimal', 'color field', 'expressionism'],
          'flower': ['flower', 'plant', 'leaf', 'tree', 'nature', 'botanical', 'floral', 'garden', 'rose'],
          'landscape': ['landscape', 'mountain', 'ocean', 'sunset', 'beach', 'sea', 'sky', 'forest'],
          'rothko': ['rothko', 'mark rothko', 'color field'],
          'love': ['love', 'heart', 'romance', 'couple'],
          'woman': ['woman', 'girl', 'lady', 'female', 'goddess', 'beauty'],
          'portrait': ['portrait', 'face', 'man', 'people', 'person', 'figure'],
          'modern': ['modern', 'fashion', 'contemporary', 'stylish'],
          'kitchen': ['kitchen', 'food', 'cooking', 'chef'],
          'surreal': ['surreal', 'dream', 'fantasy', 'psychedelic'],
          'erotic': ['erotic', 'nude', 'sensual', 'intimate']
        };
        
        // Başlıktaki anahtar kelimelere göre kategori bul
        for (const [categoryType, keywords] of Object.entries(keywordMapping)) {
          if (keywords.some(keyword => titleLower.includes(keyword))) {
            // Kategori adında veya anahtar kelimelerde eşleşme ara
            const categoryMatch = availableCategories.find((cat: any) => {
              if (!cat) return false;
              const categoryTitle = (cat.title || cat.name || '').toLowerCase();
              if (!categoryTitle) return false;
              
              // Kategori tipine göre eşleştir
              return categoryTitle.includes(categoryType) || 
                     keywords.some(k => categoryTitle.includes(k));
            });
            
            if (categoryMatch) {
              selectedCategory = categoryMatch;
              console.log(`✅ Keyword eşleşmesi: "${categoryType}" → "${categoryMatch.title || categoryMatch.name}"`);
              break;
            }
          }
        }
        
        // Hala eşleşme yoksa Modern kategori ara (fallback)
        if (!selectedCategory) {
          const modernCategory = availableCategories.find((cat: any) => {
            const catTitle = (cat.title || cat.name || '').toLowerCase();
            return catTitle.includes('modern') || 
                   catTitle.includes('fashion') || 
                   catTitle.includes('contemporary');
          });
          
          selectedCategory = modernCategory || availableCategories[0];
          console.log(`⚠️ Modern fallback kategori: "${selectedCategory?.title || selectedCategory?.name}"`);
        }
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