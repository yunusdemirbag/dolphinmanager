'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface ProductAutoGenerationProps {
  productImages: File[];
  onTitleGenerated: (title: string) => void;
  onDescriptionGenerated: (description: string) => void;
  onTagsGenerated: (tags: string[]) => void;
  onCategoryGenerated: (categoryId: string) => void;
}

export function useProductAutoGeneration({
  productImages,
  onTitleGenerated,
  onDescriptionGenerated,
  onTagsGenerated,
  onCategoryGenerated
}: ProductAutoGenerationProps) {
  const { toast } = useToast();

  // Clean title for Etsy requirements
  const cleanTitleForEtsy = useCallback((title: string): string => {
    // Remove quotes and extra spaces
    const cleaned = title.replace(/['\"]/g, '').replace(/\\s+/g, ' ').trim();
    
    // Ensure it's within Etsy's 140 character limit
    if (cleaned.length > 140) {
      return cleaned.substring(0, 137) + '...';
    }
    
    return cleaned;
  }, []);

  // Generate AI title from first image
  const generateTitle = useCallback(async (focusArea?: string): Promise<string> => {
    if (!productImages || productImages.length === 0) {
      throw new Error('No images available for title generation');
    }

    const firstImage = productImages.find(f => f.type?.startsWith('image/'));
    if (!firstImage) {
      throw new Error('No image file found');
    }

    console.log('🤖 AI ile otomatik başlık üretiliyor...', { 
      fileName: firstImage.name,
      fileSize: firstImage.size,
      focusArea 
    });

    const formData = new FormData();
    formData.append('image', firstImage);
    formData.append('focus', focusArea || '');
    formData.append('analysisType', 'basic');

    // Önce manzara analizi API'sini deneyelim
    let response;
    try {
      console.log("🏞️ Manzara analizi API çağrısı deneniyor...");
      response = await fetch("/api/ai/analyze-landscape", {
        method: "POST",
        body: formData,
      });
      
      if (response.ok) {
        const landscapeResult = await response.json();
        console.log("🏞️ Manzara analizi sonucu:", landscapeResult);
        
        if (landscapeResult.isLandscape) {
          console.log("✅ Görsel manzara/çiçek olarak tespit edildi!");
          
          // Sahne tipini kontrol et
          let sceneType = "manzara";
          if (landscapeResult.sceneType &&
              (landscapeResult.sceneType.toLowerCase().includes('floral') ||
               landscapeResult.sceneType.toLowerCase().includes('flower') ||
               landscapeResult.sceneType.toLowerCase().includes('garden') ||
               landscapeResult.sceneType.toLowerCase().includes('botanical'))) {
            sceneType = "çiçek/bahçe";
            console.log("🌸 Görsel çiçek/bahçe sahnesi olarak tespit edildi!");
          }
          
          // Manzara/çiçek sonuçlarını işle
          if (landscapeResult.title) {
            const cleanTitle = cleanTitleForEtsy(landscapeResult.title);
            console.log(`✅ ${sceneType} başlığı üretildi:`, { original: landscapeResult.title, clean: cleanTitle });
            
            // Notify parent component
            onTitleGenerated(cleanTitle);
            
            // Process tags if available
            if (landscapeResult.tags && landscapeResult.tags.length > 0) {
              onTagsGenerated(landscapeResult.tags);
            }
            
            // Process category if available
            if (landscapeResult.category && onCategoryGenerated) {
              onCategoryGenerated(landscapeResult.category);
            }
            
            // Process shop section if available
            if (landscapeResult.shopSection && onCategoryGenerated) {
              onCategoryGenerated(landscapeResult.shopSection);
            }
            
            return cleanTitle;
          }
        }
        
        console.log("⚠️ Görsel manzara/çiçek olarak tespit edilmedi veya başlık üretilemedi, normal analiz API'sine devam ediliyor...");
      }
    } catch (error) {
      console.error("❌ Manzara/çiçek analizi hatası:", error);
      console.log("⚠️ Manzara/çiçek analizi başarısız, normal analiz API'sine devam ediliyor...");
    }
    
    // Normal analiz API'si ile devam et
    console.log("🔄 Normal analiz API'si çağrılıyor...");
    response = await fetch("/api/ai/analyze-and-generate", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.title) {
      throw new Error('AI response did not include a title');
    }

    const cleanTitle = cleanTitleForEtsy(result.title);
    console.log('✅ AI başlık üretildi:', { original: result.title, clean: cleanTitle });

    // Notify parent component
    onTitleGenerated(cleanTitle);

    // Also process tags and category if available
    if (result.tags) {
      const tagArray = typeof result.tags === 'string' 
        ? result.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t && t.length <= 20)
        : [];
      if (tagArray.length > 0) {
        onTagsGenerated(tagArray);
      }
    }

    if (result.category && onCategoryGenerated) {
      onCategoryGenerated(result.category);
    }

    return cleanTitle;
  }, [productImages, cleanTitleForEtsy, onTitleGenerated, onTagsGenerated, onCategoryGenerated]);

  // Generate description based on title
  const generateDescription = useCallback(async (title: string): Promise<string> => {
    if (!title) {
      throw new Error('Title is required for description generation');
    }

    console.log('📝 AI ile açıklama üretiliyor...', { title });

    const response = await fetch('/api/ai/generate-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: `Generate a detailed Etsy product description for: "${title}".
        
If this is a landscape or cityscape (contains city names, landmarks, travel destinations):
- Emphasize the beauty of the location
- Mention travel memories and wanderlust
- Highlight how it brings exotic locations into the home

If this is a floral or garden scene (contains flowers, gardens, botanical elements):
- Emphasize the natural beauty and vibrant colors
- Mention how it brings nature indoors
- Highlight seasonal aspects (spring freshness, summer vibrancy, etc.)

For all descriptions:
- Include features, benefits, and why customers should buy this canvas wall art
- Make it engaging and SEO-friendly
- Focus on home decoration, quality, and customization options`,
        maxTokens: 500
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.text) {
      throw new Error('AI response did not include description text');
    }

    const description = result.text.trim();
    console.log('✅ AI açıklama üretildi:', { length: description.length });

    onDescriptionGenerated(description);
    return description;
  }, [onDescriptionGenerated]);

  // Generate tags based on title
  const generateTags = useCallback(async (title: string): Promise<string[]> => {
    if (!title) {
      throw new Error('Title is required for tag generation');
    }

    console.log('🏷️ AI ile etiketler üretiliyor...', { title });

    const response = await fetch('/api/ai/generate-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: `Generate 13 Etsy tags for this product title: "${title}". Return only comma-separated tags, each under 20 characters.

If this is a landscape or cityscape (contains city names, landmarks, travel destinations):
- Include location tags (city name, country)
- Include travel-related tags (travel gift, wanderlust)
- Include landmark tags if applicable

If this is a floral or garden scene (contains flowers, gardens, botanical elements):
- Include flower type tags (lavender, tulip, etc.)
- Include botanical tags (floral art, garden scene)
- Include seasonal tags if applicable (spring decor, etc.)

For all tags:
- Focus on wall art, canvas, decor, and relevant keywords
- Include room tags (living room, bedroom)
- Include style tags (modern, minimalist, etc.)`,
        maxTokens: 200
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.text) {
      throw new Error('AI response did not include tags');
    }

    const tags = result.text.trim()
      .split(',')
      .map((tag: string) => tag.trim())
      .filter((tag: string) => tag && tag.length <= 20)
      .slice(0, 13);

    console.log('✅ AI etiketler üretildi:', { count: tags.length, tags });

    onTagsGenerated(tags);
    return tags;
  }, [onTagsGenerated]);

  // Generate fallback title from image name
  const generateFallbackTitle = useCallback((imageName: string): string => {
    const baseName = imageName.replace(/\\.[^/.]+$/, "");
    const cleanName = baseName
      .replace(/[_-]/g, ' ')
      .replace(/\\b\\w/g, (l: string) => l.toUpperCase());
    
    const title = `${cleanName} Canvas Wall Art - Modern Home Decor`;
    return title.length > 140 ? title.substring(0, 137) + '...' : title;
  }, []);

  // Auto-generate all content
  const generateAll = useCallback(async (focusArea?: string) => {
    try {
      console.log('🚀 Tüm içerik otomatik üretiliyor...');
      
      // First generate title
      const title = await generateTitle(focusArea);
      
      // Then generate description and tags based on title
      await Promise.all([
        generateDescription(title),
        generateTags(title)
      ]);
      
      toast({
        title: "İçerik Üretildi",
        description: "Başlık, açıklama ve etiketler AI ile üretildi",
      });
      
    } catch (error) {
      console.error('❌ Auto-generation error:', error);
      
      // Fallback to manual title if images available
      if (productImages.length > 0) {
        const firstImage = productImages.find(f => f.type?.startsWith('image/'));
        if (firstImage) {
          const fallbackTitle = generateFallbackTitle(firstImage.name);
          onTitleGenerated(fallbackTitle);
          
          toast({
            title: "Fallback Başlık",
            description: "AI üretimi başarısız, dosya adından başlık oluşturuldu",
            variant: "default"
          });
        }
      }
      
      toast({
        variant: "destructive",
        title: "Üretim Hatası",
        description: "AI içerik üretimi başarısız oldu: " + (error instanceof Error ? error.message : 'Bilinmeyen hata'),
      });
    }
  }, [generateTitle, generateDescription, generateTags, generateFallbackTitle, onTitleGenerated, productImages, toast]);

  return {
    generateTitle,
    generateDescription,
    generateTags,
    generateAll,
    generateFallbackTitle
  };
}