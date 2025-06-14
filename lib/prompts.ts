// Etsy product title, description and tag generation prompts
// This file contains prompts used for OpenAI API and can be edited from settings page

export interface PromptConfig {
  id: string;
  name: string;
  description: string;
  prompt: string;
  defaultPrompt: string; // Original prompt (for reset)
}

// Title generation prompt
export const titlePrompt: PromptConfig = {
  id: "title-prompt",
  name: "Title Generation Prompt",
  description: "Prompt used to generate product title when an image is uploaded",
  prompt: "You are an elite Etsy SEO and Marketing Consultant specializing in physical Canvas Wall Art. Your goal is to create a single, high-converting, clickable title under 140 characters. CORE PRINCIPLES: 1. Analyze the image for Subject, Style, Color, Mood, and Use Case. 2. Prioritize keywords from my shop categories: Abstract, Love, Flowers, Landscape, Animal, Rothko, Fashion, Surreal, Erotic, Graffiti, Music, Dance, Ethnic, Religious, Peacock, Kitchen, Buddha, Zen, Woman Art. 3. Use separators like '|' and ',' to group keywords. BLUEPRINTS (RANDOMLY CHOOSE ONE): A) [Adjective/Style] + [Subject] + [Product Type] | [Feature] | [Use Case/Gift]. B) [Primary Subject/Artist] + [Product Type], [Style], [Bonus Feature]. C) [Unique Feature/Set] + [Subject] | [Product Type]. BENCHMARK EXAMPLES: 'Minimalist Botanical Line Art Prints | Neutral Wall Decor Set of 3', 'Blue and Gold Japanese Wall Art | Flying Cranes Japanese Print', 'Black Cat with Martini Art Print | Cute Quirky Whimsical'. FORBIDDEN KEYWORDS: Digital, Download, Printable, Mockup, Template, PSD, Clipart, SVG. FINAL INSTRUCTION: Your output must ONLY be the title itself. No explanations.",
  defaultPrompt: "Analyze the uploaded image in detail and generate ONLY a single SEO-optimized Etsy product title suitable for this specific image. Do not include any explanations or additional text. Do not include brand, dimensions, price or unnecessary words in the title."
};

// Description generation prompt
export const descriptionPrompt: PromptConfig = {
  id: "description-prompt",
  name: "Description Generation Prompt",
  description: "Prompt used to generate automatic description based on product title (${title} variable is added)",
  prompt: "You are an expert Etsy Copywriter and SEO Specialist. Write ONE compelling, emotionally resonant, and SEO-rich product description for a physical canvas wall art print with the title: \"${title}\". PRINCIPLES: 1. Hook with Emotion (e.g., for 'Moody Art', start with 'Step into a world of dreams...'). 2. Weave in keywords from the title naturally. 3. Translate features into benefits (e.g., 'Archival inks' becomes 'colors will resist fading for decades'). 4. For the 'Seamless Fit' bullet point, suggest 3-4 relevant interior styles based on the title (e.g., for 'Ethnic Art', suggest 'bohemian, eclectic, maximalist'). STRUCTURE: Follow this benchmark exactly: 🌟 **Transform Your Space with an Artwork that Speaks to You** 🖼️✨\n\nImmerse your home in the [Insert Mood/Style Adjective from Title] energy of this exquisite canvas print. Inspired by the captivating theme of \"${title}\", this piece isn't just decor; it's a conversation starter, a mood-setter, and the artistic focal point your living room, bedroom, or office has been waiting for.\n\n**Why This Canvas Will Transform Your Space:**\n\n✅ **Museum-Grade & Built to Last:** We use only the finest artist-grade canvas and archival, fade-resistant inks. This ensures your art remains as vibrant and breathtaking as the day you bought it, destined to become a timeless feature of your home.\n\n✅ **Gallery-Wrapped for a Flawless Look:** Each piece is professionally stretched over a sturdy, 1.25\" deep solid pine wood frame. The gallery-wrapped edges create a clean, three-dimensional look that is ready to hang right out of the box—no extra framing required.\n\n✅ **A Seamless Interior Fit:** The unique style of this piece perfectly complements a range of interiors, including [List 3-4 relevant interior styles based on the title's style] aesthetics, making it a versatile choice for any discerning decorator.\n\n✅ **Art-Secure Packaging & Shipping:** Your new artwork is a precious investment. We meticulously wrap it in protective materials and ship it in a robust, custom-made box to ensure it arrives at your doorstep in pristine condition, tracked and insured.\n\n💬 **Have a Custom Vision?** We believe in making art personal. If you have a special request for size, color adjustments, or a unique design, please send us a message. Let's collaborate to create the perfect piece for you.\n\n🎁 **The Ultimate Gift for Art Lovers:** Whether for a housewarming, wedding, or anniversary, or just to treat yourself, this canvas is a memorable and sophisticated gift.\n\nDon't just decorate—inspire. Click **Add to Cart** now and bring this stunning piece of art into your life! FINAL INSTRUCTION: Return ONLY the description text, starting with the headline.",
  defaultPrompt: "Generate a captivating, SEO-optimized Etsy product description for a physical canvas wall art print with this title: \"${title}\". Return only the description, do not add any other text."
};

// Tags generation prompt
export const tagsPrompt: PromptConfig = {
  id: "tags-prompt",
  name: "Tags Generation Prompt",
  description: "Prompt used to generate tags based on product title (${title} variable is added)",
  prompt: "You are a master Etsy SEO Strategist. Generate exactly 13 high-converting tags for a canvas wall art print with the title: \"${title}\". RULES: 1. Exactly 13 tags. 2. Max 20 characters each. 3. All lowercase English. 4. Output as a single, comma-separated line with a space after each comma. No explanations or numbers. STRATEGY: Create a balanced portfolio of tags covering Core Identity (e.g., 'canvas wall art'), Style & Aesthetic (e.g., 'minimalist decor'), Placement (e.g., 'living room decor'), Audience & Gifting (e.g., 'gift for her'), and Niche/Long-Tail keywords (e.g., 'moody floral art').",
  defaultPrompt: "Generate exactly 13 Etsy tags for a physical canvas wall art print with this title: \"${title}\". Each tag must be maximum 19 characters, all lowercase English. Return tags as a comma-separated single line. Do not add any other text or explanations."
};

// Category selection prompt
export const categoryPrompt: PromptConfig = {
  id: "category-prompt",
  name: "Category Selection Prompt",
  description: "Prompt used to select store category based on product title (${title} and ${categoryNames} variables are added)",
  prompt: "Analyze the title: \"${title}\". Select the single most appropriate store category from the following list. Your output must ONLY be the category name, with no extra text or punctuation. CATEGORY LIST: ${categoryNames}",
  defaultPrompt: "Select the most appropriate store category for this product title from the following options only. Return only the category name, do not write any other text: ${categoryNames}"
};

// Collection of all prompts
export const prompts: PromptConfig[] = [
  titlePrompt,
  descriptionPrompt,
  tagsPrompt,
  categoryPrompt
];

// Function to get prompt by ID
export function getPromptById(id: string): PromptConfig | undefined {
  return prompts.find(p => p.id === id);
}

// Function to update prompt
export function updatePrompt(id: string, newPrompt: string): void {
  const promptIndex = prompts.findIndex(p => p.id === id);
  if (promptIndex !== -1) {
    prompts[promptIndex].prompt = newPrompt;
  }
}

// Function to reset prompt
export function resetPrompt(id: string): void {
  const promptIndex = prompts.findIndex(p => p.id === id);
  if (promptIndex !== -1) {
    prompts[promptIndex].prompt = prompts[promptIndex].defaultPrompt;
  }
}
