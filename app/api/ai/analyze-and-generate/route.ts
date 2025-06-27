import { NextRequest, NextResponse } from 'next/server';
import { aiTitleTagSystem } from '@/lib/ai-title-tag-system';
import { initializeAdminApp } from '@/lib/firebase-admin';

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
      // Log kategori verilerinin yapısını görmek için
      console.log('📋 Gelen kategoriler:', JSON.stringify(availableCategories.slice(0, 2)));
      
      try {
        // OpenAI API ile kategori seçimi yap
        console.log('🧠 OpenAI API ile kategori seçimi yapılıyor...');
        
        // Kategori isimlerini al
        const categoryNames = availableCategories.map((cat: any) => cat.title || cat.name || '').filter(Boolean);
        
        if (categoryNames.length > 0) {
          // OpenAI API'ye istek gönder
          const response = await fetch('/api/ai/select-category', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: result.title,
              categoryNames
            }),
          });
          
          if (response.ok) {
            const selectedCategoryName = await response.text();
            console.log(`🎯 OpenAI kategori seçimi: "${selectedCategoryName}"`);
            
            // Seçilen kategori adına göre kategori nesnesini bul
            const matchedCategory = availableCategories.find((cat: any) => 
              (cat.title || cat.name || '').toLowerCase() === selectedCategoryName.toLowerCase()
            );
            
            if (matchedCategory) {
              selectedCategory = matchedCategory;
              console.log(`✅ Kategori eşleşmesi bulundu: "${matchedCategory.title || matchedCategory.name}"`);
            } else {
              console.log(`⚠️ OpenAI'nin seçtiği kategori bulunamadı: "${selectedCategoryName}"`);
            }
          } else {
            console.error('❌ OpenAI kategori seçimi hatası:', await response.text());
          }
        }
      } catch (error) {
        console.error('❌ OpenAI kategori seçimi hatası:', error);
      }
      
      // OpenAI ile seçim başarısız olduysa fallback olarak anahtar kelime eşleştirmesi kullan
      if (!selectedCategory) {
        console.log('⚠️ OpenAI kategori seçimi başarısız, anahtar kelime eşleştirmesine geçiliyor...');
        
        // Enhanced category matching based on title/category
        const titleLower = result.title.toLowerCase();
        
        // Daha kapsamlı kategori eşleştirme anahtar kelimeleri
        const keywordMapping = {
          'abstract': ['abstract', 'geometric', 'modern', 'contemporary', 'minimal', 'rothko', 'color field', 'expressionism', 'non-representational'],
          'animal': ['animal', 'pet', 'cat', 'dog', 'bird', 'wildlife', 'fauna'],
          'botanical': ['flower', 'plant', 'leaf', 'tree', 'nature', 'botanical', 'floral', 'garden'],
          'landscape': ['landscape', 'mountain', 'ocean', 'sunset', 'beach', 'sea', 'sky', 'forest'],
          'portrait': ['portrait', 'face', 'woman', 'man', 'people', 'person', 'figure'],
          'religious': ['jesus', 'christ', 'religious', 'spiritual', 'sacred', 'divine', 'biblical', 'cross', 'angel', 'faith', 'prayer'],
          'minimalist': ['minimalist', 'simple', 'clean', 'minimal', 'line art'],
          'typography': ['text', 'quote', 'word', 'typography', 'lettering', 'saying'],
          'geometric': ['geometric', 'shape', 'pattern', 'circle', 'square', 'triangle']
        };
        
        // Önce başlıktaki anahtar kelimelere göre kategori bul
        let matchFound = false;
        for (const [categoryType, keywords] of Object.entries(keywordMapping)) {
          if (keywords.some(keyword => titleLower.includes(keyword))) {
            // Kategori adında veya anahtar kelimelerde eşleşme ara
            // Kategori yapısını doğru şekilde kontrol et
            const categoryMatch = availableCategories.find((cat: any) => {
              // Kategori yapısını kontrol et
              if (!cat) return false;
              
              // Kategori adı title veya name alanında olabilir
              const categoryTitle = cat.title || cat.name || '';
              
              if (!categoryTitle) return false;
              
              return (
                categoryTitle.toLowerCase().includes(categoryType) ||
                keywords.some(k => categoryTitle.toLowerCase().includes(k))
              );
            });
            
            if (categoryMatch) {
              selectedCategory = categoryMatch;
              matchFound = true;
              console.log(`✅ Anahtar kelime kategori eşleşmesi bulundu: "${categoryMatch.title || categoryMatch.name}" (anahtar kelime: ${categoryType})`);
              break;
            }
          }
        }
        
        // Eşleşme bulunamazsa, doğrudan başlık-kategori adı eşleştirmesi dene
        if (!matchFound) {
          const directMatch = availableCategories.find((cat: any) => {
            if (!cat) return false;
            const categoryTitle = cat.title || cat.name || '';
            if (!categoryTitle) return false;
            return titleLower.includes(categoryTitle.toLowerCase());
          });
          
          if (directMatch) {
            selectedCategory = directMatch;
            console.log(`✅ Doğrudan kategori eşleşmesi bulundu: "${directMatch.title || directMatch.name}"`);
          }
        }
        
        // Hala eşleşme yoksa ilk kategoriyi seç
        if (!selectedCategory && availableCategories.length > 0) {
          selectedCategory = availableCategories[0];
          console.log(`⚠️ Kategori eşleşmesi bulunamadı, varsayılan kategori seçildi: "${availableCategories[0].title || availableCategories[0].name}"`);
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