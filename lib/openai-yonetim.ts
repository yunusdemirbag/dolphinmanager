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
  
  // Her prompt için ayrı model ve temperature ayarları
  title_model: string | null;
  title_temperature: number | null;
  tags_model: string | null;
  tags_temperature: number | null;
  category_model: string | null;
  category_temperature: number | null;
  focus_title_model: string | null;
  focus_title_temperature: number | null;
}

/**
 * TITLE PROMPT - YENİ OPTİMİZE EDİLMİŞ VERSİYON
 * Fiziksel canvas duvar sanatı için Etsy başlık üretimi
 */
export const titlePrompt: PromptConfig = {
  id: "title-prompt-v13",
  name: "Canvas Title Generator – Elite SEO Optimized",
  description: "Analyzes image and crafts elite Etsy canvas wall art titles.",
  prompt: `
You are an elite Etsy SEO copy-writer who specialises in PHYSICAL canvas wall art (NOT digital).
STEP 1 — IMAGE ANALYSIS  
• Identify the MAIN SUBJECT (woman, animal species, landscape, abstract form, floral, religious icon, etc.).  
• If a HUMAN: note gender and clear cultural identity when obvious (e.g. Black Woman, Asian Man).  
• If an ANIMAL: name the exact species (lion, flamingo, giraffe…).  
• Detect the ART STYLE (abstract, minimalist, pop art, line art, cubist, ukiyo-e, graffiti, etc.).  
• Capture the EMOTIONAL TONE (bold, calming, empowering, romantic, mystical, meditative…).  
• Note the 1-2 most eye-catching DOMINANT COLORS (gold, turquoise, black & white, etc.).
STEP 2 — TITLE CONSTRUCTION  ≤ 135 characters  
Format:  
  <Emotive Adjective> <Primary Subject> <Art Style(optional)> Canvas Wall Art Print | <Color/Tone> <Room Keyword> Decor | <Final Keyword>  
Mandatory rules  
• Include **exactly once** the phrase "Canvas Wall Art Print".  
• Use popular buyer phrases such as Living Room Decor, Bedroom Wall Decor, Office Artwork, Zen Meditation, Gift for Him/Her.  
• No duplicated words, no filler like "beautiful", no quotes, no parentheses.  
• Use Title Case. If length exceeds 135 c, remove the least-important phrase.
Return **ONLY** the finished title string and nothing else.
`.trim(),
};

/**
 * TAG PROMPT - YENİ OPTİMİZE EDİLMİŞ VERSİYON
 * 13 adet SEO optimize tag üretimi
 */
export const tagPrompt: PromptConfig = {
  id: "tag-prompt-v8",
  name: "13 Elite Etsy Tags – SEO Optimized",
  description: "Creates 13 SEO-optimized tags for physical canvas wall art.",
  prompt: `
You are an Etsy canvas wall art SEO expert.
1. Using the image AND the generated title, create **exactly 13 tags**.  
2. Each tag must be ≤ 19 characters, including spaces. Use 2- or 3-word phrases.  
3. Lowercase only, no punctuation except single spaces.  
4. No word may appear more than twice across all tags.  
5. Cover a mix of subject, style, colors, mood, target room, and gift occasion.  
6. Output the tags in one line, comma-separated, with no quotes or extra text.
Return **ONLY** the 13 tags.
`.trim(),
};

/**
 * CATEGORY SELECTION PROMPT
 * Başlığa göre en uygun kategori seçimi
 */
export const categoryPrompt: PromptConfig = {
  id: "category-prompt-v1",
  name: "Auto Category Selector",
  description: "Selects the most appropriate shop category based on title.",
  prompt: `
You are an expert Etsy category classifier.

Given a product title and a list of available categories, select the MOST appropriate category.

Rules:
- Analyze the title for subject matter, style, and target audience
- Return ONLY the exact category name from the provided list
- If multiple categories could work, pick the most specific one
- Consider buyer search patterns and Etsy conventions

Return ONLY the category name, nothing else.
`.trim(),
};

/**
 * FOCUS TITLE GENERATION PROMPT
 * Anahtar kelime odaklı başlık üretimi
 */
export const focusTitlePrompt: PromptConfig = {
  id: "focus-title-prompt-v1", 
  name: "Focus Keyword Title Generator",
  description: "Generates titles focused on specific keywords while analyzing the image.",
  prompt: `
You are an elite Etsy SEO copy-writer specialising in PHYSICAL canvas wall art.

TASK: Create a title that prominently features the given focus keyword while still analyzing the image properly.

STEP 1 – IMAGE ANALYSIS (same as before)
• Detect MAIN SUBJECT, ART STYLE, EMOTIONAL TONE, DOMINANT COLORS

STEP 2 – FOCUS KEYWORD INTEGRATION
• The provided focus keyword MUST appear in the title naturally
• Integrate it seamlessly with the image analysis
• Prioritize the focus keyword but don't force it awkwardly

STEP 3 – TITLE CONSTRUCTION (MAX 135 characters)
• Format: <Focus Keyword Integration> <Primary Subject> Canvas Wall Art Print | <Color/Tone> <Room Keyword> Decor | <Secondary Keyword>
• Always include "Canvas Wall Art Print"
• Use Title Case
• Stay ≤ 135 characters

Return ONLY the final title string, nothing else.
`.trim(),
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
        model: "gpt-4o-mini",
        temperature: 0.7,
        title_prompt: null,
        tags_prompt: null,
        category_prompt: null,
        focus_title_prompt: null,
        
        // Her prompt için ayrı model ve temperature ayarları
        title_model: null,
        title_temperature: null,
        tags_model: null,
        tags_temperature: null,
        category_model: null,
        category_temperature: null,
        focus_title_model: null,
        focus_title_temperature: null
      };
    }
    
    const settings = await response.json();
    return settings;
  } catch (error) {
    console.error("AI ayarları getirme hatası:", error);
    return {
      model: "gpt-4o-mini",
      temperature: 0.7,
      title_prompt: null,
      tags_prompt: null,
      category_prompt: null,
      focus_title_prompt: null,
      
      // Her prompt için ayrı model ve temperature ayarları
      title_model: null,
      title_temperature: null,
      tags_model: null,
      tags_temperature: null,
      category_model: null,
      category_temperature: null,
      focus_title_model: null,
      focus_title_temperature: null
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
  
  // Başlık için özel model ve temperature ayarları varsa onları kullan, yoksa genel ayarları
  const modelToUse = settings.title_model || settings.model;
  const temperatureToUse = settings.title_temperature !== null ? settings.title_temperature : settings.temperature;
  
  formData.append("model", modelToUse);
  formData.append("temperature", temperatureToUse.toString());
  
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
  
  // Odaklı başlık için özel model ve temperature ayarları varsa onları kullan, yoksa genel ayarları
  const modelToUse = settings.focus_title_model || settings.model;
  const temperatureToUse = settings.focus_title_temperature !== null ? settings.focus_title_temperature : settings.temperature;
  
  formData.append("model", modelToUse);
  formData.append("temperature", temperatureToUse.toString());
  
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
  
  // Etiketler için özel model ve temperature ayarları varsa onları kullan, yoksa genel ayarları
  const modelToUse = settings.tags_model || settings.model;
  const temperatureToUse = settings.tags_temperature !== null ? settings.tags_temperature : settings.temperature;
  
  // Eğer resim varsa form data kullan, yoksa JSON
  if (imageFile) {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("prompt", promptToUse);
    formData.append("image", imageFile);
    formData.append("model", modelToUse);
    formData.append("temperature", temperatureToUse.toString());
    
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
      model: modelToUse,
      temperature: temperatureToUse
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
  
  // Kategori seçimi için özel model ve temperature ayarları varsa onları kullan, yoksa genel ayarları
  const modelToUse = settings.category_model || settings.model;
  const temperatureToUse = settings.category_temperature !== null ? settings.category_temperature : settings.temperature;
  
  const response = await fetch("/api/ai/select-category", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      categoryNames,
      prompt: promptToUse,
      model: modelToUse,
      temperature: temperatureToUse
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
  let model = "gpt-4o-mini";
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
                detail: 'low'
              }
            }
          ]
        }
      ],
      max_tokens: 150,
      temperature: temperature
    })
  });

  if (!openaiResponse.ok) {
    const errorText = await openaiResponse.text();
    throw new Error(`OpenAI API hatası (${openaiResponse.status}): ${errorText}`);
  }

  const openaiData = await openaiResponse.json();
  const generatedContent = openaiData.choices?.[0]?.message?.content?.trim();
  
  if (!generatedContent) {
    throw new Error("OpenAI yanıtında içerik bulunamadı");
  }

  return generatedContent;
};

// ===== EXPORT ALIASLAR (Eski fonksiyon adları için uyumluluk) =====
export const tagsPrompt = tagPrompt; // Eski isim uyumluluğu için