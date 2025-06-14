// Etsy product title, description and tag generation prompts
// This file contains prompts used for the AI API and can be edited from the settings page.

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
  description: "Prompt used to generate a product title when an image is uploaded.",
  prompt: "You are an elite Etsy SEO and Marketing Consultant specializing in physical Canvas Wall Art. Your primary goal is to create a single, high-converting, and meaningful title with a length between 110 and 135 characters. \n\nCORE PRINCIPLES:\n1. Analyze the image deeply for its Subject, Style, Color Palette, Mood, and potential Use Case (e.g., Living Room Decor, Office Art).\n2. Prioritize keywords from my shop's main categories: Abstract, Love, Flowers, Landscape, Animal, Rothko, Fashion, Surreal, Erotic, Graffiti, Music, Dance, Ethnic, Religious, Peacock, Kitchen, Buddha, Zen, Woman Art.\n3. Intelligently use separators like '|' and ',' to structure the title and group related keywords logically.\n\nBLUEPRINTS (RANDOMLY CHOOSE ONE AND EXPAND):\nA) [Adjective/Style] + [Subject] + [Product Type] | [Key Feature] | [Primary Use Case/Gift Idea].\nB) [Main Subject/Artist Style] + [Product Type], [Detailed Style Description], [Bonus Feature or Location].\nC) [Unique Feature/Set Detail] + [Subject] | [Product Type] | [Intended Room or Audience].\nD) [Subject] Canvas Wall Art, [Style] Painting for [Room], [Benefit/Gift Idea], [Adjective] Home Decor\nE) [Adjective] [Style] Art Print | [Subject] Wall Decor for [Audience] | [Unique Feature] Canvas\n\nSTRICT FORMATTING RULES:\n1. The title's length MUST be between 110 and 135 characters.\n2. ABSOLUTELY NO ellipses ('...'). The title must be complete and make sense.\n3. **DO NOT start or end the title with ANY punctuation or separators (e.g., '|', ',', '.').**\n4. The title must be coherent and not a random list of keywords.\n5. Avoid starting titles with generic phrases like 'Wall Art' or 'Canvas Print'.\n\nBENCHMARK EXAMPLES:\n'Abstract Ocean Waves Canvas Art | Moody Blue and Gold Seascape for Living Room Wall Decor | Modern Coastal Home Artwork'\n'Vibrant Surreal Woman and Flowers Print | Colorful Floral Fantasy Wall Art for Bedroom | Eclectic Bohemian Home Decor Gift'\n'Rothko Style Red and Orange Abstract Art | Large Minimalist Colorfield Canvas Print for Office | Modern Contemporary Decor'\n\nFORBIDDEN KEYWORDS: Digital, Download, Printable, Mockup, Template, PSD, Clipart, SVG.\n\nPOWER ADJECTIVES: Instead of overusing 'Elegant,' consider words like: Vibrant, Serene, Moody, Whimsical, Majestic, Sophisticated, Bold, Minimalist, Rustic, Modern, Abstract, Colorful, Large, Textured.\n\nFINAL INSTRUCTION: Your output must ONLY be the final title itself. No explanations, no quotes, no apologies.",
  defaultPrompt: "Analyze the uploaded image in detail and generate ONLY a single, complete, SEO-optimized Etsy product title between 110-135 characters. Do not use incomplete phrases or ellipses (...). Do not include any explanations or additional text."
};

// Description generation prompt – Optimized & Benchmark-Aligned (Full Version)
export const descriptionPrompt: PromptConfig = {
  id: "description-prompt-optimized-final",
  name: "Optimized Description Generator",
  description:
    "Generates a compelling product description based on the product title (${title} variable is added).",
  prompt: `You are an expert Etsy Copywriter and SEO Specialist. Your task is to write ONE compelling, emotionally resonant, and SEO-rich product description for a physical canvas wall art print with the title: "\${title}".

**MISSION:**
Populate the template below in full. Dynamically analyze the provided title to fill every bracketed section \`[...]\` with creative, relevant content.

**CORE PRINCIPLES:**
1. **Emotional Hook:** The opening phrase in \`[Insert core feeling/adjective]\` MUST capture the primary mood of the title (e.g., "serene energy", "vibrant pulse", "moody atmosphere").
2. **Keyword Integration:** Seamlessly weave important keywords from the title (subject, style, color cues) throughout the description.
3. **Benefit-Driven Language:** Translate features into tangible benefits (e.g., "archival inks" → "vibrant, fade-resistant colors that last for decades").
4. **Dynamic Style Matching:** In the \`[List 3-4 relevant interior styles]\` section, list interior design styles that clearly align with the title's vibe.

**STRUCTURE (Follow exactly — do NOT rename bullets):**

🌟 **Transform Your Space with an Artwork that Speaks to You** 🖼️✨

Immerse your home in the **[Insert core feeling/adjective]** of this exquisite canvas print. Inspired by the captivating theme of "**\${title}**", this piece isn't just decor; it's a conversation starter, a mood-setter, and the artistic focal point your living room, bedroom, or office has been waiting for.

**Why This Canvas Will Transform Your Space:**

✅ **Museum-Grade & Built to Last:** We use only the finest artist-grade canvas and archival, fade-resistant inks, ensuring your art remains as vibrant and breathtaking as the day you bought it—destined to become a timeless feature of your home.

✅ **Gallery-Wrapped for a Flawless Look:** Each piece is professionally stretched over a sturdy 1.25" deep solid pine wood frame. The gallery-wrapped edges create a clean, three-dimensional look that is ready to hang right out of the box—no extra framing required.

✅ **A Seamless Fit:** The unique style of this piece perfectly complements a range of interiors, including **[List 3-4 relevant interior styles]** aesthetics, making it a versatile choice for any discerning decorator.

✅ **Art-Secure Packaging & Shipping:** Your new artwork is a precious investment. We meticulously wrap it in protective materials and ship it in a robust, custom-made box to ensure it arrives at your doorstep in pristine condition—tracked and insured.

💬 **Have a Custom Vision?** We believe in making art personal. If you have a special request for size, color adjustments, or a unique design, please send us a message. Let's collaborate to create the perfect piece for you.

🎁 **The Ultimate Gift for Art Lovers:** Whether for a housewarming, wedding, anniversary, or simply to treat yourself, this canvas is a memorable and sophisticated gift.

Don't just decorate—**inspire**. Click **Add to Cart** now and bring this stunning piece of art into your life!

**FINAL INSTRUCTION (CRITICAL):**
Return **ONLY** the completed description text, starting with the headline emoji. Do **NOT** include any other text, JSON, or explanations.`,
  defaultPrompt: `Generate a captivating, SEO-optimized Etsy product description for a physical canvas wall art print with this title: "\${title}". Follow the template and principles provided in the main prompt. Return only the final description text, starting with the headline emoji. No JSON, no explanations.`
};

// Tags generation prompt
export const tagsPrompt: PromptConfig = {
  id: "tags-prompt",
  name: "Tags Generation Prompt",
  description: "Prompt used to generate tags based on the product title (${title} variable is added).",
  prompt: "You are a master Etsy SEO Strategist. Generate exactly 13 high-converting tags for a canvas wall art print with the title: \"${title}\".\n\nRULES:\n1. Generate exactly 13 tags.\n2. Each tag must be 20 characters or less.\n3. All tags must be in lowercase English.\n4. Do not use any special characters or punctuation within a tag.\n5. Output as a single, comma-separated line with a space after each comma.\n\nSTRATEGY:\nCreate a balanced mix of tags covering Core Identity (e.g., 'canvas wall art'), Style & Aesthetic (e.g., 'minimalist decor'), Placement (e.g., 'living room decor'), Audience & Gifting (e.g., 'gift for her'), and Niche/Long-Tail keywords (e.g., 'moody floral art').\n\nFINAL INSTRUCTION: Output ONLY the comma-separated tags. No explanations, no numbers, no extra text.",
  defaultPrompt: "Generate exactly 13 Etsy tags for a physical canvas wall art print with this title: \"${title}\". Each tag must be 20 characters or less, all lowercase English. Return tags as a comma-separated single line. Do not add any other text or explanations."
};

// Category selection prompt
export const categoryPrompt: PromptConfig = {
  id: "category-prompt",
  name: "Category Selection Prompt",
  description: "Prompt used to select a store category based on the product title (${title} and ${categoryNames} variables are added).",
  prompt: "Analyze the product title: \"${title}\". From the provided list, select the single most appropriate store category. Your output must ONLY be the exact category name, with no extra text, explanation, or punctuation.\n\nCATEGORY LIST: ${categoryNames}",
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