import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { title, shopId } = await request.json();
    
    if (!title || !shopId) {
      return NextResponse.json({
        success: false,
        error: 'Title and shopId are required'
      }, { status: 400 });
    }

    console.log('🧠 AI kategori eşleştirme başlıyor:', { title, shopId });

    // Firebase Admin'i initialize et
    initializeAdminApp();
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    // Kategori tipi tanımı
    interface ShopSection {
      shop_section_id: number;
      title: string;
      rank?: number;
      active_listing_count?: number;
    }
    
    // Mevcut kategorileri cache'den veya API'den al
    let categories: ShopSection[] = [];
    
    // API anahtarlarını al
    const apiKeysDoc = await adminDb.collection('etsy_api_keys').doc(shopId).get();
    if (apiKeysDoc.exists) {
      const { access_token, api_key } = apiKeysDoc.data()!;
      
      // Etsy API'den kategorileri al
      const response = await fetch(`https://openapi.etsy.com/v3/application/shops/${shopId}/sections`, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'x-api-key': api_key,
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        categories = data.results || [];
        console.log(`📂 ${categories.length} kategori bulundu`);
      }
    }

    // AI ile kategori eşleştirme yap
    const titleLower = title.toLowerCase();
    let selectedCategory = null;

    // Gelişmiş anahtar kelime bazlı kategori eşleştirme
    const categoryKeywords = [
      { keywords: ['woman', 'women', 'female', 'girl', 'lady', 'feminine'], categoryName: 'Woman Art' },
      { keywords: ['abstract', 'geometric', 'modern', 'contemporary', 'minimalist'], categoryName: 'Abstract Art' },
      { keywords: ['love', 'heart', 'romantic', 'valentine', 'couples', 'romance'], categoryName: 'Love Art' },
      { keywords: ['flower', 'floral', 'rose', 'botanical', 'roses', 'garden', 'bloom'], categoryName: 'Flowers Art' },
      { keywords: ['landscape', 'mountain', 'nature', 'forest', 'scenery', 'outdoor', 'sunset', 'sunrise'], categoryName: 'Landscape Art' },
      { keywords: ['animal', 'cat', 'dog', 'bird', 'wildlife', 'pet', 'fauna', 'zoo'], categoryName: 'Animal Art' },
      { keywords: ['rothko', 'color field', 'mark rothko'], categoryName: 'Mark Rothko Art Print' },
      { keywords: ['surreal', 'surrealism', 'dream', 'fantasy', 'psychedelic', 'mystical'], categoryName: 'Surreal Canvas Art' },
      { keywords: ['banksy', 'graffiti', 'street art', 'urban', 'spray', 'stencil'], categoryName: 'Banksy & Graffiti Art' },
      { keywords: ['music', 'dance', 'musical', 'instrument', 'melody', 'rhythm', 'concert'], categoryName: 'Music & Dance Art' },
      { keywords: ['ethnic', 'cultural', 'tribal', 'traditional', 'folk', 'native'], categoryName: 'Ethnic Art' },
      { keywords: ['religious', 'spiritual', 'sacred', 'divine', 'holy', 'faith', 'prayer'], categoryName: 'Religious Art' },
      { keywords: ['peacock', 'bird', 'feather', 'colorful bird', 'exotic'], categoryName: 'Peacock Art' },
      { keywords: ['kitchen', 'cooking', 'food', 'culinary', 'chef', 'recipe', 'dining'], categoryName: 'Kitchen Art' },
      { keywords: ['buddha', 'zen', 'meditation', 'peaceful', 'stones', 'spiritual', 'yoga'], categoryName: 'Buddha and Zen Stones' },
      { keywords: ['oil painting', 'classical', 'traditional painting', 'realistic', 'impressionist'], categoryName: 'Oil Painting' },
      { keywords: ['gothic', 'dark', 'skeleton', 'skull', 'spooky', 'alternative', 'horror', 'halloween'], categoryName: 'Gothic Art' },
      { keywords: ['black', 'dark aesthetic', 'alternative', 'emo', 'punk', 'rock'], categoryName: 'Dark Art' },
      { keywords: ['ocean', 'sea', 'beach', 'waves', 'marine', 'nautical', 'coastal'], categoryName: 'Ocean Art' },
      { keywords: ['city', 'urban', 'skyline', 'building', 'architecture', 'metropolitan'], categoryName: 'City Art' },
      { keywords: ['vintage', 'retro', 'antique', 'classic', 'old', 'nostalgic'], categoryName: 'Vintage Art' },
      { keywords: ['minimalist', 'minimal', 'simple', 'clean', 'nordic', 'scandinavian'], categoryName: 'Minimalist Art' },
      { keywords: ['bohemian', 'boho', 'hippie', 'gypsy', 'free spirit'], categoryName: 'Bohemian Art' },
      { keywords: ['tropical', 'palm', 'exotic', 'jungle', 'paradise', 'island'], categoryName: 'Tropical Art' },
      { keywords: ['space', 'galaxy', 'universe', 'cosmic', 'stars', 'planet', 'astronaut'], categoryName: 'Space Art' },
      { keywords: ['coffee', 'cafe', 'espresso', 'latte', 'barista'], categoryName: 'Coffee Art' },
      { keywords: ['wine', 'vineyard', 'grape', 'alcohol', 'bar'], categoryName: 'Wine Art' },
      { keywords: ['travel', 'adventure', 'journey', 'destination', 'explore'], categoryName: 'Travel Art' },
      { keywords: ['sport', 'sports', 'athlete', 'fitness', 'gym', 'workout'], categoryName: 'Sports Art' },
      { keywords: ['car', 'vehicle', 'automotive', 'racing', 'motor'], categoryName: 'Car Art' },
      { keywords: ['motorcycle', 'bike', 'biker', 'harley', 'chopper'], categoryName: 'Motorcycle Art' },
      { keywords: ['christmas', 'xmas', 'holiday', 'santa', 'winter'], categoryName: 'Christmas Art' },
      { keywords: ['map', 'world', 'geography', 'continent', 'country'], categoryName: 'Map Art' },
      { keywords: ['quote', 'text', 'typography', 'words', 'saying', 'motivational'], categoryName: 'Quote Art' },
      { keywords: ['kids', 'child', 'children', 'baby', 'nursery', 'playroom'], categoryName: 'Kids Art' },
      { keywords: ['teen', 'teenager', 'youth', 'young'], categoryName: 'Teen Art' },
      { keywords: ['fantasy', 'magic', 'fairy', 'dragon', 'unicorn', 'mythical'], categoryName: 'Fantasy Art' },
      { keywords: ['gaming', 'gamer', 'video game', 'console', 'esports'], categoryName: 'Gaming Art' },
      { keywords: ['anime', 'manga', 'japanese', 'otaku', 'kawaii'], categoryName: 'Anime Art' },
      { keywords: ['movie', 'film', 'cinema', 'hollywood', 'actor'], categoryName: 'Movie Art' },
      { keywords: ['tv', 'television', 'series', 'show', 'netflix'], categoryName: 'TV Series Art' },
      { keywords: ['superhero', 'marvel', 'dc', 'comic', 'hero'], categoryName: 'Superhero Art' },
      { keywords: ['fashion', 'style', 'clothing', 'designer', 'model'], categoryName: 'Fashion Art' },
      { keywords: ['beauty', 'makeup', 'cosmetic', 'glamour'], categoryName: 'Beauty Art' },
      { keywords: ['yoga', 'pilates', 'wellness', 'health', 'mindfulness'], categoryName: 'Yoga Art' },
      { keywords: ['science', 'chemistry', 'physics', 'biology', 'math'], categoryName: 'Science Art' },
      { keywords: ['technology', 'tech', 'digital', 'computer', 'ai'], categoryName: 'Technology Art' },
      { keywords: ['money', 'dollar', 'currency', 'finance', 'wealth'], categoryName: 'Money Art' }
    ];

    // Anahtar kelimelere göre en uygun kategoriyi bul
    let bestMatch = null;
    let maxMatchCount = 0;

    for (const rule of categoryKeywords) {
      const matchCount = rule.keywords.filter(keyword => titleLower.includes(keyword)).length;
      if (matchCount > maxMatchCount) {
        maxMatchCount = matchCount;
        bestMatch = rule.categoryName;
      }
    }

    // Eğer eşleşme bulunduysa, mevcut kategorilerde ara
    if (bestMatch) {
      selectedCategory = categories.find(section => 
        section.title.toLowerCase() === bestMatch.toLowerCase() ||
        section.title.toLowerCase().includes(bestMatch.toLowerCase()) ||
        bestMatch.toLowerCase().includes(section.title.toLowerCase())
      );

      if (selectedCategory) {
        console.log(`✅ Mevcut kategori bulundu: "${selectedCategory.title}" (ID: ${selectedCategory.shop_section_id})`);
        
        return NextResponse.json({
          success: true,
          match: {
            category_id: selectedCategory.shop_section_id,
            category_name: selectedCategory.title,
            confidence: 0.9,
            method: 'exact_match'
          }
        });
      } else {
        console.log(`🆕 Kategori mevcut değil, yeni oluşturulacak: "${bestMatch}"`);
        
        // Yeni kategori oluştur
        const apiKeysDoc = await adminDb.collection('etsy_api_keys').doc(shopId).get();
        if (apiKeysDoc.exists) {
          const { access_token, api_key } = apiKeysDoc.data()!;
          
          const formData = new FormData();
          formData.append('title', bestMatch);
          
          const createResponse = await fetch(`https://openapi.etsy.com/v3/application/shops/${shopId}/sections`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'x-api-key': api_key,
            },
            body: formData,
          });
          
          if (createResponse.ok) {
            const newCategory = await createResponse.json();
            console.log(`✅ Yeni kategori oluşturuldu: "${newCategory.title}" (ID: ${newCategory.shop_section_id})`);
            
            // Cache'i temizle ki yeni kategori görünsün
            try {
              // 1. Server-side cache temizle
              const SECTIONS_CACHE_KEY = `shop_sections_${shopId}`;
              await adminDb.collection('sections_cache').doc(SECTIONS_CACHE_KEY).delete();
              console.log('✅ Server-side kategori cache temizlendi');
            } catch (cacheError) {
              console.error('⚠️ Cache temizleme hatası (işleme devam edilecek):', cacheError);
            }
            
            return NextResponse.json({
              success: true,
              match: {
                category_id: newCategory.shop_section_id,
                category_name: newCategory.title,
                confidence: 0.9,
                method: 'created_new',
                created: true
              }
            });
          } else {
            // Oluşturma başarısız olduysa (muhtemelen aynı isimde var), tekrar ara
            const searchResponse = await fetch(`https://openapi.etsy.com/v3/application/shops/${shopId}/sections`, {
              headers: {
                'Authorization': `Bearer ${access_token}`,
                'x-api-key': api_key,
              }
            });
            
            if (searchResponse.ok) {
              const searchData = await searchResponse.json();
              const existingCategory = searchData.results?.find((s: ShopSection) =>
                s.title.toLowerCase() === bestMatch.toLowerCase()
              );
              
              if (existingCategory) {
                console.log(`✅ Mevcut kategori bulundu (ikinci deneme): "${existingCategory.title}"`);
                return NextResponse.json({
                  success: true,
                  match: {
                    category_id: existingCategory.shop_section_id,
                    category_name: existingCategory.title,
                    confidence: 0.9,
                    method: 'found_existing'
                  }
                });
              }
            }
          }
        }
      }
    }

    // Eğer hiçbir eşleşme yoksa veya kategori oluşturulamadıysa, Modern Art'ı seç
    const fallbackCategory = categories.find((s: ShopSection) =>
      s.title.toLowerCase().includes('modern') ||
      s.title.toLowerCase().includes('abstract')
    );

    if (fallbackCategory) {
      console.log(`🔄 Fallback kategori seçildi: "${fallbackCategory.title}"`);
      
      return NextResponse.json({
        success: true,
        match: {
          category_id: fallbackCategory.shop_section_id,
          category_name: fallbackCategory.title,
          confidence: 0.5,
          method: 'fallback'
        }
      });
    }

    // Hiçbir şey bulunamazsa
    return NextResponse.json({
      success: false,
      error: 'Uygun kategori bulunamadı ve oluşturulamadı'
    });

  } catch (error) {
    console.error('❌ AI kategori eşleştirme hatası:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Kategori eşleştirme hatası'
    }, { status: 500 });
  }
}