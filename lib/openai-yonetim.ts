// openai-yonetim.ts

export interface PromptConfig {
  id: string;
  name: string;
  description: string;
  prompt: string;
  defaultPrompt?: string;
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
You are an elite Etsy SEO copywriter specialising in PHYSICAL canvas wall art (NOT digital).

STEP 1 – IMAGE ANALYSIS
• Detect the MAIN SUBJECT (woman, animal species, landscape, abstract etc.)
• If a PERSON is visible identify approximate ethnicity when obvious (Black Woman, Asian Man …)
• If an ANIMAL specify species (lion, flamingo, giraffe …)
• Determine ART STYLE (abstract, minimalist, pop art, line art, cubist, ukiyo-e, graffiti, etc.)
• Capture EMOTIONAL TONE (bold, calming, empowering, romantic, mystical …)
• Note 1–2 DOMINANT COLORS that would attract buyers (turquoise, gold, black & white …)

STEP 2 – TITLE CONSTRUCTION (MAX 135 characters)
• Format: 
  <Emotive Adjective> <Primary Subject> <Art Style(optional)> Canvas Wall Art Print | <Color/Tone> <Room Keyword> Decor | <Secondary Keyword>
• Always include exactly one occurrence of "Canvas Wall Art Print".
• Use keyword phrases buyers actually search: Living Room Decor, Bedroom Wall Décor, Office Artwork, Zen Meditation etc.
• Avoid duplicate words, avoid filler like "beautiful", no quotes, no parentheses.
• Use Title Case.
• Stay ≤ 135 characters – if you're about to exceed, drop the least-important phrase.

Return ONLY the final title string, nothing else.
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

1. Based on the uploaded image AND the generated title, craft exactly 13 tags.
2. Each tag MUST be ≤ 19 characters including spaces (use 2–3 word phrases).
3. Use only lowercase letters, no punctuation except spaces.
4. Do NOT repeat words more than twice across all tags.
5. Cover: subject, style, colors, mood, intended room, gift occasion.
6. Separate tags with commas, no quotes.

Return ONLY the 13 tags in one line, comma-separated.
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
You are an elite Etsy SEO copywriter specialising in PHYSICAL canvas wall art.

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
 * Normal başlık üretimi fonksiyonu
 */
export const generateTitle = async (imageFile: File): Promise<string> => {
  const formData = new FormData();
  formData.append("image", imageFile);
  formData.append("prompt", titlePrompt.prompt);
  
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
  formData.append("prompt", focusTitlePrompt.prompt);
  
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
  const requestBody: any = {
    title,
    prompt: tagPrompt.prompt,
  };
  
  // Eğer resim varsa form data kullan, yoksa JSON
  if (imageFile) {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("prompt", tagPrompt.prompt);
    formData.append("image", imageFile);
    
    const response = await fetch("/api/ai/generate-etsy-tags", {
      method: "POST",
      body: formData,
    });
    
    if (!response.ok) throw new Error("Tag üretilemedi");
    const data = await response.json();
    return data.tags || [];
  } else {
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
  const response = await fetch("/api/ai/select-category", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      categoryNames,
      prompt: categoryPrompt.prompt,
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

  // OpenAI API çağrısı
  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
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
      temperature: 0.7
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