import { NextRequest, NextResponse } from 'next/server';
import { aiDigitalTitleTagSystem } from '@/lib/ai-digital-title-tag-system';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';
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
    
    // Templates artık force update edilmiyor - hız için devre dışı
    // await aiTitleTagSystem.forceUpdateTemplates();
    
    // FormData'dan image ve diğer parametreleri al
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    
    const categoriesRaw = formData.get('categories') as string;
    console.log('📨 FormData\'dan gelen kategoriler (raw):', categoriesRaw);
    
    let availableCategories = [];
    try {
      availableCategories = JSON.parse(categoriesRaw || '[]');
      console.log('✅ Kategoriler parse edildi:', availableCategories.length, 'adet');
      console.log('📋 Parse edilen kategoriler:', availableCategories.map((c: any) => c.title || c.name).join(', '));
    } catch (error) {
      console.error('❌ Kategoriler parse edilemedi:', error);
      availableCategories = [];
    }
    
    // GERÇEK KATEGORİLER VARSA ONLARI KULLAN!
    if (availableCategories.length === 0) {
      console.log('⚠️ Kategoriler boş, fallback liste kullanılıyor...');
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
    console.log('📋 Kategori listesi:', availableCategories.map((c: any) => c.title || c.name).join(', '));
    
    if (!imageFile) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }

    // Image'ı base64'e çevir
    const buffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    console.log('📸 Resim işlendi, AI analizi başlıyor...');

    // Use new AI Digital Title-Tag System for title and tags
    let result;
    try {
      result = await aiDigitalTitleTagSystem.generateTitleAndTags(base64);
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
            const prompt = `You are analyzing a DIGITAL DOWNLOAD product. Choose the best category:

TITLE: "${result.title}"

MANDATORY DIGITAL CATEGORIES (you MUST choose one of these):
1. Seasonal Digital - Fall & Halloween, Winter, Spring, Holiday decorations
2. Kids & Nursery Digital - Children art, Nursery decor, Baby themes, Classroom posters  
3. Nature Digital - Landscapes, Coastal scenes, Botanical prints, Flowers, Spring themes
4. Abstract Digital - Bauhaus style, Abstract patterns, Modern geometric shapes
5. Vintage & Rustic Digital - Farmhouse style, Still life, William Morris patterns, Tapestries
6. Typography Digital - Text art, Inspirational quotes, Custom typography, Word art
7. Animals Digital - Animal illustrations, Wildlife art, Butterfly art, Pet portraits
8. Minimalist Digital - Clean designs, Black & White art, Simple sketches, Nordic style
9. Travel & Culture Digital - Travel posters, Japanese art, Oriental themes, Cultural art
10. Home Decor Digital - Kitchen art, Bathroom prints, Frame TV art, Dorm decorations

CRITICAL RULES:
- This is a DIGITAL PRODUCT - you MUST choose a Digital category
- NEVER choose non-digital categories for digital products
- If no perfect match exists, return "CREATE: [New Category Name] Digital"
- Return ONLY the exact category name or CREATE command

Choose from the 10 digital categories above or suggest creating a new digital category.`;

            console.log('📤 OpenAI prompt gönderiliyor...');
            
            const openaiResponse = await openai.chat.completions.create({
              model: "gpt-4o-mini", // Daha hızlı ve ucuz model
              messages: [{ role: "user", content: prompt }],
              max_tokens: 50,
              temperature: 0.1,
            });

            const selectedCategoryName = openaiResponse.choices[0]?.message?.content?.trim();
            console.log(`🎯 DIGITAL AI seçimi: "${selectedCategoryName}"`);
            
            // Digital kategorilerin listesi
            const digitalCategories = [
              'Seasonal Digital',
              'Kids & Nursery Digital', 
              'Nature Digital',
              'Abstract Digital',
              'Vintage & Rustic Digital',
              'Typography Digital',
              'Animals Digital',
              'Minimalist Digital',
              'Travel & Culture Digital',
              'Home Decor Digital'
            ];
            
            // OpenAI'nin seçtiği kategori digital kategorilerden biri mi?
            const isDigitalCategory = digitalCategories.some(cat => 
              cat.toLowerCase() === selectedCategoryName?.toLowerCase()
            );
            
            if (isDigitalCategory) {
              console.log(`🎯 Digital kategori tespit edildi: "${selectedCategoryName}"`);
              
              // Bu digital kategori mevcut kategorilerde var mı kontrol et
              const existingCategory = availableCategories.find((cat: any) => 
                (cat.title || cat.name || '').toLowerCase() === selectedCategoryName?.toLowerCase()
              );
              
              if (!existingCategory) {
                console.log(`🆕 "${selectedCategoryName}" kategorisi yok, oluşturuluyor...`);
                
                try {
                console.log(`🔨 Digital kategori oluşturuluyor: "${selectedCategoryName}"`);
                
                // Etsy credentials'ları al
                initializeAdminApp();
                if (!adminDb) {
                  throw new Error('Database not initialized');
                }
                
                const userId = 'local-user-123';
                const storesSnapshot = await adminDb
                  .collection('etsy_stores')
                  .where('user_id', '==', userId)
                  .where('is_active', '==', true)
                  .get();
                
                if (storesSnapshot.empty) {
                  throw new Error('No active Etsy store found');
                }
                
                const storeDoc = storesSnapshot.docs[0];
                const shop_id = storeDoc.id;
                
                const apiKeysDoc = await adminDb.collection('etsy_api_keys').doc(shop_id).get();
                if (!apiKeysDoc.exists) {
                  throw new Error('API keys not found');
                }
                
                const { access_token } = apiKeysDoc.data()!;
                
                // Etsy API ile yeni shop section oluştur
                const createSectionResponse = await fetch(`https://api.etsy.com/v3/application/shops/${shop_id}/sections`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'x-api-key': process.env.ETSY_API_KEY!,
                    'Authorization': `Bearer ${access_token}`,
                  },
                  body: `title=${encodeURIComponent(selectedCategoryName || '')}`
                });
                
                if (createSectionResponse.ok) {
                  const newSection = await createSectionResponse.json();
                  const newSectionId = newSection.shop_section_id;
                  
                  console.log(`✅ Digital kategori oluşturuldu: "${selectedCategoryName}" (ID: ${newSectionId})`);
                  
                  // Yeni oluşturulan kategoriyi selectedCategory olarak ayarla
                  selectedCategory = {
                    shop_section_id: newSectionId,
                    title: selectedCategoryName
                  };
                  
                  // Cache'e de ekle (gelecek kullanımlar için)
                  availableCategories.push(selectedCategory);
                  
                  // IMPORTANT: Yeni oluşturulan kategoriyi result'a aktar
                  console.log(`🔄 Yeni kategori result objesine aktarılıyor...`);
                  if (result) {
                    result.shopSection = selectedCategory.shop_section_id;
                    result.shopSectionTitle = selectedCategory.title;
                    console.log(`✅ Result güncellendi: shopSection=${result.shopSection}, title="${result.shopSectionTitle}"`);
                  }
                  
                } else {
                  const errorText = await createSectionResponse.text();
                  console.error(`❌ Digital kategori oluşturma hatası: ${createSectionResponse.status}`, errorText);
                  
                  // Eğer "already exists" hatası ise, kategoriyi fresh fetch et
                  if (createSectionResponse.status === 400 && errorText.includes('already have a shop section')) {
                    console.log(`🔄 "${selectedCategoryName}" zaten mevcut, taze cache yükleniyor...`);
                    
                    try {
                      // Fresh shop sections fetch et
                      const freshSectionsResponse = await fetch(`https://api.etsy.com/v3/application/shops/${shop_id}/sections`, {
                        headers: {
                          'x-api-key': process.env.ETSY_API_KEY!,
                          'Authorization': `Bearer ${access_token}`,
                        }
                      });
                      
                      if (freshSectionsResponse.ok) {
                        const freshSections = await freshSectionsResponse.json();
                        
                        // Yeni oluşturulan kategoriyi bul
                        const foundSection = freshSections.results?.find((section: any) =>
                          section.title.toLowerCase() === selectedCategoryName?.toLowerCase()
                        );
                        
                        if (foundSection) {
                          selectedCategory = {
                            shop_section_id: foundSection.shop_section_id,
                            title: foundSection.title
                          };
                          
                          console.log(`✅ Fresh fetch'ten kategori bulundu: "${foundSection.title}" (ID: ${foundSection.shop_section_id})`);
                          
                          // IMPORTANT: Result'a aktar
                          if (result) {
                            result.shopSection = selectedCategory.shop_section_id;
                            result.shopSectionTitle = selectedCategory.title;
                            console.log(`✅ Fresh kategori result'a aktarıldı: shopSection=${result.shopSection}, title="${result.shopSectionTitle}"`);
                          }
                        }
                      }
                    } catch (freshError) {
                      console.error('❌ Fresh sections fetch hatası:', freshError);
                    }
                  }
                  
                  if (!selectedCategory) {
                    console.log(`🔍 Fallback - Mevcut kategorilerden uygun olan seçilecek...`);
                  }
                }
              } catch (createError) {
                console.error('❌ Digital kategori oluşturma hatası:', createError);
                console.log(`🔍 Fallback - Mevcut kategorilerden uygun olan seçilecek...`);
              }
              } else {
                // Digital kategori zaten var, onu seç
                selectedCategory = existingCategory;
                console.log(`✅ Digital kategori mevcut: "${existingCategory.title || existingCategory.name}" (ID: ${existingCategory.shop_section_id})`);
                
                // IMPORTANT: Mevcut kategoriyi result'a aktar
                if (result) {
                  result.shopSection = selectedCategory.shop_section_id;
                  result.shopSectionTitle = selectedCategory.title;
                  console.log(`✅ Mevcut kategori result'a aktarıldı: shopSection=${result.shopSection}, title="${result.shopSectionTitle}"`);
                }
              }
            } else {
              console.log(`⚠️ "${selectedCategoryName}" digital kategori değil, fallback yapılıyor...`);
            }
            
            // Kategori bul - Debug detayları
            console.log(`🔍 DIGITAL AI seçimi debug:`, {
              openai_response: selectedCategoryName,
              is_digital_category: isDigitalCategory,
              available_categories: availableCategories.map((cat: any) => cat.title || cat.name),
              exact_match_check: selectedCategoryName?.toLowerCase()
            });
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

    // Add shopSection info to result if available
    const responseData = {
      success: true,
      title: result.title,
      tags: result.tags,
      analysis,
      category: selectedCategory,
      suggestedCategoryId: categoryId,
      processing_time: totalTime,
      ai_system: 'firebase_enhanced',
      description: result.description || '',
      ...(result.shopSection && {
        shopSection: result.shopSection,
        shopSectionTitle: result.shopSectionTitle
      }),
      results: {
        title: result.title,
        tags: result.tags.join(', '),
        analysis,
        category: selectedCategory,
        processing_time: totalTime,
        ai_system: 'firebase_enhanced',
        description: result.description || '',
        ...(result.shopSection && {
          shopSection: result.shopSection,
          shopSectionTitle: result.shopSectionTitle
        })
      }
    };

    console.log(`🔥 DIGITAL API Response sending:`, {
      shopSection: result.shopSection,
      shopSectionTitle: result.shopSectionTitle,
      hasShopSection: !!result.shopSection
    });

    return NextResponse.json(responseData);

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