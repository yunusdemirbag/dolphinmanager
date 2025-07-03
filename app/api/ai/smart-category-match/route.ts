import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface CategoryMatch {
  category_id: number;
  category_name: string;
  confidence: number;
  reasoning: string;
}

export async function POST(request: NextRequest) {
  try {
    const { title, shopId } = await request.json();
    
    if (!title || !shopId) {
      return NextResponse.json({ error: 'Title ve shopId gerekli' }, { status: 400 });
    }

    console.log(`🧠 AI kategori eşleştirme başlıyor - Title: "${title}", ShopId: ${shopId}`);
    
    initializeAdminApp();
    if (!adminDb) {
      throw new Error('Firebase Admin başlatılamadı');
    }

    // 1. Canvas kategorilerini cache'den al
    const canvasCategoriesDoc = await adminDb.collection('canvas_categories').doc(shopId).get();
    
    if (!canvasCategoriesDoc.exists) {
      console.log('⚠️ Canvas kategorileri cache\'de yok, otomatik setup tetikleniyor...');
      
      // Auto setup'ı tetikle
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      await fetch(`${baseUrl}/api/etsy/auto-setup-store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId })
      });
      
      return NextResponse.json({ 
        error: 'Canvas kategorileri yükleniyor, lütfen birkaç saniye bekleyip tekrar deneyin.',
        code: 'CATEGORIES_LOADING'
      }, { status: 202 });
    }

    const canvasData = canvasCategoriesDoc.data()!;
    const canvasCategories = canvasData.categories || [];
    
    if (canvasCategories.length === 0) {
      return NextResponse.json({ error: 'Canvas kategorileri bulunamadı' }, { status: 404 });
    }

    console.log(`📋 ${canvasCategories.length} Canvas kategorisi bulundu, AI analizi başlıyor...`);

    // 2. AI ile kategori eşleştirme
    const categoryMatch = await matchCategoryWithAI(title, canvasCategories);
    
    if (!categoryMatch) {
      return NextResponse.json({ error: 'Uygun kategori bulunamadı' }, { status: 404 });
    }

    // 3. Sonucu kaydet (öğrenme için)
    await saveCategoryMatchResult(shopId, title, categoryMatch);
    
    return NextResponse.json({
      success: true,
      match: categoryMatch,
      availableCategories: canvasCategories.length
    });

  } catch (error) {
    console.error('❌ AI kategori eşleştirme hatası:', error);
    return NextResponse.json(
      { error: 'Kategori eşleştirme başarısız: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata') },
      { status: 500 }
    );
  }
}

async function matchCategoryWithAI(title: string, categories: any[]): Promise<CategoryMatch | null> {
  try {
    const categoryList = categories.map(cat => `${cat.id}: ${cat.name}`).join('\n');
    
    const prompt = `
# CANVAS WALL ART KATEGORI EŞLEŞTİRME

## ÜRÜN BAŞLIĞI
"${title}"

## MEVCUT CANVAS KATEGORİLERİ
${categoryList}

## GÖREV
Yukarıdaki ürün başlığını analiz et ve en uygun Canvas/Wall Art kategorisini seç.

## KRİTERLER
1. Başlıktaki anahtar kelimeler (canvas, wall art, print, painting, poster, decor)
2. Stil türü (abstract, modern, vintage, contemporary)
3. Ürün tipi (wall hanging, art print, canvas art)
4. Tema (home decor, wall decor, artwork)

## CEVAP FORMATI
Sadece JSON formatında yanıt ver:
{
  "category_id": [seçilen_kategori_id],
  "category_name": "[kategori_adı]",
  "confidence": [0.0-1.0_arası_güven_skoru],
  "reasoning": "[kısa_açıklama]"
}

## ÖRNEK
{
  "category_id": 1027,
  "category_name": "Wall Hangings",
  "confidence": 0.95,
  "reasoning": "Canvas wall art başlığı wall hangings kategorisine tam uygun"
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.1
    });

    const responseText = response.choices[0]?.message?.content?.trim();
    
    if (!responseText) {
      throw new Error('AI yanıt vermedi');
    }

    // JSON parse et
    const categoryMatch: CategoryMatch = JSON.parse(responseText);
    
    // Güvenlik kontrolü: seçilen kategori listede var mı?
    const selectedCategory = categories.find(cat => cat.id === categoryMatch.category_id);
    
    if (!selectedCategory) {
      throw new Error('AI geçersiz kategori seçti');
    }

    console.log(`✅ AI kategori seçti: ${categoryMatch.category_name} (Güven: ${categoryMatch.confidence})`);
    
    return categoryMatch;
    
  } catch (error) {
    console.error('❌ AI kategori eşleştirme hatası:', error);
    return null;
  }
}

async function saveCategoryMatchResult(shopId: string, title: string, match: CategoryMatch) {
  try {
    await adminDb.collection('ai_category_matches').add({
      shop_id: shopId,
      title,
      matched_category_id: match.category_id,
      matched_category_name: match.category_name,
      confidence: match.confidence,
      reasoning: match.reasoning,
      created_at: new Date()
    });
    
    console.log('✅ Kategori eşleştirme sonucu kaydedildi');
    
  } catch (error) {
    console.error('❌ Kategori eşleştirme sonucu kaydedilemedi:', error);
  }
}