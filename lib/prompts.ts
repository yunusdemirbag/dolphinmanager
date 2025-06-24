export interface PromptConfig {
  id: string;
  name: string;
  description: string;
  prompt: string;
  defaultPrompt: string;
}

export const titlePrompt: PromptConfig = {
  id: "title-prompt",
  name: "Başlık Oluşturma Promptu",
  description: "Görsel yüklendiğinde ürün başlığı oluşturmak için kullanılan prompt",
  prompt: `ROLE
You are the ULTIMATE ETSY SEO copywriter and conversion strategist, specializing exclusively in PHYSICAL canvas wall art for U.S. & global English-speaking buyers.

INPUT
• One product image **or** a concise English description of the artwork.

TASK
Generate ONE (1) high-converting Etsy product title (125–140 characters, Title Case).

STAGE 1 · IMAGE INSIGHT
• Identify the primary subject (e.g., Crowned Lion, Elegant Woman, Desert Sunset).  
• Note the art style (Modern Abstract, Minimalist Line, Pop Art, Boho, etc.).  
• Capture emotional tone (Bold, Serene, Empowering, Mystical…).  
• Record 1–2 dominant colours (Black & Gold, Navy Blue, Sage Green…).

STAGE 2 · TITLE BUILD
<Emotional Adjective> <Specific Subject> <Style> Canvas Wall Art Print | <Colour/Tone> <Room Keyword> Decor | <Value Phrase>

MANDATORY RULES
1. Include **Canvas Wall Art Print** exactly once.  
2. Use ONE high-volume room keyword: Living Room Decor, Bedroom Wall Decor, Office Artwork, Nursery Decor, Man Cave Art.  
3. Use ONE value phrase: Ready to Hang, Statement Piece, Luxury Gift, Limited Edition.  
4. Exclude all FORBIDDEN WORDS.  
5. Title length ≤ 140 characters (ideal 125–135).  
6. Title Case only; no quotes, parentheses, emojis, ALL-CAPS, SKUs, or word repetition > 1 (except Art/Wall/Canvas).

FORBIDDEN WORDS
digital, download, printable, instant, pdf, file, template, svg, vector, clipart, wallpaper, mockup, psd, poster, paper print, frame included, framed poster, diy, beautiful, nice, awesome, amazing, gorgeous, stunning, wonderful, cute, lovely, pretty, high quality, cheap, best price, sale, discount, free shipping, unique, perfect, special, exclusive, set, bundle

OUTPUT
Return ONLY the final title text—no explanations, no quotes.`,
  defaultPrompt: `TASK: Generate a single, SEO-optimized, high-conversion Etsy product title for a physical canvas wall art print based on the provided image analysis.

REQUIREMENTS:
- Maximum 140 characters
- Include primary keyword: "canvas wall art" or "wall decor"
- Include 2-3 relevant style descriptors (modern, minimalist, abstract, etc.)
- Include room/space keywords (living room, bedroom, office, etc.)
- Must be in English
- Focus on physical canvas prints, not digital downloads

STYLE GUIDELINES:
- Professional and appealing
- Search-friendly with high-demand keywords
- Clear about the physical product (canvas print)
- Include size hints if applicable

OUTPUT FORMAT:
Return only the title, no quotes, no explanations.

Example formats:
"Modern Abstract Canvas Wall Art Print - Minimalist Geometric Decor for Living Room"
"Boho Floral Canvas Print - Large Wall Art for Bedroom and Office Decoration"`
};

export const descriptionPrompt: PromptConfig = {
  id: "description-prompt",
  name: "Açıklama Oluşturma Promptu",
  description: "Ürün başlığına göre otomatik açıklama oluşturmak için kullanılan prompt (${title} değişkeni ile başlık eklenir)",
  prompt: `TASK: Generate a captivating, SEO-optimized Etsy product description for a physical canvas wall art print based on the provided product title.

TITLE: \${title}

REQUIREMENTS:
- Write in English
- Focus on physical canvas prints with frames
- Include emotional benefits and room transformation
- Mention gift occasions
- Include technical details about canvas quality
- Use bullet points for key features
- Include care instructions
- Mention multiple size options
- End with call-to-action

STRUCTURE:
1. Opening hook (2-3 sentences about the art's impact)
2. Key Features (bullet points)
3. Technical specifications
4. Gift suggestions
5. Care instructions
6. Call to action

STYLE:
- Professional yet warm
- SEO-friendly with natural keyword usage
- Descriptive but not overwhelming
- Customer-focused benefits

OUTPUT:
Return only the description text, properly formatted with line breaks.`,
  defaultPrompt: `TASK: Generate a captivating, SEO-optimized Etsy product description for a physical canvas wall art print based on the provided product title.

TITLE: \${title}

REQUIREMENTS:
- Write in English
- Focus on physical canvas prints with frames
- Include emotional benefits and room transformation
- Mention gift occasions
- Include technical details about canvas quality
- Use bullet points for key features
- Include care instructions
- Mention multiple size options
- End with call-to-action

STRUCTURE:
1. Opening hook (2-3 sentences about the art's impact)
2. Key Features (bullet points)
3. Technical specifications
4. Gift suggestions
5. Care instructions
6. Call to action

STYLE:
- Professional yet warm
- SEO-friendly with natural keyword usage
- Descriptive but not overwhelming
- Customer-focused benefits

OUTPUT:
Return only the description text, properly formatted with line breaks.`
};

export const tagsPrompt: PromptConfig = {
  id: "tags-prompt",
  name: "Etiket Oluşturma Promptu",
  description: "Ürün başlığına göre etiket oluşturmak için kullanılan prompt (${title} değişkeni ile başlık eklenir)",
  prompt: `ROLE
You are the ULTIMATE ETSY SEO strategist creating hyper-optimized TAGS for PHYSICAL canvas wall art aimed at U.S. & global English-speaking buyers.

INPUT
• The final product TITLE (English).

TITLE: \${title}

TASK
Generate EXACTLY 13 long-tail Etsy tags that maximize search reach and conversion.

MANDATORY RULES
1. **13 tags**, one line, **comma-separated**, all **lowercase**.  
2. Each tag ≤ 19 characters **including spaces**.  
3. **No single-word tags** (use 2–3-word phrases).  
4. No word appears **more than twice** across the set.  
5. Exclude all **FORBIDDEN_WORDS** (digital, download, printable, instant, pdf, file, template, svg, vector, mockup, wallpaper, psd, poster, paper print, frame included, framed poster, diy, beautiful, nice, awesome, amazing, gorgeous, stunning, wonderful, cute, lovely, pretty, high quality, cheap, best price, sale, discount, free shipping).  
6. No punctuation other than commas and spaces; no quotes, emojis, ALL-CAPS, or SKU codes.  

TAG MIX
• **3 subject tags** – main topic & variations (e.g., "crowned lion art").  
• **2 style tags** – art style or vibe ("modern abstract").  
• **2 color tags** – dominant palette ("black gold art").  
• **2 room tags** – placement context ("living room wall").  
• **2 format/value tags** – product benefit ("ready to hang").  
• **2 occasion/emotion tags** – gift or mood hook ("housewarming gift").  

OUTPUT
Return ONLY the 13 tags, comma-separated, nothing else.`,
  defaultPrompt: `TASK: Generate a hyper-optimized list of 13 Etsy tags for a physical canvas wall art print, based on the provided product title.

TITLE: \${title}

REQUIREMENTS:
- Exactly 13 tags
- Each tag maximum 20 characters
- Focus on high-search volume keywords
- Mix of broad and specific terms
- Include style, room, and occasion keywords
- All lowercase
- No special characters or quotes
- Separate with commas

TAG CATEGORIES TO INCLUDE:
- Primary keywords (wall art, canvas print)
- Style descriptors (modern, abstract, minimalist)
- Room/space keywords (living room, bedroom)
- Art categories (wall decor, home decor)
- Occasion keywords (housewarming, gift)
- Color descriptors if relevant
- Size descriptors if relevant

OUTPUT FORMAT:
Return only the tags separated by commas, no explanations.

Example: wall art,canvas print,modern art,living room,home decor,abstract,minimalist,bedroom art,office decor,housewarming,gift idea,wall decoration,contemporary`
};

export const categoryPrompt: PromptConfig = {
  id: "category-prompt",
  name: "Kategori Seçme Promptu",
  description: "Ürün başlığına göre mağaza kategorisi seçmek için kullanılan prompt (${title} ve ${categoryNames} değişkenleri eklenir)",
  prompt: `Aşağıdaki ürün başlığına en uygun mağaza kategorisini sadece aşağıdaki seçeneklerden birini seçerek döndür. Sadece kategori adını döndür.

BAŞLIK: \${title}

KATEGORİ SEÇENEKLERİ:
\${categoryNames}

Sadece kategori adını döndür, açıklama yapma.`,
  defaultPrompt: `Aşağıdaki ürün başlığına en uygun mağaza kategorisini sadece aşağıdaki seçeneklerden birini seçerek döndür. Sadece kategori adını döndür.

BAŞLIK: \${title}

KATEGORİ SEÇENEKLERİ:
\${categoryNames}

Sadece kategori adını döndür, açıklama yapma.`
};

export const prompts: PromptConfig[] = [
  titlePrompt,
  descriptionPrompt,
  tagsPrompt,
  categoryPrompt
];

// ID'ye göre prompt getirme fonksiyonu
export function getPromptById(id: string): PromptConfig | undefined {
  return prompts.find(p => p.id === id);
}

// Prompt güncelleme fonksiyonu
export function updatePrompt(id: string, newPrompt: string): void {
  const promptIndex = prompts.findIndex(p => p.id === id);
  if (promptIndex !== -1) {
    prompts[promptIndex].prompt = newPrompt;
  }
}

// Prompt sıfırlama fonksiyonu
export function resetPrompt(id: string): void {
  const promptIndex = prompts.findIndex(p => p.id === id);
  if (promptIndex !== -1) {
    prompts[promptIndex].prompt = prompts[promptIndex].defaultPrompt;
  }
}

// Tüm promptları sıfırlama
export function resetAllPrompts(): void {
  prompts.forEach(prompt => {
    prompt.prompt = prompt.defaultPrompt;
  });
}