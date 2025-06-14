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
  prompt: "Analyze the uploaded image in detail and generate ONLY a single SEO-optimized Etsy product title suitable for this specific image. Do not include any explanations or additional text. Do not include brand, dimensions, price or unnecessary words in the title.",
  defaultPrompt: "Analyze the uploaded image in detail and generate ONLY a single SEO-optimized Etsy product title suitable for this specific image. Do not include any explanations or additional text. Do not include brand, dimensions, price or unnecessary words in the title."
};

// Description generation prompt
export const descriptionPrompt: PromptConfig = {
  id: "description-prompt",
  name: "Description Generation Prompt",
  description: "Prompt used to generate automatic description based on product title (${title} variable is added)",
  prompt: "Generate a captivating, SEO-optimized Etsy product description for a physical canvas wall art print with this title: \"${title}\". Return only the description, do not add any other text.",
  defaultPrompt: "Generate a captivating, SEO-optimized Etsy product description for a physical canvas wall art print with this title: \"${title}\". Return only the description, do not add any other text."
};

// Tags generation prompt
export const tagsPrompt: PromptConfig = {
  id: "tags-prompt",
  name: "Tags Generation Prompt",
  description: "Prompt used to generate tags based on product title (${title} variable is added)",
  prompt: "Generate exactly 13 Etsy tags for a physical canvas wall art print with this title: \"${title}\". Each tag must be maximum 19 characters, all lowercase English. Return tags as a comma-separated single line. Do not add any other text or explanations.",
  defaultPrompt: "Generate exactly 13 Etsy tags for a physical canvas wall art print with this title: \"${title}\". Each tag must be maximum 19 characters, all lowercase English. Return tags as a comma-separated single line. Do not add any other text or explanations."
};

// Category selection prompt
export const categoryPrompt: PromptConfig = {
  id: "category-prompt",
  name: "Category Selection Prompt",
  description: "Prompt used to select store category based on product title (${title} and ${categoryNames} variables are added)",
  prompt: "Select the most appropriate store category for this product title from the following options only. Return only the category name, do not write any other text: ${categoryNames}",
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
