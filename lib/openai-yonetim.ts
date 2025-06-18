// openai-yonetim.ts
import { createClientFromBrowser } from "@/lib/supabase/client";

export interface PromptConfig {
  id: string;
  name: string;
  description: string;
  prompt: string;
  defaultPrompt?: string;
}

// Kullanıcı AI ayarları interface'i
export interface AISettings {
  model: string;
  temperature: number;
  title_prompt: string | null;
  tags_prompt: string | null;
  category_prompt: string | null;
  focus_title_prompt: string | null;
}

/**
 * TITLE PROMPT - US & GLOBAL MARKET OPTIMIZED
 * Fiziksel canvas duvar sanatı için US ve global pazar odaklı Etsy başlık üretimi
 */
export const titlePrompt: PromptConfig = {
  id: "title_prompt",
  name: "Başlık Üretimi Promptu",
  description: "Etsy ürün başlığı üretmek için kullanılan prompt",
  prompt: `Sen bir Etsy uzmanısın ve canvas duvar sanatı ürünleri için SEO dostu başlıklar oluşturuyorsun.

Bu görseldeki canvas duvar sanatı için satışları artıracak, SEO dostu bir başlık oluştur.

Başlık şu özelliklere sahip olmalı:
• 80-100 karakter uzunluğunda
• İlk harfler büyük
• Anahtar kelimeler başlığın başında
• Çekici ve ilgi çekici
• Ürünün ana özelliklerini içermeli
• Duvar sanatı, canvas tablo, dekorasyon gibi anahtar kelimeler kullanılmalı
• Renkleri, stili ve temayı belirtmeli
• Boyut bilgisi EKLENME

Başlık şunları İÇERMEMELİ:
• Emoji veya özel karakterler
• Aşırı tekrarlanan kelimeler
• "Satılık", "Özel", "Etsy'de" gibi gereksiz ifadeler
• Fiyat, indirim veya promosyon bilgileri
• Başlık ve sonunda noktalama işaretleri

ÖRNEKLER:
✓ "Minimalist Soyut Canvas Tablo Mavi Beyaz Geometrik Duvar Sanatı Modern Ev Dekorasyonu"
✓ "Vintage Botanik Çiçek Koleksiyonu Canvas Duvar Sanatı Yatak Odası Dekorasyonu"
✓ "Modern Soyut Manzara Canvas Tablo Turkuaz Altın Duvar Sanatı Oturma Odası Dekor"

Görseli dikkatle incele ve şunlara dikkat et:
• Renk şeması ve tonlar
• Sanat stili (soyut, minimalist, gerçekçi, vb.)
• Ana temalar ve motifler
• Duygu ve atmosfer
• BE SPECIFIC about cultural, historical, and artistic elements

Return ONLY the final title string, nothing else.`.trim(),
};

/**
 * TAG PROMPT - US & GLOBAL MARKET OPTIMIZED  
 * 13 adet US ve global pazar odaklı SEO optimize tag üretimi
 */
export const tagPrompt: PromptConfig = {
  id: "tags_prompt",
  name: "Etiket Üretimi Promptu",
  description: "Etsy etiketleri üretmek için kullanılan prompt",
  prompt: `Sen bir Etsy uzmanısın ve canvas duvar sanatı ürünleri için etkili etiketler oluşturuyorsun.

Bu ürün için 13 adet etkili Etsy etiketi oluştur.

Ürün başlığı: "{{TITLE}}"

Etiketler şu özelliklere sahip olmalı:
• Her etiket en fazla 20 karakter
• Tümü küçük harf
• İngilizce olmalı
• Başlığın ana temalarını yansıtmalı
• Arama hacmi yüksek anahtar kelimeler içermeli
• Duvar sanatı, canvas, dekorasyon ile ilgili terimler içermeli
• Renk, stil, tema etiketleri ekle
• Oda türü etiketleri ekle (bedroom decor, living room art vb.)
• Sanat stili etiketleri ekle (abstract, minimalist, modern vb.)

Etiketler şunları İÇERMEMELİ:
• Tekrarlanan kelimeler
• Çok genel terimler
• Çok spesifik/nadir aranan terimler
• Etsy'nin yasakladığı terimler (handmade, custom vb.)
• Emoji veya özel karakterler

Etiketleri virgülle ayırarak tek bir satır halinde döndür.
Örnek format: "wall art, canvas print, abstract art, blue decor, minimalist, modern, living room, home decor, wall decor, bedroom art, office decor, geometric, art print"

SADECE etiketleri virgülle ayrılmış şekilde döndür, başka açıklama ekleme.`.trim(),
};

/**
 * CATEGORY SELECTION PROMPT - US & GLOBAL OPTIMIZED
 * US pazar analizi ile en uygun kategori seçimi
 */
export const categoryPrompt: PromptConfig = {
  id: "category_prompt",
  name: "Kategori Seçimi Promptu",
  description: "Canvas kategorisini seçmek için kullanılan prompt",
  prompt: `Sen bir kategori seçim uzmanısın. Verilen ürün başlığına göre en uygun kategoriyi seçmen gerekiyor.

Aşağıdaki kategoriler arasından SEÇİM YAP:
{{CATEGORIES}}

Ürün başlığı: "{{TITLE}}"

Lütfen sadece yukarıdaki listeden BİR kategori seç ve SADECE kategori adını yaz, başka açıklama ekleme.
Eğer emin değilsen, en yakın kategoriyi seç.`.trim(),
};

/**
 * FOCUS TITLE GENERATION PROMPT - US & GLOBAL OPTIMIZED
 * US pazar odaklı anahtar kelime entegrasyonu
 */
export const focusTitlePrompt: PromptConfig = {
  id: "focus_title_prompt",
  name: "Odaklı Başlık Üretimi Promptu",
  description: "Belirli bir anahtar kelimeye odaklanarak Etsy ürün başlığı üretmek için kullanılan prompt",
  prompt: `Sen bir Etsy uzmanısın ve canvas duvar sanatı ürünleri için SEO dostu başlıklar oluşturuyorsun.

Bu görseldeki canvas duvar sanatı için satışları artıracak, SEO dostu bir başlık oluştur.
Başlıkta mutlaka şu anahtar kelimeyi kullan ve başlığın başına yerleştir: "{{FOCUS_KEYWORD}}"

Başlık şu özelliklere sahip olmalı:
• 80-100 karakter uzunluğunda
• İlk harfler büyük
• Anahtar kelimeler başlığın başında (özellikle focus keyword)
• Çekici ve ilgi çekici
• Ürünün ana özelliklerini içermeli
• Duvar sanatı, canvas tablo, dekorasyon gibi anahtar kelimeler kullanılmalı
• Renkleri, stili ve temayı belirtmeli
• Boyut bilgisi EKLENME

Başlık şunları İÇERMEMELİ:
• Emoji veya özel karakterler
• Aşırı tekrarlanan kelimeler
• "Satılık", "Özel", "Etsy'de" gibi gereksiz ifadeler
• Fiyat, indirim veya promosyon bilgileri
• Başlık ve sonunda noktalama işaretleri

ÖRNEKLER:
✓ "{{FOCUS_KEYWORD}} Minimalist Soyut Canvas Tablo Mavi Beyaz Geometrik Duvar Sanatı"
✓ "{{FOCUS_KEYWORD}} Vintage Botanik Çiçek Koleksiyonu Canvas Duvar Sanatı Yatak Odası"
✓ "{{FOCUS_KEYWORD}} Modern Soyut Manzara Canvas Tablo Turkuaz Altın Duvar Sanatı"

Görseli dikkatle incele ve şunlara dikkat et:
• Renk şeması ve tonlar
• Sanat stili (soyut, minimalist, gerçekçi, vb.)
• Ana temalar ve motifler
• Duygu ve atmosfer
• BE SPECIFIC about cultural, historical, and artistic elements

Return ONLY the final title string, nothing else.`.trim(),
};

// ===== HELPER FUNCTIONS =====

/**
 * Kullanıcı AI ayarlarını getir
 */
export const getUserAISettings = async (): Promise<AISettings> => {
  try {
    const response = await fetch("/api/ai/settings");
    
    if (!response.ok) {
      console.warn("AI ayarları getirilemedi, varsayılan ayarlar kullanılıyor");
      return {
        model: "gpt-4.1-mini",
        temperature: 0.7,
        title_prompt: null,
        tags_prompt: null,
        category_prompt: null,
        focus_title_prompt: null
      };
    }
    
    const settings = await response.json();
    return settings;
  } catch (error) {
    console.error("AI ayarları getirme hatası:", error);
    return {
      model: "gpt-4.1-mini",
      temperature: 0.7,
      title_prompt: null,
      tags_prompt: null,
      category_prompt: null,
      focus_title_prompt: null
    };
  }
};

/**
 * Normal başlık üretimi fonksiyonu
 */
export const generateTitle = async (imageFile: File): Promise<string> => {
  const formData = new FormData();
  formData.append("image", imageFile);
  
  // Kullanıcı ayarlarını al
  const settings = await getUserAISettings();
  
  // Özel prompt varsa onu kullan, yoksa varsayılanı
  const promptToUse = settings.title_prompt || titlePrompt.prompt;
  formData.append("prompt", promptToUse);
  
  // Model ve temperature ayarlarını ekle
  formData.append("model", settings.model);
  formData.append("temperature", settings.temperature.toString());
  
  const response = await fetch("/api/ai/generate-etsy-title", {
    method: "POST",
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error("Başlık üretilemedi");
  }
  
  const data = await response.json();
  return data.title || "";
};

/**
 * Focus anahtar kelime ile başlık üretimi
 */
export const generateTitleWithFocus = async (imageFile: File, focusKeyword: string): Promise<string> => {
  const formData = new FormData();
  formData.append("image", imageFile);
  formData.append("focusKeyword", focusKeyword);
  
  // Kullanıcı ayarlarını al
  const settings = await getUserAISettings();
  
  // Özel prompt varsa onu kullan, yoksa varsayılanı
  const promptToUse = settings.focus_title_prompt || focusTitlePrompt.prompt;
  formData.append("prompt", promptToUse);
  
  // Model ve temperature ayarlarını ekle
  formData.append("model", settings.model);
  formData.append("temperature", settings.temperature.toString());
  
  const response = await fetch("/api/ai/generate-etsy-title", {
    method: "POST", 
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error("Focus başlık üretilemedi");
  }
  
  const data = await response.json();
  return data.title || "";
};

/**
 * Tag üretimi fonksiyonu
 */
export const generateTags = async (title: string, imageFile?: File): Promise<string[]> => {
  // Kullanıcı ayarlarını al
  const settings = await getUserAISettings();
  
  // Özel prompt varsa onu kullan, yoksa varsayılanı
  const promptToUse = settings.tags_prompt || tagPrompt.prompt;
  
  // Eğer resim varsa form data kullan, yoksa JSON
  if (imageFile) {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("prompt", promptToUse);
    formData.append("image", imageFile);
    formData.append("model", settings.model);
    formData.append("temperature", settings.temperature.toString());
    
    const response = await fetch("/api/ai/generate-etsy-tags", {
      method: "POST",
      body: formData,
    });
    
    if (!response.ok) throw new Error("Tag üretilemedi");
    const data = await response.json();
    return data.tags || [];
  } else {
    const requestBody = {
      title,
      prompt: promptToUse,
      model: settings.model,
      temperature: settings.temperature
    };
    
    const response = await fetch("/api/ai/generate-etsy-tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) throw new Error("Tag üretilemedi");
    const data = await response.json();
    return data.tags || [];
  }
};

/**
 * Kategori seçimi fonksiyonu
 */
export const selectCategory = async (title: string, categoryNames: string[]): Promise<string> => {
  // Kullanıcı ayarlarını al
  const settings = await getUserAISettings();
  
  // Özel prompt varsa onu kullan, yoksa varsayılanı
  const promptToUse = settings.category_prompt || categoryPrompt.prompt;
  
  const response = await fetch("/api/ai/select-category", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      categoryNames,
      prompt: promptToUse,
      model: settings.model,
      temperature: settings.temperature
    }),
  });
  
  if (!response.ok) {
    throw new Error("Kategori seçilemedi");
  }
  
  const selectedCategory = await response.text();
  return selectedCategory.trim();
};

/**
 * RESIM ANALİZİ VE İÇERİK ÜRETİMİ FONKSIYONU
 * /api/ai/generate-all endpoint'i için
 */
export const generateAllFromImage = async (imageBase64: string, imageType: string, prompt?: string): Promise<string> => {
  // OpenAI API key kontrolü
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error("OpenAI API key yapılandırılmamış");
  }

  // Kullanıcı ayarlarını al (server-side olduğu için fetch yerine supabase kullanıyoruz)
  let model = "gpt-4.1-mini";
  let temperature = 0.7;
  
  try {
    const supabase = createClientFromBrowser();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      const { data } = await supabase
        .from('ai_settings')
        .select('model, temperature')
        .eq('user_id', session.user.id)
        .single();
      
      if (data) {
        model = data.model;
        temperature = data.temperature;
      }
    }
  } catch (error) {
    console.warn("AI ayarları getirilemedi, varsayılan ayarlar kullanılıyor:", error);
  }

  // OpenAI API çağrısı
  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt || titlePrompt.prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${imageType};base64,${imageBase64}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 250,
      temperature: temperature
    })
  });

  if (!openaiResponse.ok) {
    const errorText = await openaiResponse.text();
    throw new Error(`OpenAI API hatası (${openaiResponse.status}): ${errorText}`);
  }

  const openaiData = await openaiResponse.json();
  const result = openaiData.choices?.[0]?.message?.content?.trim();
  
  if (!result) {
    throw new Error("OpenAI yanıtında içerik bulunamadı");
  }

  return result;
};

/**
 * Açıklama üretimi fonksiyonu
 */
export const generateDescription = async (title: string, imageFile?: File): Promise<string> => {
  // Kullanıcı ayarlarını al
  const settings = await getUserAISettings();
  
  // Eğer resim varsa form data kullan, yoksa JSON
  if (imageFile) {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("image", imageFile);
    formData.append("model", settings.model);
    formData.append("temperature", settings.temperature.toString());
    
    const response = await fetch("/api/ai/generate-etsy-description", {
      method: "POST",
      body: formData,
    });
    
    if (!response.ok) throw new Error("Açıklama üretilemedi");
    const data = await response.json();
    return data.description || "";
  } else {
    const requestBody = {
      title,
      model: settings.model,
      temperature: settings.temperature
    };
    
    const response = await fetch("/api/ai/generate-etsy-description", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) throw new Error("Açıklama üretilemedi");
    const data = await response.json();
    return data.description || "";
  }
};