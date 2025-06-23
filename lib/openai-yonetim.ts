import { getPromptById } from './prompts';

// OpenAI API çağrıları için temel fonksiyonlar
export async function generateTitleWithFocus(imageBase64: string, focusPrompt?: string): Promise<string> {
  try {
    const titlePromptConfig = getPromptById('title-prompt');
    const prompt = focusPrompt || titlePromptConfig?.prompt || 'Generate an SEO-optimized Etsy product title for this canvas wall art image.';
    
    const response = await fetch('/api/ai/generate-etsy-title', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageBase64,
        prompt: prompt
      }),
    });

    if (!response.ok) {
      throw new Error('Title generation failed');
    }

    const data = await response.json();
    return data.title || 'Beautiful Canvas Wall Art Print - Modern Home Decor';
  } catch (error) {
    console.error('Title generation error:', error);
    return 'Beautiful Canvas Wall Art Print - Modern Home Decor';
  }
}

export async function categoryPrompt(title: string, categoryNames: string[]): Promise<string> {
  try {
    const categoryPromptConfig = getPromptById('category-prompt');
    let prompt = categoryPromptConfig?.prompt || 'Select the best category for this product title.';
    
    // Değişkenleri değiştir
    prompt = prompt.replace('${title}', title);
    prompt = prompt.replace('${categoryNames}', categoryNames.join('\n'));

    const response = await fetch('/api/ai/generate-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        maxTokens: 50
      }),
    });

    if (!response.ok) {
      throw new Error('Category selection failed');
    }

    const data = await response.json();
    const selectedCategory = data.text?.trim();
    
    // Seçilen kategorinin listede olup olmadığını kontrol et
    if (selectedCategory && categoryNames.includes(selectedCategory)) {
      return selectedCategory;
    }
    
    // Fallback: ilk kategoriyi döndür
    return categoryNames[0] || 'Home';
  } catch (error) {
    console.error('Category selection error:', error);
    return categoryNames[0] || 'Home';
  }
}

export async function tagPrompt(title: string): Promise<string[]> {
  try {
    const tagPromptConfig = getPromptById('tags-prompt');
    let prompt = tagPromptConfig?.prompt || 'Generate 13 Etsy tags for this product title.';
    
    // Değişkeni değiştir
    prompt = prompt.replace('${title}', title);

    const response = await fetch('/api/ai/generate-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        maxTokens: 200
      }),
    });

    if (!response.ok) {
      throw new Error('Tag generation failed');
    }

    const data = await response.json();
    const tagsText = data.text?.trim();
    
    if (tagsText) {
      // Virgülle ayrılmış etiketleri diziye çevir
      const tags = tagsText.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0);
      
      // Maksimum 13 etiket al
      return tags.slice(0, 13);
    }
    
    // Fallback etiketler
    return [
      'wall art',
      'canvas print',
      'home decor',
      'modern art',
      'wall decoration',
      'living room',
      'bedroom art',
      'office decor',
      'abstract art',
      'contemporary',
      'minimalist',
      'housewarming',
      'gift idea'
    ];
  } catch (error) {
    console.error('Tag generation error:', error);
    return [
      'wall art',
      'canvas print',
      'home decor',
      'modern art',
      'wall decoration',
      'living room',
      'bedroom art',
      'office decor',
      'abstract art',
      'contemporary',
      'minimalist',
      'housewarming',
      'gift idea'
    ];
  }
}

export async function titlePrompt(imageBase64: string): Promise<string> {
  return generateTitleWithFocus(imageBase64);
}

export async function descriptionPrompt(title: string): Promise<string> {
  try {
    const descriptionPromptConfig = getPromptById('description-prompt');
    let prompt = descriptionPromptConfig?.prompt || 'Generate a compelling product description for this title.';
    
    // Değişkeni değiştir
    prompt = prompt.replace('${title}', title);

    const response = await fetch('/api/ai/generate-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        maxTokens: 800
      }),
    });

    if (!response.ok) {
      throw new Error('Description generation failed');
    }

    const data = await response.json();
    return data.text || generateFallbackDescription(title);
  } catch (error) {
    console.error('Description generation error:', error);
    return generateFallbackDescription(title);
  }
}

function generateFallbackDescription(title: string): string {
  return `Transform your space with this stunning ${title.toLowerCase()}!

🎨 KEY FEATURES:
• High-quality canvas material with vibrant, fade-resistant colors
• Professional wooden frame included
• Ready to hang with pre-installed hanging hardware
• Multiple size options available
• Printed with premium archival inks

✨ PERFECT FOR:
• Living rooms and bedrooms
• Offices and workspaces  
• Housewarming gifts
• Art lovers and interior designers

📏 AVAILABLE SIZES:
Multiple sizes available to fit any space perfectly.

🎁 GIFT READY:
Makes an excellent gift for birthdays, holidays, housewarming parties, or any special occasion.

💝 CARE INSTRUCTIONS:
Clean gently with a dry cloth. Avoid direct sunlight for optimal color preservation.

Order now and transform your walls with this beautiful piece of art!`;
}

// Kategori seçimi için uygunluk fonksiyonu
export async function selectCategory(title: string, categories: Array<{title: string, shop_section_id: number}>): Promise<number | null> {
  try {
    const categoryNames = categories.map(cat => cat.title);
    const selectedCategoryName = await categoryPrompt(title, categoryNames);
    
    const selectedCategory = categories.find(cat => cat.title === selectedCategoryName);
    return selectedCategory?.shop_section_id || null;
  } catch (error) {
    console.error('Category selection error:', error);
    return null;
  }
}