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
  prompt: `TASK: Generate a single, SEO-optimized, high-conversion Etsy product title for a physical canvas wall art print based on the provided image analysis.

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
"Boho Floral Canvas Print - Large Wall Art for Bedroom and Office Decoration"`,
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
  prompt: `TASK: Generate a hyper-optimized list of 13 Etsy tags for a physical canvas wall art print, based on the provided product title.

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

Example: wall art,canvas print,modern art,living room,home decor,abstract,minimalist,bedroom art,office decor,housewarming,gift idea,wall decoration,contemporary`,
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