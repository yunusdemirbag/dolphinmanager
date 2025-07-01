'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface MediaFile {
  file: File;
  preview: string;
  id: string;
}

interface Variation {
  size: string;
  pattern: string;
  price: number;
  is_active: boolean;
}

interface SubmissionData {
  title: string;
  description: string;
  price: number;
  quantity: number;
  tags: string[];
  isPersonalizable: boolean;
  personalizationRequired: boolean;
  personalizationInstructions: string;
  taxonomyId: number;
  hasVariations: boolean;
  variations: Variation[];
  selectedShopSection: string;
  shippingProfileId: string;
  whoMade: string;
  whenMade: string;
  isSupply: boolean;
  renewalOption: string;
  state: string;
}

interface ProductFormSubmissionProps {
  onSubmitSuccess?: (productTitle?: string) => void;
  onSubmitError?: (error: string) => void;
}

export function useProductFormSubmission({
  onSubmitSuccess,
  onSubmitError
}: ProductFormSubmissionProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);

  // Create FormData for submission
  const createFormData = useCallback((
    data: SubmissionData,
    productImages: MediaFile[],
    videoFile: MediaFile | null
  ): FormData => {
    const formData = new FormData();
    
    // Prepare listing data
    const listingData = {
      title: data.title,
      description: data.description || `Transform your space with this stunning ${data.title}!

🎨 KEY FEATURES:
• High-quality canvas material
• Professional frame included
• Ready to hang
• Multiple size options

🎁 Perfect for home decoration or as a gift!`,
      price: data.price,
      tags: data.tags.filter(tag => tag && tag.length <= 20),
      quantity: data.quantity,
      taxonomy_id: data.taxonomyId,
      who_made: data.whoMade,
      when_made: data.whenMade,
      is_supply: data.isSupply,
      renewal_option: data.renewalOption,
      state: data.state,
      is_personalizable: data.isPersonalizable,
      personalization_is_required: data.personalizationRequired,
      personalization_instructions: data.personalizationInstructions,
      personalization_char_count_max: 256,
      shipping_profile_id: data.shippingProfileId ? parseInt(data.shippingProfileId) : null,
      shop_section_id: data.selectedShopSection ? parseInt(data.selectedShopSection) : null,
      has_variations: data.hasVariations,
      variations: data.hasVariations ? data.variations.filter(v => v.is_active) : []
    };

    formData.append('listingData', JSON.stringify(listingData));

    // Add images
    productImages.forEach((mediaFile, index) => {
      formData.append(`imageFile_${index}`, mediaFile.file);
    });

    // Add video if exists
    if (videoFile) {
      formData.append('videoFile', videoFile.file);
    }

    return formData;
  }, []);

  // Submit to queue
  const submitToQueue = useCallback(async (
    data: SubmissionData,
    productImages: MediaFile[],
    videoFile: MediaFile | null,
    userId?: string
  ): Promise<boolean> => {
    if (isSubmitting) {
      console.log('⚠️ Already submitting, skipping...');
      return false;
    }

    setIsSubmitting(true);
    setProgress(0);

    try {
      // Progress simulation
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const formData = createFormData(data, productImages, videoFile);
      
      if (userId) {
        formData.append('userId', userId);
      }

      console.log('📤 Kuyruğa ekleniyor:', data.title);

      const response = await fetch('/api/products/queue', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Kuyruğa eklendi:', result);

      toast({
        title: "Başarılı!",
        description: "Ürün kuyruğa eklendi",
      });

      setTimeout(() => {
        onSubmitSuccess?.(data.title);
        setIsSubmitting(false);
        setProgress(0);
      }, 1000);

      return true;

    } catch (error) {
      console.error('❌ Queue submission error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Kuyruğa eklenirken hata: " + errorMessage,
      });

      onSubmitError?.(errorMessage);
      setIsSubmitting(false);
      setProgress(0);
      
      return false;
    }
  }, [isSubmitting, createFormData, toast, onSubmitSuccess, onSubmitError]);

  // Submit directly to Etsy
  const submitToEtsy = useCallback(async (
    data: SubmissionData,
    productImages: MediaFile[],
    videoFile: MediaFile | null,
    asActive: boolean = false
  ): Promise<boolean> => {
    if (isSubmitting) {
      console.log('⚠️ Already submitting, skipping...');
      return false;
    }

    setIsSubmitting(true);
    setProgress(0);

    try {
      // Progress simulation
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      // Update state based on active flag
      const submissionData = {
        ...data,
        state: asActive ? 'active' : 'draft'
      };

      const formData = createFormData(submissionData, productImages, videoFile);

      console.log(`🚀 Etsy'ye ${asActive ? 'aktif' : 'draft'} olarak gönderiliyor:`, data.title);
      console.log('📋 Submission data:', {
        title: data.title,
        hasVariations: data.hasVariations,
        variationCount: data.variations.filter(v => v.is_active).length,
        shopSection: data.selectedShopSection,
        taxonomyId: data.taxonomyId,
        imageCount: productImages.length
      });

      const response = await fetch('/api/etsy/listings/create', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Etsy API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });

        // Handle specific Etsy errors
        if (response.status === 401 || errorText.includes('unauthorized') || errorText.includes('token')) {
          throw new Error('Etsy bağlantısı kesildi. Lütfen Etsy hesabınızı yeniden bağlayın.');
        }

        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Etsy\'ye eklendi:', result);

      toast({
        title: "Başarılı!",
        description: `Ürün Etsy'ye ${asActive ? 'aktif olarak' : 'draft olarak'} eklendi`,
      });

      setTimeout(() => {
        onSubmitSuccess?.(data.title);
        setIsSubmitting(false);
        setProgress(0);
      }, 2000);

      return true;

    } catch (error) {
      console.error('❌ Etsy submission error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Etsy'ye gönderilirken hata: " + errorMessage,
      });

      onSubmitError?.(errorMessage);
      setIsSubmitting(false);
      setProgress(0);
      
      return false;
    }
  }, [isSubmitting, createFormData, toast, onSubmitSuccess, onSubmitError]);

  // Validate form data
  const validateForm = useCallback((
    data: SubmissionData,
    productImages: MediaFile[]
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!data.title || data.title.trim().length === 0) {
      errors.push('Ürün başlığı gerekli');
    }

    if (data.title.length > 140) {
      errors.push('Başlık 140 karakterden uzun olamaz');
    }

    // Etsy API title validation
    if (data.title && !/^[a-zA-Z0-9]/.test(data.title.trim())) {
      errors.push('Başlık bir harf veya rakam ile başlamalı');
    }

    // Check for invalid characters
    if (data.title && /[^\w\s\-|—.,!?&'():]/g.test(data.title)) {
      errors.push('Başlık geçersiz karakterler içeriyor');
    }

    if (productImages.length === 0) {
      errors.push('En az bir ürün görseli gerekli');
    }

    if (data.price <= 0 && !data.hasVariations) {
      errors.push('Fiyat 0\'dan büyük olmalı');
    }

    if (data.hasVariations && !data.variations.some(v => v.is_active && v.price > 0)) {
      errors.push('En az bir aktif varyasyonun fiyatı 0\'dan büyük olmalı');
    }

    if (data.tags.length === 0) {
      errors.push('En az bir etiket gerekli');
    }

    if (data.tags.some(tag => tag.length > 20)) {
      errors.push('Etiketler 20 karakterden uzun olamaz');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  return {
    isSubmitting,
    progress,
    submitToQueue,
    submitToEtsy,
    validateForm
  };
}