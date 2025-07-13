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
  type?: string;
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
    videoFile: MediaFile | null,
    digitalFiles: File[] = []
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
      variations: data.hasVariations ? data.variations.filter(v => v.is_active) : [],
      // Digital product type handling
      ...(data.type === 'download' && {
        type: 'download'
      }),
      // Digital files ekleme
      ...(digitalFiles.length > 0 && {
        digitalFiles: digitalFiles
      })
    };

    formData.append('listingData', JSON.stringify(listingData));

    // Add AI-selected shopSection if available (for digital products)
    console.log(`🔍 Digital product check: type=${data.type}, aiSelectedShopSection=${(window as any).aiSelectedShopSection}`);
    if (data.type === 'download') {
      if ((window as any).aiSelectedShopSection) {
        formData.append('shopSection', (window as any).aiSelectedShopSection);
        console.log(`📤 AI shopSection FormData'ya eklendi: ${(window as any).aiSelectedShopSection}`);
      } else {
        console.log(`⚠️ AI shopSection bulunamadı! window.aiSelectedShopSection undefined`);
      }
    }

    // Add images
    productImages.forEach((mediaFile, index) => {
      formData.append(`imageFile_${index}`, mediaFile.file);
    });

    // Add video if exists
    if (videoFile) {
      formData.append('videoFile', videoFile.file);
    }

    // Add digital files
    digitalFiles.forEach((digitalFile, index) => {
      formData.append(`digitalFile_${index}`, digitalFile);
      console.log(`📁 Digital dosya ${index} FormData'ya eklendi:`, digitalFile.name, (digitalFile.size / 1024 / 1024).toFixed(2), 'MB');
    });
    
    if (digitalFiles.length > 0) {
      console.log(`📤 Toplam ${digitalFiles.length} digital dosya FormData'ya eklendi`);
    }

    return formData;
  }, []);

  // Submit to queue
  const submitToQueue = useCallback(async (
    data: SubmissionData,
    productImages: MediaFile[],
    videoFile: MediaFile | null,
    digitalFiles: File[] = [],
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

      const formData = createFormData(data, productImages, videoFile, digitalFiles);
      
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
    digitalFiles: File[] = [],
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

      const formData = createFormData(submissionData, productImages, videoFile, digitalFiles);

      console.log(`🚀 Etsy'ye ${asActive ? 'aktif' : 'draft'} olarak gönderiliyor:`, data.title);
      console.log('📋 Submission data:', {
        title: data.title,
        hasVariations: data.hasVariations,
        variationCount: data.variations.filter(v => v.is_active).length,
        shopSection: data.selectedShopSection,
        shippingProfileId: data.shippingProfileId,
        taxonomyId: data.taxonomyId,
        imageCount: productImages.length,
        digitalFileCount: digitalFiles.length,
        price: data.price,
        tags: data.tags.length
      });

      console.log('📤 Etsy API request başlatılıyor...', {
        endpoint: '/api/etsy/listings/create',
        method: 'POST',
        formDataKeys: Array.from(formData.keys()),
        timestamp: new Date().toISOString()
      });

      const response = await fetch('/api/etsy/listings/create', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      console.log('📥 Etsy API response alındı:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        headers: {
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length')
        },
        timestamp: new Date().toISOString()
      });

      if (!response.ok) {
        let errorText;
        let errorObject;
        
        try {
          const clonedResponse = response.clone();
          errorText = await response.text();
          
          // JSON parse etmeyi dene
          try {
            errorObject = JSON.parse(errorText);
          } catch (jsonError) {
            console.log('⚠️ Response JSON değil, raw text:', errorText);
            errorObject = { message: errorText };
          }
        } catch (textError) {
          console.error('❌ Response text okunamadı:', textError);
          errorText = 'Could not read error response';
          errorObject = { message: errorText };
        }
        
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          errorObject: errorObject,
          url: response.url,
          timestamp: new Date().toISOString()
        };
        
        console.error('❌ Etsy API Error Status:', response.status);
        console.error('❌ Etsy API Error Text:', errorText);
        console.error('❌ Etsy API Error URL:', response.url);
        
        // JSON obje yerine string olarak log
        if (errorObject) {
          console.error('❌ Etsy API Error Message:', errorObject.message || 'No message');
          console.error('❌ Etsy API Error Code:', errorObject.code || 'No code');
        }

        // Handle specific Etsy errors
        if (response.status === 401 || errorText.includes('unauthorized') || errorText.includes('token')) {
          throw new Error('Etsy bağlantısı kesildi. Lütfen Etsy hesabınızı yeniden bağlayın.');
        }

        // Handle API user limit error
        if (errorText.includes('maximum number of users') || errorText.includes('commercial level access')) {
          setTimeout(() => {
            window.open('https://www.etsy.com/developers/your-apps', '_blank');
          }, 2000);
          
          throw new Error('❌ Etsy API kullanıcı limiti!\n\n📋 Acil Çözüm:\n1. Etsy Developer Dashboard 2 saniye içinde açılacak\n2. Eski/kullanılmayan bağlantıları temizle\n3. Veya yeni Developer App oluştur\n\n💡 Kalıcı çözüm: Commercial access başvurusu yap');
        }

        // Handle shipping profile error specifically
        if (errorText.includes('NO_SHIPPING_PROFILE') || errorText.includes('shipping profile')) {
          // Show helpful error with instructions and open Etsy in new tab
          setTimeout(() => {
            window.open('https://www.etsy.com/your/account/shop/shipping', '_blank');
          }, 2000);
          
          throw new Error('❌ Kargo profili bulunamadı!\n\n📋 Çözüm:\n1. Etsy Shipping ayarlarınız 2 saniye içinde açılacak\n2. En az bir kargo profili oluşturun\n3. Buraya geri dönüp tekrar deneyin\n\n💡 İpucu: "Standard" adında basit bir profil oluşturmanız yeterli');
        }

        // Handle other specific errors
        if (errorText.includes('INVALID_TAXONOMY')) {
          throw new Error('Kategori hatası. Lütfen farklı bir kategori seçin.');
        }

        if (errorText.includes('INVALID_TITLE')) {
          throw new Error('Başlık formatı hatalı. Lütfen başlığı kontrol edin.');
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

    // Note: We'll handle shipping profile in the API fallback, don't block here
    // if (!data.shippingProfileId || data.shippingProfileId.trim() === '') {
    //   errors.push('Kargo profili seçilmeli. Etsy hesabınızda kargo profili oluşturun.');
    // }

    if (!data.taxonomyId || data.taxonomyId === 0) {
      errors.push('Kategori seçilmeli');
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