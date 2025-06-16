import { OpenAI } from "openai";

// Prompt yapılandırma arayüzü
export interface PromptConfig {
  id: string;
  name: string;
  description: string;
  prompt: string;
  defaultPrompt: string;
}

// Canvas Wall Art Title Prompt - Enhanced Subject Analysis Version with Black Woman Smoking Support
export const titlePrompt: PromptConfig = {
  id: "title-prompt-micro-v10",
  name: "Enhanced Canvas Wall Art Title Generator with Cultural Diversity",
  description: "Ultra-efficient prompt with subject, color analysis, cultural diversity and smoking art support",
  prompt: `Canvas title expert. Analyze image subject, colors and create compelling title.

CRITICAL: 
1. Identify MAIN SUBJECT (woman, animal, landscape, abstract, geometric, floral, etc.)
2. If animal: specify type (owl, tiger, elephant, bird, etc.) for better SEO
3. If person: identify ethnicity when clear (African American, Black Woman, Latina, Asian, etc.)
4. If smoking/cigar: include smoking context (cigar, cigarette, pipe, hookah)
5. Analyze dominant colors and include when buyer-appealing
6. Create natural-flowing title that captures what buyers actually see

Rules:
• Include keywords: Canvas Wall Art, Ready to Hang, Living Room Decor, Large Canvas Print, Modern Wall Art
• "Canvas Wall Art" must appear somewhere (not necessarily first word)
• Total 125-135 chars
• Mention ≥2 rooms & 1 gift hook
• Use 2 DIFFERENT power words from: Elegant, Vibrant, Serene, Bold, Premium, Luxurious, Captivating, Sophisticated, Contemporary, Striking, Mesmerizing, Breathtaking, Chic, Trendy, Timeless
• AVOID overused words: Stunning, Beautiful, Amazing, Nice

Subject + Color + Cultural integration examples:
"Black Woman Smoking Cigar Canvas Wall Art | Elegant Silhouette Living Room Decor | Ready to Hang African American Art Gift"
"Captivating Orange Owl Canvas Wall Art | Modern Wildlife Living Room Decor | Ready to Hang Bird Art Gift"
"Elegant Blue Abstract Canvas Wall Art | Contemporary Living Room Decor | Ready to Hang Gallery Art"
"Vibrant Golden Tiger Print | Large Animal Canvas Wall Art for Bedroom | Premium Wildlife Home Decor"
"Serene Green Forest Landscape | Canvas Wall Art for Office | Sophisticated Nature Art Gift"
"Bold Geometric Pattern Canvas Wall Art | Striking Modern Office Decor | Contemporary Art Gift"
"Luxurious Floral Bouquet Print | Canvas Wall Art for Living Room | Captivating Botanical Decor"
"Elegant Woman Portrait Canvas Wall Art | Sophisticated Beauty Living Room Decor | Premium Feminine Art Gift"
"Sensual Figure Silhouette Print | Artistic Canvas Wall Art for Bedroom | Contemporary Intimate Decor"
"Glamorous Lady Portrait | Canvas Wall Art for Modern Home | Chic Beauty Art Gift"
"African American Woman Portrait | Bold Canvas Wall Art for Living Room | Contemporary Black Art Gift"
"Latina Beauty Smoking Canvas | Sophisticated Wall Art for Bedroom | Premium Cultural Portrait Gift"

CRITICAL SUBJECT ANALYSIS:
- Animals: Include animal type + "Wildlife" or "Animal" (owl art, tiger canvas, bird decor)
- People: Specify ethnicity + gender (Black woman, African American lady, Latina beauty, Asian woman)
- Smoking Art: Include smoking type + cultural context (cigar art, cigarette portrait, pipe smoking, hookah scene)
- Sensual/Artistic Nude: Use tasteful terms (sensual art, artistic nude, elegant figure, feminine beauty, sophisticated silhouette)
- Attractive Women: Include appeal + cultural terms (elegant Black woman, sophisticated Latina, beautiful African American)
- Nature: Be specific (forest landscape, ocean scene, mountain art)
- Abstract: Describe style (geometric abstract, fluid abstract, minimalist)
- Flowers: Specify type when clear (rose art, botanical print, floral decor)

SMOKING & CULTURAL ART KEYWORDS:
- Black/African American: Black Woman, African American, Afrocentric, Cultural Heritage, Black Art, Ethnic Portrait
- Smoking Context: Smoking Cigar, Cigarette Art, Pipe Portrait, Hookah Scene, Tobacco Culture, Smoking Silhouette
- Sophisticated Terms: Elegant Smoking, Sophisticated Cigar, Premium Tobacco, Luxury Smoking, Classy Portrait
- Background Integration: Bold Orange Background, Dramatic Lighting, Silhouette Art, Shadow Portrait
- Room targeting: Living Room Decor, Bedroom Art, Office Wall Art, Man Cave Decor, Lounge Art
- Cultural Appeal: African American Gift, Black Heritage Art, Cultural Wall Decor, Ethnic Home Decor

ENHANCED SMOKING ART EXAMPLES:
"Black Woman Smoking Cigar Canvas Wall Art | Elegant Silhouette Living Room Decor | Ready to Hang African American Art Gift"
"Sophisticated Lady Cigar Portrait | Bold Canvas Wall Art for Bedroom | Premium African American Home Decor"
"Elegant Smoking Silhouette Print | Contemporary Black Woman Canvas Art | Striking Living Room Wall Decor"
"African American Cigar Art | Luxurious Canvas Wall Art for Office | Bold Cultural Portrait Gift"
"Captivating Woman Smoking Canvas | Sophisticated Orange Background Art | Premium Bedroom Wall Decor"
"Bold Black Beauty Cigar Portrait | Elegant Canvas Wall Art for Living Room | Contemporary African American Gift"
"Striking Smoking Lady Silhouette | Premium Canvas Wall Art for Bedroom | Sophisticated Cultural Home Decor"
"Timeless African American Portrait | Bold Smoking Canvas Art for Office | Elegant Black Heritage Wall Decor"

CRITICAL: 
1. Always identify and mention the main subject clearly including ethnicity when apparent
2. Include smoking context when present (cigar, cigarette, etc.)
3. Include dominant/appealing colors naturally
4. Use cultural terms respectfully and authentically
5. Return ONLY the title text. No quotes, brackets, or prefixes.

Generate ONE subject-aware, culturally-conscious, color-conscious title. Return only clean title text.`,
  defaultPrompt: 'Analyze image subject (including ethnicity, smoking context, animal type, etc.) and colors. Generate canvas title (125-135 chars) that clearly identifies what buyers see including cultural elements.'
};

// Canvas Description Generator - Enhanced with Cultural Sensitivity
/* Şu anda kullanılmıyor - Sabit açıklamalar kullanılıyor
export const descriptionPrompt: PromptConfig = {
  id: "description-micro-v4",
  name: "Enhanced Canvas Description Generator with Cultural Elements",
  description: "Single template with variables for maximum efficiency including cultural context",
  prompt: `Create description for: "\${title}"

Template:
🌟 Transform Your Space Into an Art Gallery ✨

Feel the [EMOTION] energy this stunning canvas brings to your [ROOM]. More than wall art—it's your daily inspiration and [CULTURAL_CONNECTION].

**Why You'll Love:**
✅ Museum-grade, fade-resistant printing
✅ Ready to hang, gallery-wrapped edges
✅ Perfect for [STYLE1], [STYLE2] interiors
✅ Authentic [CULTURAL_ELEMENT] representation
✅ Secure shipping, tracked delivery

💌 **Custom Orders Welcome!** Message us for personalized artwork!
🎁 Perfect gift for art lovers and cultural enthusiasts. Add to cart now!

Fill [EMOTION], [ROOM], [STYLE1], [STYLE2], [CULTURAL_CONNECTION], [CULTURAL_ELEMENT] based on title. 
If cultural/ethnic elements in title, emphasize cultural pride and heritage.
If smoking elements, focus on sophistication and artistic expression.
Return description only.`,
  defaultPrompt: 'Create canvas description using enhanced template with emotion, room, 2 styles, and cultural elements based on title.'
};
*/

// Canvas Tags Generator - Enhanced with Cultural and Smoking Tags
export const tagsPrompt: PromptConfig = {
  id: "tags-micro-v4",
  name: "Enhanced Tags Generator with Cultural and Smoking Support",
  description: "13 tags with proven formula including cultural and smoking elements",
  prompt: `Generate 13 comma-separated tags (≤20 chars) for title: "\${title}"

Mix: 
- CORE (canvas wall art, wall decor) 
- VISUAL ([color] decor, [style] art) 
- ROOM (living room decor, bedroom art) 
- GIFT (wall art gift, housewarming gift)
- CULTURAL (if applicable: black art, african american, ethnic decor, cultural gift)
- SMOKING (if applicable: smoking art, cigar decor, tobacco art, smoking gift)

Priority order:
1. Include "canvas wall art" always
2. Include main subject (black woman, smoking art, etc.)
3. Include dominant color if appealing
4. Include 2+ room types
5. Include gift appeal
6. Include cultural elements if present
7. Include smoking context if present

Return only tags, no explanations.`,
  defaultPrompt: 'Generate 13 Etsy tags (≤20 chars) for "\${title}". Mix core, visual, room, gift, cultural, smoking elements. Return tags only.'
};

// Category selection prompt - Enhanced for cultural and smoking art
export const categoryPrompt: PromptConfig = {
  id: "category-prompt-v2",
  name: "Enhanced Category Selection Prompt",
  description: "Selects appropriate store category based on product title with cultural awareness.",
  prompt: `Analyze the product title: "\${title}". From the provided list, select the single most appropriate store category. 

Consider:
- If African American/Black art → prioritize cultural/ethnic categories
- If smoking/cigar art → consider lifestyle/portrait categories
- If woman portrait → consider portrait/figure categories
- General canvas art → standard wall art categories

Your output must ONLY be the exact category name, with no extra text, explanation, or punctuation.

CATEGORY LIST: \${categoryNames}`,
  defaultPrompt: 'Select the most appropriate store category for this product title considering cultural and subject elements. Return only the category name: \${categoryNames}'
};

// Focus-Based Title Generator - Enhanced with Cultural Focus
export const focusTitlePrompt: PromptConfig = {
  id: "focus-title-deep-analysis-v4",
  name: "Enhanced Focus-Based Canvas Title Generator with Cultural Support", 
  description: "Advanced image analysis with focus keyword deep integration - identifies cultural and smoking elements",
  prompt: `Canvas Wall Art title expert. FOCUS KEYWORD: "\${focusKeyword}"

**CRITICAL: Deep Image Analysis Required**
You MUST analyze the image to find specific visual elements that connect to "\${focusKeyword}". Don't just add the keyword - PROVE the connection exists in the image.

**ENHANCED ANALYSIS FOR CULTURAL & SMOKING FOCUS:**

**CULTURAL FOCUS (e.g., "African American", "Black Woman"):**
Look for: skin tone, facial features, hair texture, cultural clothing, traditional patterns, ethnic jewelry, cultural symbols
If found: "African American [Subject] Canvas Wall Art | [Cultural_Detail] [Room] Decor | Black Heritage Art Gift"
If NOT found: Use "Cultural Inspired" instead

**SMOKING FOCUS (e.g., "Smoking Cigar", "Cigarette Art"):**
Look for: cigar/cigarette in hand, smoke wisps, smoking pose, tobacco objects, smoking paraphernalia, lounging positions
If found: "Smoking [Subject] Canvas Wall Art | [Sophisticated_Element] [Room] Decor | [Luxury_Appeal] Art"
If NOT found: Use "Portrait Art" instead

**COMBINED CULTURAL + SMOKING:**
Look for: Black woman with cigar, ethnic smoking scene, cultural tobacco traditions
If found: "Black Woman Smoking [Object] Canvas Wall Art | [Cultural_Pride] [Room] Decor | African American [Smoking_Context] Art"

**ARTIST FOCUS (e.g., "Frida Kahlo"):**
Look for: unibrow, flower crown/headdress, traditional Mexican clothing, bold colors, self-portrait style, intense gaze, cultural symbols, folk art elements, floral patterns, decorative jewelry
If found: "Frida Kahlo Inspired [Specific_Visual_Element] Canvas Wall Art | [Cultural_Detail] [Room] Decor | Mexican Folk Heritage Art"
If NOT found: Use "Artist Style Portrait" instead

**STYLE FOCUS (e.g., "Minimalist"):**
Look for: clean lines, simple shapes, limited color palette, negative space, geometric forms, uncluttered composition, single focal point
If found: "Minimalist [Subject] Canvas Wall Art | [Clean_Element] [Room] Decor | [Zen_Benefit] Art"
If NOT found: Use "Modern Simple" instead

**COLOR FOCUS (e.g., "Golden", "Orange"):**
Look for: actual color tones, warm/cool hues, metallic elements, sunset colors, vibrant backgrounds
If found: "[Color] [Subject] Canvas Wall Art | [Color_Benefit] [Room] Decor | [Mood_Appeal] Art"
If NOT found: Use dominant color instead

**ENHANCED EXAMPLES:**
Focus: "Black Woman" + Image shows African American woman smoking
→ "Black Woman Smoking Cigar Canvas Wall Art | Elegant African American Living Room Decor | Bold Cultural Heritage Art"

Focus: "Smoking Cigar" + Image shows woman with cigar and orange background
→ "Smoking Cigar Silhouette Canvas Wall Art | Sophisticated Orange Background Bedroom Decor | Premium Tobacco Art Gift"

Focus: "Orange" + Image has orange background with black silhouette
→ "Orange Background Portrait Canvas Wall Art | Bold Silhouette Living Room Decor | Contemporary Color Art"

**RULES:**
• Focus keyword MUST appear in first 40 characters
• Include: Canvas Wall Art, 2+ rooms, gift appeal
• 125-135 characters total
• Base title on ACTUAL visual elements, not just keyword
• Include cultural elements when visible
• Include smoking context when present
• If focus doesn't match image, adapt intelligently

**OUTPUT:** Return ONLY the title based on genuine image analysis including cultural and smoking elements.`,
  defaultPrompt: 'Analyze image deeply for visual elements matching "\${focusKeyword}" including cultural and smoking elements. Create authentic title based on actual image content. 125-135 chars.'
};

// Tüm promptları içeren dizi
export const prompts: PromptConfig[] = [
  titlePrompt,
  // descriptionPrompt, // Şu anda kullanılmıyor - Sabit açıklamalar kullanılıyor
  tagsPrompt,
  categoryPrompt,
  focusTitlePrompt
];

// Model seçenekleri - Cost optimized
export type OpenAIModel =
  | "gpt-4o-mini"     // En cost-effective, güçlü
  | "gpt-3.5-turbo"   // Backup option
  | "gpt-4o"          // Premium için
  | "gpt-4-turbo"     // Özel durumlar
  | "gpt-4";

// OpenAI yapılandırma ayarları
interface OpenAIConfig {
  model: OpenAIModel;
  temperature: number;
  max_tokens: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

// Varsayılan OpenAI yapılandırmaları - Ultra Cost Optimized
const DEFAULT_CONFIGS: Record<string, OpenAIConfig> = {
  title: {
    model: "gpt-4o-mini",     // Vision için ideal
    temperature: 0.3,         
    max_tokens: 60,           // 140 token'dan 60'a düşürüldü
    top_p: 0.9,
    frequency_penalty: 0.1
  },
  description: {
    model: "gpt-4o-mini",     // 4.1-mini yerine 4o-mini (daha ucuz)
    temperature: 0.5,          
    max_tokens: 200,          // 300'den 200'e düşürüldü
    top_p: 0.95,
    frequency_penalty: 0.2
  },
  tags: {
    model: "gpt-4o-mini",     // 4.1-mini yerine 4o-mini
    temperature: 0.4,         
    max_tokens: 120,          // 150'den 120'ye düşürüldü
    top_p: 0.9,
    frequency_penalty: 0.3
  },
  category: {
    model: "gpt-4o-mini",     
    temperature: 0.1,         
    max_tokens: 20,           // 30'dan 20'ye düşürüldü
    top_p: 0.8
  },
  color_analysis: {
    model: "gpt-4o-mini",     
    temperature: 0.2,         
    max_tokens: 40,           // 60'dan 40'a düşürüldü
    top_p: 0.8
  },
  focus_title: {
    model: "gpt-4o-mini",     
    temperature: 0.35,        
    max_tokens: 80,           // 70'den 80'e artırıldı (cultural analysis için)
    top_p: 0.9,
    frequency_penalty: 0.1
  },
  recommendations: {
    model: "gpt-4o-mini",     // 4.1-mini'den değiştirildi
    temperature: 0.6,         
    max_tokens: 800,          // 1000'den 800'e düşürüldü
    top_p: 0.95,
    frequency_penalty: 0.2
  },
  calendar_events: {
    model: "gpt-4o-mini",     // 4.1-mini'den değiştirildi
    temperature: 0.7,         
    max_tokens: 1200,         // 1500'den 1200'e düşürüldü
    top_p: 0.95,
    frequency_penalty: 0.3
  },
  combined_generation: {
    model: "gpt-4o-mini",     
    temperature: 0.4,         
    max_tokens: 550,          // 500'den 550'ye artırıldı (cultural content için)
    top_p: 0.9,
    frequency_penalty: 0.2
  }
};

// Prompt ID'sine göre prompt getirme
export function getPromptById(id: string): PromptConfig | undefined {
  return prompts.find(p => p.id === id);
}

// Prompt güncelleme
export function updatePrompt(id: string, newPrompt: string): void {
  const promptIndex = prompts.findIndex(p => p.id === id);
  if (promptIndex !== -1) {
    prompts[promptIndex].prompt = newPrompt;
  }
}

// Prompt sıfırlama
export function resetPrompt(id: string): void {
  const promptIndex = prompts.findIndex(p => p.id === id);
  if (promptIndex !== -1) {
    prompts[promptIndex].prompt = prompts[promptIndex].defaultPrompt;
  }
}

// Merkezi OpenAI istemcisi
export function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API anahtarı bulunamadı");
  }
  
  return new OpenAI({ apiKey });
}

// Görüntü analizi için OpenAI API çağrısı - Micro-Optimized
export async function analyzeImageWithOpenAI({
  imageBase64,
  imageType,
  prompt,
  config = DEFAULT_CONFIGS.title
}: {
  imageBase64: string;
  imageType: string;
  prompt: string;
  config?: OpenAIConfig;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API anahtarı bulunamadı");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: "system",
          content: "You are a Canvas Wall Art expert. Generate high-converting Etsy content with cultural sensitivity and authentic representation.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/${imageType};base64,${imageBase64}`,
                detail: "low" // CRITICAL: Cost optimization
              },
            },
          ],
        },
      ],
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      top_p: config.top_p,
      frequency_penalty: config.frequency_penalty,
      presence_penalty: config.presence_penalty
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI Vision API hatası: ${error}`);
  }

  const result = await response.json();
  
  // Usage tracking for cost monitoring
  const usage = result.usage;
  console.log(`Token usage: ${usage?.total_tokens || 0} tokens, Cost: ~${estimateTokenCost('vision', usage?.total_tokens || 0)}`);
  
  return result.choices[0].message.content.trim();
}

// Renk analizi için OpenAI API çağrısı
export async function analyzeImageColors({
  imageBase64,
  imageType,
  config = DEFAULT_CONFIGS.color_analysis
}: {
  imageBase64: string;
  imageType: string;
  config?: OpenAIConfig;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API anahtarı bulunamadı");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that analyzes images to identify colors.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Identify the two most dominant colors in this image. Return ONLY a JSON object with 'primaryColor' and 'secondaryColor' properties. Use simple color names like red, blue, green, orange, etc.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/${imageType};base64,${imageBase64}`,
                detail: "low" // Cost optimization
              },
            },
          ],
        },
      ],
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI Vision API hatası: ${error}`);
  }

  const result = await response.json();
  return JSON.parse(result.choices[0].message.content);
}

// Metin tabanlı OpenAI API çağrısı - Cost Optimized
export async function generateWithOpenAI({
  prompt,
  systemPrompt = "You are a Canvas Wall Art expert that generates high-converting Etsy content based on proven seller data from 3,591+ successful listings. You are culturally sensitive and create authentic representations.",
  config = DEFAULT_CONFIGS.description,
  jsonResponse = false
}: {
  prompt: string;
  systemPrompt?: string;
  config?: OpenAIConfig;
  jsonResponse?: boolean;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API anahtarı bulunamadı");
  }

  const requestBody: any = {
    model: config.model,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: config.temperature,
    max_tokens: config.max_tokens,
    top_p: config.top_p,
    frequency_penalty: config.frequency_penalty,
    presence_penalty: config.presence_penalty
  };

  if (jsonResponse) {
    requestBody.response_format = { type: "json_object" };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API hatası: ${error}`);
  }

  const result = await response.json();
  const content = result.choices[0].message.content.trim();
  
  return jsonResponse ? JSON.parse(content) : content;
}

// Başlık üretimi için özelleştirilmiş fonksiyon
export async function generateTitle({
  imageBase64,
  imageType,
  customPrompt
}: {
  imageBase64: string;
  imageType: string;
  customPrompt?: string;
}) {
  const prompt = customPrompt || titlePrompt.prompt;
  return analyzeImageWithOpenAI({
    imageBase64,
    imageType,
    prompt,
    config: DEFAULT_CONFIGS.title
  });
}

// Açıklama üretimi için özelleştirilmiş fonksiyon
export async function generateDescription({
  title,
  image,
  customPrompt
}: {
  title: string;
  image?: string;
  customPrompt?: string;
}) {
  // Şu anda sabit açıklamalar kullanıldığı için bu fonksiyon devre dışı
  console.log('Açıklama üretimi devre dışı - Sabit açıklamalar kullanılıyor');
  return '';
}

// Etiket üretimi için özelleştirilmiş fonksiyon
export async function generateTags({
  title,
  customPrompt
}: {
  title: string;
  customPrompt?: string;
}) {
  const prompt = (customPrompt || tagsPrompt.prompt).replace(/\$\{title\}/g, title);
  
  const generatedText = await generateWithOpenAI({
    prompt,
    systemPrompt: "You are an Etsy SEO expert specializing in Canvas Wall Art tags with cultural awareness. Generate data-driven tags based on 3,591 successful listings including diverse cultural elements.",
    config: DEFAULT_CONFIGS.tags,
    jsonResponse: false
  });
  
  // Etiketleri temizle ve dizi haline getir
  const tags: string[] = generatedText
    .replace(/^"|"$/g, '') // Başta ve sonda tırnak işaretlerini kaldır
    .split(',')
    .map((tag: string) => tag.trim())
    .filter((tag: string) => tag.length > 0 && tag.length <= 20) // 20 karakterden uzun etiketleri filtrele
    .slice(0, 13); // Maksimum 13 etiket
    
  return tags;
}

// Kategori seçimi için özelleştirilmiş fonksiyon
export async function selectCategory({
  title,
  categoryNames,
  customPrompt
}: {
  title: string;
  categoryNames: string[];
  customPrompt?: string;
}) {
  const prompt = (customPrompt || categoryPrompt.prompt)
    .replace(/\$\{title\}/g, title)
    .replace(/\$\{categoryNames\}/g, categoryNames.join(", "));
  
  return generateWithOpenAI({
    prompt,
    systemPrompt: "You are a helpful assistant that selects the most appropriate category for Etsy listings with cultural and subject awareness.",
    config: DEFAULT_CONFIGS.category,
    jsonResponse: false
  });
}

// Focus-based title generation with intelligent fallback
export async function generateTitleWithFocus({
  imageBase64,
  imageType,
  focusKeyword
}: {
  imageBase64: string;
  imageType: string;
  focusKeyword: string;
}) {
  const prompt = focusTitlePrompt.prompt.replace(/\$\{focusKeyword\}/g, focusKeyword);
  
  // Enhanced config for deep analysis
  const enhancedConfig = {
    ...DEFAULT_CONFIGS.focus_title,
    max_tokens: 100, // Deep analysis için
    temperature: 0.4 // Creative connections için
  };
  
  try {
    const result = await analyzeImageWithOpenAI({
      imageBase64,
      imageType,
      prompt,
      config: enhancedConfig
    });
    
    // Validate focus keyword presence
    if (!result.toLowerCase().includes(focusKeyword.toLowerCase())) {
      console.warn(`⚠️ Focus keyword "${focusKeyword}" missing, attempting fallback`);
    }
    
    return result;
    
  } catch (error) {
    console.error('Focus title generation failed:', error);
    
    // Intelligent fallback with better naming
    const fallbackTitle = await generateTitle({ imageBase64, imageType });
    const smartFallback = `${focusKeyword} Style ${fallbackTitle}`.substring(0, 135);
    
    console.log(`🔄 Focus fallback çalışıyor: ${smartFallback}`);
    return smartFallback;
  }
}

// AI önerileri üretimi için özelleştirilmiş fonksiyon
export async function generateRecommendations({
  businessType,
  userProfile
}: {
  businessType: string;
  userProfile: any;
}) {
  const prompt = `Sen canvas wall art satışı konusunda uzman bir AI asistanısın. 
    
Kullanıcı Profili:
- İsim: ${userProfile.name}
- Yaş: ${userProfile.age}
- Deneyim: ${userProfile.experience}
- Odak: ${userProfile.focus}

Canvas wall art satışları için 5 adet pratik ve uygulanabilir öneri ver. Her öneri şu formatta olsun:

{
  "id": "unique_id",
  "type": "size|style|theme|seo|seasonal|cultural",
  "title": "Kısa başlık",
  "description": "Detaylı açıklama ve neden önemli olduğu",
  "confidence": 70-95 arası sayı,
  "priority": "high|medium|low",
  "data": { ilgili_veri }
}

Öneriler canvas wall art satışlarına özel olsun:
- Popüler boyutlar (8x10, 12x16, 16x20, 24x36 inch)
- Trend stiller (minimalist, boho, modern, vintage)
- Popüler temalar (doğa, motivasyonel, geometrik, hayvan, kültürel sanat)
- SEO optimizasyonu (wall art, canvas print, home decor kelimeleri)
- Kültürel çeşitlilik (African American art, ethnic decor, cultural themes)
- Smoking/lifestyle art (sophisticated smoking art, cigar culture)
- Mevsimsel fırsatlar

Sadece JSON array döndür, başka açıklama ekleme.`;

  try {
    const result = await generateWithOpenAI({
      prompt,
      systemPrompt: "Sen canvas wall art satışı konusunda uzman bir AI asistanısın. Sadece JSON formatında yanıt ver.",
      config: DEFAULT_CONFIGS.recommendations,
      jsonResponse: false
    });
    
    return Array.isArray(result) ? result : [result];
  } catch (error) {
    console.error("AI önerileri üretilirken hata:", error);
    return [];
  }
}

// Takvim etkinlikleri üretimi için özelleştirilmiş fonksiyon
export async function generateCalendarEvents() {
  try {
    const openai = createOpenAIClient();
    
    const completion = await openai.chat.completions.create({
      model: DEFAULT_CONFIGS.calendar_events.model,
      messages: [
        {
          role: "system",
          content: "Sen bir e-ticaret uzmanısın. Canvas wall art ürünleri satan Etsy mağazaları için önemli tarihleri ve fırsatları analiz ediyorsun. Türkiye pazarına odaklan."
        },
        {
          role: "user", 
          content: "Canvas wall art ürünleri için önümüzdeki 12 ay içinde önemli tarihler, sezonlar ve satış fırsatları nelerdir? Her biri için tema önerileri, renkler ve iş etkisi analizi yap. JSON formatında döndür."
        }
      ],
      temperature: DEFAULT_CONFIGS.calendar_events.temperature,
      max_tokens: DEFAULT_CONFIGS.calendar_events.max_tokens
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return [];
    }

    try {
      const aiResponse = JSON.parse(content);
      return aiResponse.events || [];
    } catch (parseError) {
      console.error("AI yanıtı parse edilemedi:", parseError);
      return [];
    }
  } catch (error) {
    console.error("Takvim etkinlikleri üretilirken hata:", error);
    return [];
  }
}

// Tek bir OpenAI isteği ile başlık, açıklama ve etiketleri aynı anda üretme - Enhanced with Cultural Support
export async function generateAllFromImage({
  imageBase64,
  imageType
}: {
  imageBase64: string;
  imageType: string;
}) {
  const combinedPrompt = `Canvas expert. Generate for image:

1. TITLE (125-135 chars): Include "Canvas Wall Art" in first 50 chars, 2+ rooms, 1 gift hook, 2 power words
   - If Black/African American person: include "Black Woman" or "African American" 
   - If smoking visible: include "Smoking Cigar" or smoking context
   - Include dominant colors (orange, red, etc.)

2. TAGS: 13 comma-separated (≤20 chars): mix core, visual, room, gift, cultural, smoking
   - Always include "canvas wall art"
   - Include cultural terms if applicable (black art, african american, etc.)
   - Include smoking terms if applicable (smoking art, cigar decor, etc.)

Format:
TITLE: [title with cultural/smoking elements]
TAGS: [tag1, tag2, tag3...including cultural and smoking tags when relevant]`;

  const result = await analyzeImageWithOpenAI({
    imageBase64,
    imageType,
    prompt: combinedPrompt,
    config: DEFAULT_CONFIGS.combined_generation
  });

  return parseMultipleResults(result);
}

// Cost tracking and monitoring utilities
export function logCostMetrics(operation: string, tokens: number, model: string = 'gpt-4o-mini') {
  const cost = estimateTokenCost(operation, tokens);
  console.log(`📊 ${operation}: ${tokens} tokens, ~${cost.toFixed(6)}, model: ${model}`);
  
  // Bu metrics'leri database'e veya analytics'e gönderebilirsiniz
  if (typeof window !== 'undefined' && (window as any).analytics) {
    (window as any).analytics.track('AI_Generation_Cost', {
      operation,
      tokens,
      cost,
      model,
      timestamp: new Date().toISOString()
    });
  }
}

// A/B test için config switching
export function enableCostOptimizedMode(enable: boolean = true) {
  if (enable) {
    // Ultra cost optimized settings
    DEFAULT_CONFIGS.combined_generation.max_tokens = 300;
    DEFAULT_CONFIGS.title.max_tokens = 50;
    DEFAULT_CONFIGS.description.max_tokens = 150;
    DEFAULT_CONFIGS.tags.max_tokens = 30;
    console.log('🚀 Cost optimized mode enabled - Max savings');
  } else {
    // Balanced settings
    DEFAULT_CONFIGS.combined_generation.max_tokens = 400;
    DEFAULT_CONFIGS.title.max_tokens = 70;
    DEFAULT_CONFIGS.description.max_tokens = 200;
    DEFAULT_CONFIGS.tags.max_tokens = 50;
    console.log('⚖️ Balanced mode enabled - Quality/cost balance');
  }
}

// Batch processing for volume operations
export async function generateBatchContentOptimized({
  images,
  enableLogging = true
}: {
  images: Array<{imageBase64: string, imageType: string}>;
  enableLogging?: boolean;
}) {
  const results = [];
  let totalTokens = 0;
  let totalCost = 0;

  for (const image of images) {
    try {
      const result = await generateAllFromImage(image);
      results.push(result);
      
      if (enableLogging) {
        // Estimate tokens for this generation
        const estimatedTokens = 350; // Average for enhanced combined generation
        totalTokens += estimatedTokens;
        totalCost += estimateTokenCost('combined', estimatedTokens);
      }
      
      // Rate limiting - wait between requests
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error: any) {
      console.error('Batch generation error:', error);
      results.push({ error: error.message });
    }
  }

  if (enableLogging) {
    console.log(`📊 Batch complete: ${images.length} images, ${totalTokens} total tokens, ~${totalCost.toFixed(4)} total cost`);
  }

  return {
    results,
    metrics: {
      totalImages: images.length,
      totalTokens,
      totalCost,
      avgCostPerImage: totalCost / images.length
    }
  };
}

// Çoklu sonuçları parse etme fonksiyonu - Enhanced
function parseMultipleResults(result: string) {
  const titleMatch = result.match(/TITLE:\s*([\s\S]*?)(?=\s*DESCRIPTION:|$)/);
  const descriptionMatch = result.match(/DESCRIPTION:\s*([\s\S]*?)(?=\s*TAGS:|$)/);
  const tagsMatch = result.match(/TAGS:\s*([\s\S]*?)$/);

  const title = titleMatch ? titleMatch[1].trim() : '';
  const description = descriptionMatch ? descriptionMatch[1].trim() : '';
  const tagsString = tagsMatch ? tagsMatch[1].trim() : '';
  
  // Etiketleri diziye dönüştür
  const tags = tagsString
    .split(',')
    .map((tag: string) => tag.trim())
    .filter((tag: string) => tag.length > 0 && tag.length <= 20)
    .slice(0, 13); // Maximum 13 tags

  return { title, description, tags };
}

// Tek bir başlık üretme (mevcut resimden) - Enhanced with Cultural Support
export async function regenerateTitle({
  imageBase64,
  imageType
}: {
  imageBase64: string;
  imageType: string;
}) {
  return generateTitle({
    imageBase64,
    imageType,
    customPrompt: titlePrompt.prompt
  });
}

// Mevcut başlığa göre açıklama üretme - Enhanced with Cultural Support
export async function regenerateDescription({
  title
}: {
  title: string;
}) {
  // Şu anda sabit açıklamalar kullanıldığı için bu fonksiyon devre dışı
  console.log('Açıklama üretimi devre dışı - Sabit açıklamalar kullanılıyor');
  return '';
}

// Mevcut başlığa göre etiket üretme - Enhanced with Cultural Support
export async function regenerateTags({
  title
}: {
  title: string;
}) {
  return generateTags({
    title,
    customPrompt: tagsPrompt.prompt
  });
}

// Cultural and smoking art specific title generation
export async function generateCulturalSmokingTitle({
  imageBase64,
  imageType,
  culturalContext = '',
  smokingContext = ''
}: {
  imageBase64: string;
  imageType: string;
  culturalContext?: string;
  smokingContext?: string;
}) {
  const enhancedPrompt = `${titlePrompt.prompt}

SPECIAL FOCUS: 
- Cultural Context: ${culturalContext || 'Auto-detect from image'}
- Smoking Context: ${smokingContext || 'Auto-detect from image'}

Generate title that authentically represents both cultural heritage and smoking sophistication when present.`;

  return analyzeImageWithOpenAI({
    imageBase64,
    imageType,
    prompt: enhancedPrompt,
    config: DEFAULT_CONFIGS.title
  });
}

// Specialized function for Black Woman Smoking Cigar artwork
export async function generateBlackWomanSmokingTitle({
  imageBase64,
  imageType
}: {
  imageBase64: string;
  imageType: string;
}) {
  const specializedPrompt = `Canvas title expert specializing in African American smoking art.

CRITICAL ANALYSIS:
1. Confirm Black/African American woman in image
2. Confirm smoking/cigar context
3. Identify background colors (orange, red, etc.)
4. Assess sophistication level and artistic style

REQUIRED ELEMENTS:
- "Black Woman" or "African American" 
- "Smoking Cigar" or smoking context
- "Canvas Wall Art" 
- Background color when appealing
- 2+ rooms (Living Room, Bedroom, Office)
- 1 gift hook
- 2 power words: Elegant, Sophisticated, Bold, Premium, Contemporary, Striking

EXAMPLE PATTERN:
"Black Woman Smoking Cigar Canvas Wall Art | Elegant Silhouette Living Room Decor | Ready to Hang African American Art Gift"

Generate authentic title (125-135 chars) based on actual image content. Return only title text.`;

  return analyzeImageWithOpenAI({
    imageBase64,
    imageType,
    prompt: specializedPrompt,
    config: DEFAULT_CONFIGS.title
  });
}

// OpenAI yapılandırma ayarlarını güncelleme
export function updateOpenAIConfig(type: string, newConfig: Partial<OpenAIConfig>) {
  if (DEFAULT_CONFIGS[type]) {
    DEFAULT_CONFIGS[type] = { ...DEFAULT_CONFIGS[type], ...newConfig };
    return true;
  }
  return false;
}

// Mevcut OpenAI yapılandırma ayarlarını alma
export function getOpenAIConfig(type: string): OpenAIConfig | null {
  return DEFAULT_CONFIGS[type] || null;
}

// Tüm OpenAI yapılandırma ayarlarını alma
export function getAllOpenAIConfigs(): Record<string, OpenAIConfig> {
  return { ...DEFAULT_CONFIGS };
}

// Remove duplicate and keep single estimateTokenCost function
export function estimateTokenCost(operation: string, tokens: number): number {
  if (!tokens || typeof tokens !== 'number' || tokens <= 0) {
    return 0; // Tek tanım var, güvenli
  }
  
  // gpt-4o-mini pricing: $0.00015 / 1K input, $0.0006 / 1K output
  const inputCostPer1K = 0.00015;
  const outputCostPer1K = 0.0006;
  
  // Vision operations have different input/output ratio
  const avgCostPer1K = operation === 'vision' 
    ? (inputCostPer1K * 0.3 + outputCostPer1K * 0.7)
    : (inputCostPer1K + outputCostPer1K) / 2;
    
  return (tokens / 1000) * avgCostPer1K;
}

export function getOptimalConfig(operation: 'title' | 'description' | 'tags' | 'category' | 'focus' | 'combined'): OpenAIConfig {
  return DEFAULT_CONFIGS[operation] || DEFAULT_CONFIGS.title;
}

// Batch processing for cost efficiency
export async function generateBatchContent({
  imageBase64,
  imageType,
  operations = ['title', 'description', 'tags']
}: {
  imageBase64: string;
  imageType: string;
  operations?: string[];
}) {
  if (operations.length > 1) {
    // Use combined generation for multiple operations (more cost effective)
    return generateAllFromImage({ imageBase64, imageType });
  } else {
    // Single operation
    const operation = operations[0];
    switch (operation) {
      case 'title':
        const title = await generateTitle({ imageBase64, imageType });
        return { title };
      case 'description':
        throw new Error('Description requires title input');
      case 'tags':
        throw new Error('Tags require title input');
      default:
        throw new Error('Unknown operation');
    }
  }
}
