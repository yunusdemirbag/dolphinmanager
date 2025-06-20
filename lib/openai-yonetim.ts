// openai-yonetim.ts
import { createClientFromBrowser } from "@/lib/supabase/client";

export interface PromptConfig {
  id: string;
  name: string;
  description: string;
  prompt: string;
  defaultPrompt?: string;
}

// User AI settings interface
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
 * US and global market focused Etsy title generation for physical canvas wall art
 */
export const titlePrompt: PromptConfig = {
  id: "title_prompt",
  name: "Title Generation Prompt",
  description: "Prompt used for generating Etsy product titles",
  prompt: `You are an Etsy expert and you create SEO-friendly titles for canvas wall art products.

Create a sales-boosting, SEO-friendly title for this canvas wall art image.

The title should have these characteristics:
• 80-100 characters long
• Title Case (First Letters Capitalized)
• Keywords at the beginning of the title
• Attractive and engaging
• Include the main features of the product
• Use keywords like wall art, canvas print, decoration
• Specify colors, style and theme
• DO NOT include size information

The title should NOT include:
• Emojis or special characters
• Excessively repeated words
• Unnecessary phrases like "For Sale", "Custom", "On Etsy"
• Price, discount or promotional information
• Punctuation at the beginning and end

EXAMPLES:
✓ "Minimalist Abstract Canvas Print Blue White Geometric Wall Art Modern Home Decor"
✓ "Vintage Botanical Flower Collection Canvas Wall Art Bedroom Decoration"
✓ "Modern Abstract Landscape Canvas Print Turquoise Gold Wall Art Living Room Decor"

Carefully examine the image and pay attention to:
• Color scheme and tones
• Art style (abstract, minimalist, realistic, etc.)
• Main themes and motifs
• Emotion and atmosphere
• BE SPECIFIC about cultural, historical, and artistic elements

Return ONLY the final title string, nothing else.`.trim(),
};

/**
 * TAG PROMPT - US & GLOBAL MARKET OPTIMIZED  
 * 13 US and global market optimized SEO tag generation
 */
export const tagPrompt: PromptConfig = {
  id: "tags_prompt",
  name: "Tag Generation Prompt",
  description: "Prompt used for generating Etsy tags",
  prompt: `You are an Etsy expert and you create effective tags for canvas wall art products.

Create 13 effective Etsy tags for this product.

Product title: "{{TITLE}}"

Tags should have these characteristics:
• Each tag maximum 20 characters
• All lowercase
• Must be in English
• Reflect main themes of the title
• Include high search volume keywords
• Include terms related to wall art, canvas, decoration
• Add color, style, theme tags
• Add room type tags (bedroom decor, living room art etc.)
• Add art style tags (abstract, minimalist, modern etc.)

Tags should NOT include:
• Repeated words
• Too general terms
• Too specific/rarely searched terms
• Terms banned by Etsy (handmade, custom etc.)
• Emojis or special characters

Return tags separated by commas in a single line.
Example format: "wall art, canvas print, abstract art, blue decor, minimalist, modern, living room, home decor, wall decor, bedroom art, office decor, geometric, art print"

Return ONLY the tags separated by commas, no other explanation.`.trim(),
};

/**
 * CATEGORY SELECTION PROMPT - US & GLOBAL OPTIMIZED
 * Most suitable category selection with US market analysis
 */
export const categoryPrompt: PromptConfig = {
  id: "category_prompt",
  name: "Category Selection Prompt",
  description: "Prompt used for selecting canvas categories",
  prompt: `You are a category selection expert. You need to select the most suitable category based on the given product title.

SELECT from the following categories:
{{CATEGORIES}}

Product title: "{{TITLE}}"

Please select only ONE category from the above list and write ONLY the category name, no other explanation.
If you're not sure, select the closest category.`.trim(),
};

/**
 * FOCUS TITLE GENERATION PROMPT - US & GLOBAL OPTIMIZED
 * US market focused keyword integration
 */
export const focusTitlePrompt: PromptConfig = {
  id: "focus_title_prompt",
  name: "Focused Title Generation Prompt",
  description: "Prompt used for generating Etsy product titles focused on a specific keyword",
  prompt: `You are an Etsy expert and you create SEO-friendly titles for canvas wall art products.

Create a sales-boosting, SEO-friendly title for this canvas wall art image.
You must use this keyword in the title and place it at the beginning: "{{FOCUS_KEYWORD}}"

The title should have these characteristics:
• 80-100 characters long
• Title Case (First Letters Capitalized)
• Keywords at the beginning of the title (especially focus keyword)
• Attractive and engaging
• Include the main features of the product
• Use keywords like wall art, canvas print, decoration
• Specify colors, style and theme
• DO NOT include size information

The title should NOT include:
• Emojis or special characters
• Excessively repeated words
• Unnecessary phrases like "For Sale", "Custom", "On Etsy"
• Price, discount or promotional information
• Punctuation at the beginning and end

EXAMPLES:
✓ "{{FOCUS_KEYWORD}} Minimalist Abstract Canvas Print Blue White Geometric Wall Art"
✓ "{{FOCUS_KEYWORD}} Vintage Botanical Flower Collection Canvas Wall Art Bedroom"
✓ "{{FOCUS_KEYWORD}} Modern Abstract Landscape Canvas Print Turquoise Gold Wall Art"

Carefully examine the image and pay attention to:
• Color scheme and tones
• Art style (abstract, minimalist, realistic, etc.)
• Main themes and motifs
• Emotion and atmosphere
• BE SPECIFIC about cultural, historical, and artistic elements

Return ONLY the final title string, nothing else.`.trim(),
};

/**
 * DESCRIPTION GENERATION PROMPT - US & GLOBAL OPTIMIZED
 * Detailed product description generation for Etsy
 */
export const descriptionPrompt: PromptConfig = {
  id: "description_prompt",
  name: "Description Generation Prompt",
  description: "Prompt used for generating Etsy product descriptions",
  prompt: `You are an Etsy expert and you create compelling product descriptions for canvas wall art products.

Create a detailed, SEO-friendly product description for this canvas wall art.

The description should include:
• Captivating opening that highlights the main appeal
• Detailed product features and benefits
• Size and material information (if provided)
• Suitable room/space recommendations
• Care instructions
• Perfect gift occasions
• SEO keywords naturally integrated

The description should be:
• 150-300 words long
• Professional yet warm tone
• Easy to read with bullet points or short paragraphs
• Include relevant keywords for Etsy search
• Appeal to emotions and lifestyle

Return ONLY the description text, nothing else.`.trim(),
};

// ===== HELPER FUNCTIONS =====

/**
 * Get user AI settings
 */
export const getUserAISettings = async (): Promise<AISettings> => {
  try {
    const response = await fetch("/api/ai/settings");
    
    if (!response.ok) {
      console.warn("Could not fetch AI settings, using default settings");
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
    console.error("Error fetching AI settings:", error);
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
 * Normal title generation function
 */
export const generateTitle = async (imageFile: File): Promise<string> => {
  const formData = new FormData();
  formData.append("image", imageFile);
  
  // Get user settings
  const settings = await getUserAISettings();
  
  // Use custom prompt if available, otherwise use default
  const promptToUse = settings.title_prompt || titlePrompt.prompt;
  formData.append("prompt", promptToUse);
  
  // Add model and temperature settings
  formData.append("model", settings.model);
  formData.append("temperature", settings.temperature.toString());
  
  const response = await fetch("/api/ai/generate-etsy-title", {
    method: "POST",
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error("Could not generate title");
  }
  
  const data = await response.json();
  return data.title || "";
};

/**
 * Focus keyword title generation
 */
export const generateTitleWithFocus = async (imageFile: File, focusKeyword: string): Promise<string> => {
  const formData = new FormData();
  formData.append("image", imageFile);
  formData.append("focusKeyword", focusKeyword);
  
  // Get user settings
  const settings = await getUserAISettings();
  
  // Use custom prompt if available, otherwise use default
  const promptToUse = settings.focus_title_prompt || focusTitlePrompt.prompt;
  formData.append("prompt", promptToUse);
  
  // Add model and temperature settings
  formData.append("model", settings.model);
  formData.append("temperature", settings.temperature.toString());
  
  const response = await fetch("/api/ai/generate-etsy-title", {
    method: "POST", 
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error("Could not generate focus title");
  }
  
  const data = await response.json();
  return data.title || "";
};

/**
 * Tag generation function
 */
export const generateTags = async (title: string, imageFile?: File): Promise<string[]> => {
  // Get user settings
  const settings = await getUserAISettings();
  
  // Use custom prompt if available, otherwise use default
  const promptToUse = settings.tags_prompt || tagPrompt.prompt;
  
  // Use form data if image is available, otherwise JSON
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
    
    if (!response.ok) throw new Error("Could not generate tags");
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
    
    if (!response.ok) throw new Error("Could not generate tags");
    const data = await response.json();
    return data.tags || [];
  }
};

/**
 * Category selection function
 */
export const selectCategory = async (title: string, categoryNames: string[]): Promise<string> => {
  // Get user settings
  const settings = await getUserAISettings();
  
  // Use custom prompt if available, otherwise use default
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
    throw new Error("Could not select category");
  }
  
  const selectedCategory = await response.text();
  return selectedCategory.trim();
};

/**
 * IMAGE ANALYSIS AND CONTENT GENERATION FUNCTION
 * For /api/ai/generate-all endpoint
 */
export const generateAllFromImage = async (imageBase64: string, imageType: string, prompt?: string): Promise<string> => {
  // OpenAI API key check
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error("OpenAI API key not configured");
  }

  // Get user settings (using supabase instead of fetch since this is server-side)
  let model = "gpt-4.1-mini";
  let temperature = 0.7;
  
  try {
    const supabase = createClientFromBrowser();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      // TODO: Implement ai_settings table in database schema
      // const { data } = await supabase
      //   .from('ai_settings')
      //   .select('model, temperature')
      //   .eq('user_id', session.user.id)
      //   .single();
      
      // if (data) {
      //   model = data.model;
      //   temperature = data.temperature;
      // }
    }
  } catch (error) {
    console.warn("Could not fetch AI settings, using default settings:", error);
  }

  // OpenAI API call
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
    throw new Error(`OpenAI API error (${openaiResponse.status}): ${errorText}`);
  }

  const openaiData = await openaiResponse.json();
  const result = openaiData.choices?.[0]?.message?.content?.trim();
  
  if (!result) {
    throw new Error("No content found in OpenAI response");
  }

  return result;
};

/**
 * Description generation function
 */
export const generateDescription = async (title: string, imageFile?: File): Promise<string> => {
  // Get user settings
  const settings = await getUserAISettings();
  
  // Use form data if image is available, otherwise JSON
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
    
    if (!response.ok) throw new Error("Could not generate description");
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
    
    if (!response.ok) throw new Error("Could not generate description");
    const data = await response.json();
    return data.description || "";
  }
};