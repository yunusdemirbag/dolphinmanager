import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getPromptById } from '@/lib/prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { title, categoryNames } = await request.json();

    if (!title || !categoryNames || !Array.isArray(categoryNames)) {
      return NextResponse.json({ error: 'Title and categoryNames array are required' }, { status: 400 });
    }

    console.log(`🎯 TEMİZ OpenAI kategori seçimi: "${title}"`);
    console.log(`📋 Mevcut kategoriler: ${categoryNames.join(', ')}`);

    // OpenAI API key kontrol
    if (!process.env.OPENAI_API_KEY) {
      const modernCategory = categoryNames.find(cat => 
        cat.toLowerCase().includes('modern') || 
        cat.toLowerCase().includes('fashion') ||
        cat.toLowerCase().includes('contemporary')
      );
      
      const noKeyFallback = modernCategory || categoryNames[0] || 'Abstract Art';
      console.log(`⚠️ OpenAI API key yok, Modern fallback: "${noKeyFallback}"`);
      return new Response(noKeyFallback, {
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Basit ve temiz prompt
    const categoryPromptConfig = getPromptById('category-prompt');
    let prompt = categoryPromptConfig?.prompt || 'Select the best category for this product title.';
    
    // Replace variables
    prompt = prompt.replace('${title}', title);
    prompt = prompt.replace('${categoryNames}', categoryNames.join('\n'));

    // Hızlı OpenAI çağrısı
    const response = await openai.chat.completions.create({
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

    const selectedCategory = response.choices[0]?.message?.content?.trim();
    const duration = Date.now() - startTime;
    
    console.log(`🤖 OpenAI seçimi (${duration}ms): "${selectedCategory}"`);
    
    // Eşleşme kontrolü
    if (selectedCategory && categoryNames.includes(selectedCategory)) {
      return new Response(selectedCategory, {
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    // Fallback: Modern kategorisi ara, yoksa Modern'e yakın kategoriye at
    const modernCategory = categoryNames.find(cat => 
      cat.toLowerCase().includes('modern') || 
      cat.toLowerCase().includes('fashion') ||
      cat.toLowerCase().includes('contemporary')
    );
    
    const fallbackCategory = modernCategory || categoryNames[0] || 'Abstract Art';
    console.log(`⚠️ Eşleşme yok, Modern fallback: "${fallbackCategory}"`);
    return new Response(fallbackCategory, {
      headers: { 'Content-Type': 'text/plain' }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Kategori seçimi hatası (${duration}ms):`, error);
    
    // Hata durumunda Modern kategori ara
    try {
      const { categoryNames } = await request.json();
      const modernCategory = categoryNames?.find(cat => 
        cat.toLowerCase().includes('modern') || 
        cat.toLowerCase().includes('fashion') ||
        cat.toLowerCase().includes('contemporary')
      );
      
      const errorFallback = modernCategory || categoryNames?.[0] || 'Abstract Art';
      console.log(`💥 Hata fallback - Modern kategori: "${errorFallback}"`);
      return new Response(errorFallback, {
        headers: { 'Content-Type': 'text/plain' }
      });
    } catch {
      return new Response('Abstract Art', {
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
}