'use client';

import React, { useState, useCallback, useEffect, useRef, startTransition } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Loader2, 
  Package,
  CheckCircle,
  Wand2 
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { predefinedVariations } from '@/lib/etsy-variation-presets';

// Import our modular components
import ProductMediaManager, { MediaFile } from './product-form/ProductMediaManager';
import ProductFormFields from './product-form/ProductFormFields';
import { useProductAutoGeneration } from './product-form/ProductAutoGeneration';
import { useProductFormSubmission } from './product-form/ProductFormSubmission';

interface EmbeddedProductFormProps {
  isVisible: boolean;
  autoFiles: File[];
  autoVideoFiles?: File[];
  autoMode: 'queue' | 'direct-etsy';
  onSubmitSuccess: (productTitle?: string) => void;
  onClose: () => void;
}

interface Variation {
  size: string;
  pattern: string;
  price: number;
  is_active: boolean;
}

interface ShopSection {
  shop_section_id: number;
  title: string;
  rank?: number;
  active_listing_count?: number;
}

export default function EmbeddedProductForm({
  isVisible,
  autoFiles,
  autoVideoFiles = [],
  autoMode,
  onSubmitSuccess,
  onClose
}: EmbeddedProductFormProps) {
  const { toast } = useToast();

  // === MAIN FORM STATE - Identical to ProductFormModal ===
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(80);
  const [quantity, setQuantity] = useState(999);
  const [tags, setTags] = useState<string[]>([]);

  // Advanced fields
  const [isPersonalizable, setIsPersonalizable] = useState(true);
  const [personalizationRequired, setPersonalizationRequired] = useState(false);
  const [personalizationInstructions, setPersonalizationInstructions] = useState('Phone Number for Delivery');
  const [taxonomyId, setTaxonomyId] = useState(1027); // Wall decor

  // Variations - Using predefined variations exactly like ProductFormModal
  const [hasVariations, setHasVariations] = useState(true);
  const [variations, setVariations] = useState<Variation[]>(
    predefinedVariations.map(v => ({ ...v, is_active: true }))
  );

  // Shop data
  const [selectedShopSection, setSelectedShopSection] = useState('');
  const [shippingProfileId, setShippingProfileId] = useState('loading'); // Loading placeholder
  const [shopSections, setShopSections] = useState<ShopSection[]>([]);

  // Media files
  const [productImages, setProductImages] = useState<MediaFile[]>([]);
  const [videoFile, setVideoFile] = useState<MediaFile | null>(null);

  // Loading states
  const [autoTitleLoading, setAutoTitleLoading] = useState(false);
  const [autoDescriptionLoading, setAutoDescriptionLoading] = useState(false);
  const [autoTagsLoading, setAutoTagsLoading] = useState(false);
  const [loadingShopSections, setLoadingShopSections] = useState(true);
  const [loadingShippingProfiles, setLoadingShippingProfiles] = useState(false);

  // Auto processing state
  const [autoTitleUsed, setAutoTitleUsed] = useState(false);
  const [isProcessingAuto, setIsProcessingAuto] = useState(false);
  
  // Component instance tracking
  const componentId = useRef(Math.random().toString(36).substr(2, 9));
  const isMounted = useRef(true);
  const hasStartedProcessing = useRef(false);
  
  // Refs to track actual state values
  const currentStateRef = useRef({ title: '', tags: [], productImages: [], selectedShopSection: '', shippingProfileId: 'loading' });
  
  // Update refs when state changes - comprehensive sync
  useEffect(() => {
    currentStateRef.current.title = title;
  }, [title]);
  
  useEffect(() => {
    currentStateRef.current.tags = tags;
  }, [tags]);
  
  useEffect(() => {
    currentStateRef.current.productImages = productImages;
  }, [productImages]);
  
  useEffect(() => {
    currentStateRef.current.selectedShopSection = selectedShopSection;
  }, [selectedShopSection]);
  
  useEffect(() => {
    currentStateRef.current.shippingProfileId = shippingProfileId;
  }, [shippingProfileId]);

  // Mount/unmount tracking
  useEffect(() => {
    console.log(`🏗️ EmbeddedProductForm mounted: ${componentId.current}`);
    isMounted.current = true;
    hasStartedProcessing.current = false; // Reset on mount
    
    return () => {
      console.log(`🏗️ EmbeddedProductForm unmounting: ${componentId.current}`);
      isMounted.current = false;
      hasStartedProcessing.current = false; // Reset on unmount
      
      // Clean up any pending submit timeout
      if (submitCheckTimeoutRef.current) {
        clearTimeout(submitCheckTimeoutRef.current);
        submitCheckTimeoutRef.current = null;
        console.log('🧹 Cleared submit timeout on unmount');
      }
    };
  }, []);

  // === INITIALIZE SUBMISSION HOOKS ===
  const autoGeneration = useProductAutoGeneration({
    productImages: productImages.map(m => m.file),
    onTitleGenerated: (title) => {
      console.log('🎯 AI başlık alındı:', title);
      setTitle(title);
    },
    onDescriptionGenerated: (description) => {
      console.log('📝 AI açıklama alındı:', description.substring(0, 100) + '...');
      setDescription(description);
    },
    onTagsGenerated: (tags) => {
      console.log('🏷️ AI etiketler alındı:', tags);
      setTags(tags);
    },
    onCategoryGenerated: (categoryId) => {
      // Handle AI category selection
      console.log('🎯 AI kategori önerisi:', categoryId);
      setSelectedShopSection(categoryId);
    }
  });

  const submission = useProductFormSubmission({
    onSubmitSuccess: (productTitle) => {
      console.log('✅ Form submit başarılı:', productTitle);
      onSubmitSuccess(productTitle);
      
      // Reset form after successful submission
      resetForm();
      
      // Sıradaki ürüne geçiş için kısa bir gecikme
      setTimeout(() => {
        console.log('🔄 Form reset edildi, sıradaki ürün için hazır');
      }, 200); // 1000ms → 200ms
    },
    onSubmitError: (error) => {
      console.error('❌ Form submit hatası:', error);
    }
  });

  // === AUTO SUBMIT HANDLER (MOVED UP) ===
  const handleAutoSubmit = useCallback(async () => {
    // MOUNT CHECK
    if (!isMounted.current) {
      console.log(`🚫 Component ${componentId.current} unmounted, skipping auto submit`);
      return;
    }
    
    // DOUBLE SUBMIT PREVENTION
    if (isProcessingAuto) {
      console.log('🚫 Auto submit already in progress, preventing duplicate');
      return;
    }
    
    setIsProcessingAuto(true);
    
    // Use ref values as primary source of truth for auto-submit
    const refTitle = currentStateRef.current.title;
    const refImages = currentStateRef.current.productImages;
    const refTags = currentStateRef.current.tags;
    const refSection = currentStateRef.current.selectedShopSection;
    
    console.log('🔍 Auto submit check - ENHANCED REF-BASED:', {
      isSubmitting: submission.isSubmitting,
      isProcessingAuto: isProcessingAuto,
      refData: {
        title: refTitle || 'empty',
        titleLength: refTitle?.length || 0,
        productImagesCount: refImages?.length || 0,
        tagsCount: refTags?.length || 0,
        selectedShopSection: refSection || 'empty',
        shippingProfileId: shippingProfileId || 'empty'
      },
      stateData: {
        title: title || 'empty',
        titleLength: title.length,
        productImagesCount: productImages.length,
        tagsCount: tags.length,
        selectedShopSection: selectedShopSection || 'empty'
      }
    });

    if (submission.isSubmitting) {
      console.log('⚠️ Already submitting, skipping auto submit');
      return;
    }

    // Enhanced form readiness check - prefer ref values for fresh data
    const titleReady = refTitle || title;
    const imagesReady = (refImages && refImages.length > 0) || productImages.length > 0;
    const tagsReady = (refTags && refTags.length > 0) || tags.length > 0;
    const sectionReady = refSection || selectedShopSection;
    const shippingReady = shippingProfileId && shippingProfileId !== 'loading' && shippingProfileId !== 'empty';
    
    const formReady = titleReady && imagesReady && shippingReady && sectionReady;
    
    if (!formReady) {
      console.log('⚠️ Form not ready for auto submit - enhanced check:', { 
        readiness: { titleReady, imagesReady, tagsReady, sectionReady, shippingReady },
        state: { 
          title: title || 'empty', 
          titleLength: title.length,
          imageCount: productImages.length,
          shippingProfileId: shippingProfileId || 'empty',
          selectedShopSection: selectedShopSection || 'empty',
          tagsCount: tags.length
        },
        ref: {
          title: currentStateRef.current.title || 'empty',
          imageCount: currentStateRef.current.productImages.length,
          selectedShopSection: currentStateRef.current.selectedShopSection || 'empty',
          tagsCount: currentStateRef.current.tags.length
        },
        formReady
      });
      
      // Enhanced retry with REF-BASED checking
      setTimeout(() => {
        const retryRefTitle = currentStateRef.current.title;
        const retryRefImages = currentStateRef.current.productImages;
        const retryRefSection = currentStateRef.current.selectedShopSection;
        
        const retryTitleReady = retryRefTitle || title;
        const retryImagesReady = (retryRefImages && retryRefImages.length > 0) || productImages.length > 0;
        const retrySectionReady = retryRefSection || selectedShopSection;
        const retryShippingReady = shippingProfileId && shippingProfileId !== 'loading' && shippingProfileId !== 'empty';
        
        const retryFormReady = retryTitleReady && retryImagesReady && retryShippingReady && retrySectionReady;
        
        console.log('🔄 Retry ile REF-BASED kontrol:', {
          refData: {
            title: retryRefTitle || 'empty',
            images: retryRefImages?.length || 0,
            section: retryRefSection || 'empty'
          },
          readiness: { retryTitleReady, retryImagesReady, retrySectionReady, retryShippingReady },
          retryFormReady
        });
        
        if (retryFormReady) {
          console.log('✅ Form hazır, REF verilerle direkt submit yapılıyor');
          // Recursive çağrı yerine direkt submit et
          const submitButton = document.querySelector('[data-testid="submit-button"]') as HTMLButtonElement;
          if (submitButton) {
            submitButton.click();
          }
        } else {
          console.log('❌ Form hala hazır değil, ref verileri eksik:', {
            missing: {
              title: !retryTitleReady,
              images: !retryImagesReady,
              shipping: !retryShippingReady,
              section: !retrySectionReady
            }
          });
          
          console.log('📝 Son deneme - zorla submit button click...');
          // Recursive çağrı yerine direkt submit et
          const submitButton = document.querySelector('[data-testid="submit-button"]') as HTMLButtonElement;
          if (submitButton) {
            submitButton.click();
          }
        }
      }, 300); // 1500ms → 300ms (çok daha hızlı retry)
      // Reset processing flag after timeout
      setTimeout(() => setIsProcessingAuto(false), 400); // 1600ms → 400ms
      return;
    }

    console.log('🚀 Auto submitting to Etsy with REF-BASED form data...');
    
    // Use ref values as primary source, fallback to state values
    const finalTitle = refTitle || title;
    const finalTags = (refTags && refTags.length > 0) ? refTags : tags;
    const finalProductImages = (refImages && refImages.length > 0) ? refImages : productImages;
    const finalSelectedShopSection = refSection || selectedShopSection;
    
    console.log('📋 Final submission data source:', {
      titleSource: refTitle ? 'ref' : 'state',
      tagsSource: (refTags && refTags.length > 0) ? 'ref' : 'state',
      imagesSource: (refImages && refImages.length > 0) ? 'ref' : 'state',
      sectionSource: refSection ? 'ref' : 'state',
      finalCounts: {
        title: finalTitle?.length || 0,
        tags: finalTags?.length || 0,
        images: finalProductImages?.length || 0,
        section: finalSelectedShopSection || 'empty'
      }
    });

    const submissionData = {
      title: finalTitle,
      description,
      price,
      quantity,
      tags: finalTags,
      isPersonalizable,
      personalizationRequired,
      personalizationInstructions,
      taxonomyId,
      hasVariations,
      variations,
      selectedShopSection: finalSelectedShopSection,
      shippingProfileId,
      whoMade: "i_did",
      whenMade: "made_to_order",
      isSupply: false,
      renewalOption: "automatic",
      state: "draft"
    };

    console.log('📦 Submission data prepared:', {
      title: submissionData.title.substring(0, 50) + '...',
      tagsCount: submissionData.tags.length,
      shippingProfileId: submissionData.shippingProfileId,
      selectedShopSection: submissionData.selectedShopSection,
      imageCount: finalProductImages.length
    });

    try {
      await submission.submitToEtsy(submissionData, finalProductImages, videoFile);
    } finally {
      // Always reset processing flag when done (success or error)
      setIsProcessingAuto(false);
    }
  }, [
    title, description, price, quantity, tags, isPersonalizable,
    personalizationRequired, personalizationInstructions, taxonomyId,
    hasVariations, variations, selectedShopSection, shippingProfileId,
    productImages, videoFile, submission
  ]);

  // Add debounce ref to prevent multiple triggers
  const submitCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckRef = useRef<string>('');

  // === UNIVERSAL AUTO-SUBMIT CHECKER ===
  const checkAndTriggerAutoSubmit = useCallback(() => {
    if (autoMode !== 'direct-etsy') return;
    
    // MOUNT CHECK
    if (!isMounted.current) {
      console.log(`🚫 Checker: Component ${componentId.current} unmounted, skipping trigger`);
      return;
    }
    
    // Prevent double triggers
    if (isProcessingAuto || submission.isSubmitting) {
      console.log('🚫 Checker: Already processing, skipping trigger');
      return;
    }
    
    const hasTitle = currentStateRef.current.title || title;
    const hasTags = (currentStateRef.current.tags && currentStateRef.current.tags.length > 0) || tags.length > 0;
    const hasImages = (currentStateRef.current.productImages && currentStateRef.current.productImages.length > 0) || productImages.length > 0;
    const hasSection = currentStateRef.current.selectedShopSection || selectedShopSection;
    const hasShipping = shippingProfileId && shippingProfileId !== 'loading' && shippingProfileId !== 'empty';
    
    const allReady = hasTitle && hasTags && hasImages && hasSection && hasShipping;
    
    // Create a signature of current state to detect duplicate checks
    const currentSignature = `${hasTitle}-${hasTags}-${hasSection}-${hasShipping}-${allReady}`;
    
    console.log('🔍 UNIVERSAL CHECK - 4 Gerekli Alan:', {
      hasTitle: !!hasTitle,
      hasTags: !!hasTags, 
      hasSection: !!hasSection,
      hasShipping: !!hasShipping,
      allReady,
      signature: currentSignature,
      lastSignature: lastCheckRef.current,
      isDuplicate: currentSignature === lastCheckRef.current,
      values: {
        title: hasTitle ? hasTitle.substring(0, 50) + '...' : 'YOK',
        tagsCount: hasTags ? (currentStateRef.current.tags?.length || tags.length) : 0,
        section: hasSection || 'YOK',
        shipping: hasShipping ? shippingProfileId : 'YOK'
      }
    });
    
    // Skip if this is the same check as before
    if (currentSignature === lastCheckRef.current) {
      console.log('🚫 Duplicate check detected, skipping');
      return;
    }
    
    lastCheckRef.current = currentSignature;
    
    if (allReady && !submission.isSubmitting) {
      console.log('🚀🚀🚀 TÜM 4 ALAN HAZIR - ACİLEN GÖNDERİLİYOR! 🚀🚀🚀');
      
      // Clear any existing timeout to prevent multiple submissions
      if (submitCheckTimeoutRef.current) {
        clearTimeout(submitCheckTimeoutRef.current);
        console.log('🚫 Cleared existing submit timeout to prevent duplicate');
      }
      
      submitCheckTimeoutRef.current = setTimeout(() => {
        // MOUNT CHECK in setTimeout
        if (!isMounted.current) {
          console.log(`🚫 Universal Checker timeout: Component ${componentId.current} unmounted, skipping`);
          return;
        }
        
        // Final check before submitting
        if (!isProcessingAuto && !submission.isSubmitting) {
          console.log('🎯 Final submit check passed, triggering handleAutoSubmit');
          handleAutoSubmit();
        } else {
          console.log('🚫 Final submit check failed - already processing');
        }
        
        submitCheckTimeoutRef.current = null;
      }, 100); // 300ms → 100ms
    }
  }, [autoMode, title, tags, selectedShopSection, shippingProfileId, productImages, submission.isSubmitting, isProcessingAuto, handleAutoSubmit]);

  // Debounced effect to prevent multiple rapid triggers
  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      checkAndTriggerAutoSubmit();
    }, 50); // 100ms → 50ms debounce
    
    return () => clearTimeout(debounceTimeout);
  }, [title, tags, selectedShopSection, shippingProfileId, checkAndTriggerAutoSubmit]);

  // === AUTO-FILL FROM FILES - Identical to ProductFormModal ===
  useEffect(() => {
    if (autoFiles && autoFiles.length > 0 && isVisible && !autoTitleUsed) {
      // MOUNT CHECK
      if (!isMounted.current) {
        console.log(`🚫 Auto-fill: Component ${componentId.current} unmounted, skipping`);
        return;
      }
      
      // DUPLICATE PROCESSING CHECK
      if (hasStartedProcessing.current) {
        console.log(`🚫 Auto-fill: Component ${componentId.current} already started processing, skipping`);
        return;
      }
      
      hasStartedProcessing.current = true;
      
      console.log('🔄 Auto files received, setting up form...', {
        fileCount: autoFiles.length,
        autoTitleUsed,
        componentId: componentId.current,
        hasStartedProcessing: hasStartedProcessing.current
      });
      
      // PREVENT DUPLICATE PROCESSING
      if (isProcessingAuto) {
        console.log('⚠️ Already processing auto, skipping duplicate');
        return;
      }


      // Convert files to MediaFile format
      const imageFiles = autoFiles.filter(f => f.type.startsWith('image/'));
      const newMediaFiles: MediaFile[] = imageFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        id: Math.random().toString(36).substr(2, 9)
      }));

      // Process video files if provided
      if (autoVideoFiles && autoVideoFiles.length > 0) {
        const firstVideoFile = autoVideoFiles[0]; // Take the first video file
        const videoMediaFile: MediaFile = {
          file: firstVideoFile,
          preview: URL.createObjectURL(firstVideoFile),
          id: Math.random().toString(36).substr(2, 9)
        };
        
        // Set the video file state
        setVideoFile(videoMediaFile);
        console.log('🎥 Video file otomatik olarak ayarlandı:', firstVideoFile.name, `(${(firstVideoFile.size / 1024 / 1024).toFixed(2)}MB)`);
      }

      // Set default description
      const autoDescription = `🌟 Made Just for You – Fast & Safe Delivery 🌟

💡 Looking to personalize your wall art? We offer custom sizing and can turn your personal images into beautiful canvas prints.

✨ Features:
• High-quality canvas material
• Multiple size options available
• Ready to hang with included hardware
• Perfect for home, office, or as a gift

📦 Fast Processing & Shipping:
• Orders processed within 1-3 business days
• Secure packaging to ensure safe delivery
• Multiple frame options available

🎨 Want something unique? Message us for custom orders!`;

      // Update form state - ÖNCE RESİMLERİ SET ET
      console.log('🔄 Setting product images and initial state...');
      
      // BATCH UPDATES WITH startTransition
      startTransition(() => {
        setProductImages(newMediaFiles);
        setDescription(autoDescription);
        setTitle(''); // Start empty, AI will fill
        setTags([]); // Start empty, AI will fill
      });
      
      // Update ref
      currentStateRef.current.productImages = newMediaFiles;
      currentStateRef.current.title = '';
      currentStateRef.current.tags = [];

      console.log('📷 Resimler state\'e eklendi:', {
        newMediaFilesCount: newMediaFiles.length,
        imageFileNames: newMediaFiles.map(f => f.file.name)
      });
      
      // Force productImages state update
      setTimeout(() => {
        console.log('🔄 Force setting productImages again...');
        setProductImages(newMediaFiles);
        currentStateRef.current.productImages = newMediaFiles;
      }, 100);

      // Trigger AI generation after images are set - STATE UPDATE BEKLEYELİM
      if (imageFiles.length > 0 && !autoTitleUsed) {
        setAutoTitleUsed(true);
        setIsProcessingAuto(true);
        
        console.log('⏰ AI generation zamanlayıcısı kuruldu, 2 saniye bekleniyor...', componentId);
        
        // State update'ini beklemek için biraz daha uzun süre ver
        // AI generation'ı hemen başlat - paralel işlem
        console.log('🎯 AI generation hemen tetikleniyor (shop sections paralel yüklenecek)');
        handleAutoGenerationWithImages(newMediaFiles);
      }
    }
  }, [autoFiles?.length, isVisible, autoTitleUsed]);

  // === LOAD SHOP SECTIONS WITH CACHING ===
  useEffect(() => {
    if (isVisible) {
      async function loadShopSections() {
        // Check sessionStorage cache first
        const cached = sessionStorage.getItem('etsy-shop-sections');
        if (cached) {
          try {
            const sections = JSON.parse(cached);
            console.log('🚀 Shop sections cache\'den yüklendi:', sections.length, 'adet');
            setShopSections(sections);
            setLoadingShopSections(false);
            
            // Don't auto-select from cache, let AI choose
            if (sections.length > 0 && !selectedShopSection) {
              console.log('🏪 Shop sections cache\'den yüklendi, AI seçimi bekleniyor...');
              // Don't auto-select, let AI choose the category
            }
            return;
          } catch (e) {
            console.warn('Cache parse hatası, API\'den yükleniyor:', e);
            sessionStorage.removeItem('etsy-shop-sections');
          }
        }

        try {
          console.log('🏪 Shop sections API\'den yükleniyor...');
          setLoadingShopSections(true);
          const response = await fetch('/api/etsy/shop-sections');
          const data = await response.json();
          
          if (response.ok && data.sections) {
            console.log('✅ Shop sections yüklendi ve cache\'lendi:', data.sections.length, 'adet');
            setShopSections(data.sections);
            
            // Cache for session
            sessionStorage.setItem('etsy-shop-sections', JSON.stringify(data.sections));
            
            // Auto-select first section if none selected
            if (data.sections.length > 0 && !selectedShopSection) {
              setSelectedShopSection(data.sections[0].shop_section_id.toString());
            }
          } else {
            console.error('❌ Shop sections API hatası:', data);
          }
        } catch (error) {
          console.error('❌ Shop sections yüklenemedi:', error);
        } finally {
          setLoadingShopSections(false);
        }
      }
      loadShopSections();
    }
  }, [isVisible, selectedShopSection]);

  // === WAIT FOR SHOP SECTIONS TO LOAD ===
  const waitForShopSections = useCallback(async (maxWaitTime = 10000): Promise<void> => {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      console.log('🔍 ShopSections durum kontrolü:', {
        shopSectionsLength: shopSections?.length || 0,
        loadingShopSections,
        elapsed: Date.now() - startTime
      });
      
      if (shopSections && shopSections.length > 0) {
        console.log('✅ ShopSections hazır, devam ediliyor:', shopSections.length, 'kategori');
        console.log('📊 Hazır kategoriler:', shopSections.map(s => s.title).join(', '));
        return;
      }
      
      console.log('⏳ ShopSections bekleniyor... (', Date.now() - startTime, 'ms )');
      await new Promise(resolve => setTimeout(resolve, 200)); // 1000ms → 200ms
    }
    
    console.log('❌ ShopSections timeout after', maxWaitTime, 'ms, devam ediliyor');
  }, [shopSections, loadingShopSections]);

  // === AUTO GENERATION HANDLER WITH SPECIFIC IMAGES ===
  const handleAutoGenerationWithImages = useCallback(async (mediaFiles: MediaFile[]) => {
    console.log('🔍 Auto generation başlatılıyor (direkt mediaFiles ile)...', {
      mediaFilesCount: mediaFiles.length,
      autoFilesLength: autoFiles?.length,
      mediaFilesDetails: mediaFiles.map(img => ({
        name: img.file.name,
        size: img.file.size,
        type: img.file.type
      }))
    });

    if (mediaFiles.length === 0) {
      console.log('❌ No media files available for auto generation');
      setIsProcessingAuto(false);
      return;
    }

    try {
      setAutoTitleLoading(true);
      console.log('🤖 Starting auto generation with direct media files...', {
        imageCount: mediaFiles.length,
        firstImageName: mediaFiles[0]?.file?.name,
        firstImageType: mediaFiles[0]?.file?.type
      });
      
      // ShopSections'ı cache'den direkt al
      let actualCategories = shopSections || [];
      
      // Eğer state boşsa cache'den direkt yükle
      if (actualCategories.length === 0) {
        const cached = sessionStorage.getItem('etsy-shop-sections');
        if (cached) {
          try {
            actualCategories = JSON.parse(cached);
            console.log('🚀 AI için kategoriler cache\'den direkt alındı:', actualCategories.length, 'adet');
          } catch (e) {
            console.warn('Cache parse hatası:', e);
          }
        }
      }

      // Direkt AI API çağrısı yapalım
      const firstImage = mediaFiles[0].file;
      
      const formData = new FormData();
      formData.append('image', firstImage);
      formData.append('focus', '');
      formData.append('analysisType', 'basic');
      
      // EmbeddedProductForm state'ini güncelle
      if (actualCategories && actualCategories.length > 0) {
        setShopSections(actualCategories);
        console.log('🔄 EmbeddedProductForm shopSections state güncellendi:', actualCategories.length, 'adet');
      }
      
      // Cache'den alınan kategorileri AI'ye gönder
      const categoriesJson = JSON.stringify(actualCategories || []);
      formData.append('categories', categoriesJson);
      console.log('📨 AI\'ye gönderilen kategoriler (cache):', categoriesJson);
      
      if (actualCategories && actualCategories.length > 0) {
        console.log('✅ AI\'ye gönderilen kategoriler adları:', actualCategories.map(s => s.title).join(', '));
      } else {
        console.log('❌ Kategoriler hala boş!');
      }

      console.log('📡 AI API çağrısı yapılıyor...', {
        fileName: firstImage.name,
        fileSize: firstImage.size,
        fileType: firstImage.type
      });

      const response = await fetch('/api/ai/analyze-and-generate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📋 AI API yanıtı:', result);

      if (result.title) {
        const cleanTitle = result.title.replace(/['\"]/g, '').replace(/\s+/g, ' ').trim();
        const finalTitle = cleanTitle.length > 140 ? cleanTitle.substring(0, 137) + '...' : cleanTitle;
        
        console.log('🎯 AI başlık alındı:', finalTitle);
        
        // IMMEDIATE UPDATE with ref tracking
        setTitle(finalTitle);
        currentStateRef.current.title = finalTitle;
        
        // Force state update using scheduler
        startTransition(() => {
          setTitle(finalTitle);
        });
        
        // Use queueMicrotask for immediate scheduling
        queueMicrotask(() => {
          console.log('🔄 Title state zorlama güncelleme:', finalTitle);
          setTitle(finalTitle);
          currentStateRef.current.title = finalTitle;
        });
      }

      if (result.tags) {
        console.log('🔍 Raw tags from AI:', result.tags, typeof result.tags);
        
        let tagArray: string[] = [];
        if (typeof result.tags === 'string') {
          tagArray = result.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t && t.length <= 20);
        } else if (Array.isArray(result.tags)) {
          tagArray = result.tags.map((t: any) => String(t).trim()).filter((t: string) => t && t.length <= 20);
        }
        
        console.log('🏷️ AI etiketler işlendi:', tagArray);
        if (tagArray.length > 0) {
          // Backtick karakterlerini temizle
          const cleanedTags = tagArray.map(tag => tag.replace(/`/g, '').trim()).filter(tag => tag);
          console.log('🧹 Temizlenmiş etiketler:', cleanedTags);
          
          // IMMEDIATE UPDATE with ref tracking
          setTags(cleanedTags);
          currentStateRef.current.tags = cleanedTags;
          
          // Force state update using scheduler
          startTransition(() => {
            setTags(cleanedTags);
          });
          
          // Use queueMicrotask for immediate scheduling
          queueMicrotask(() => {
            console.log('🔄 Tags state güncelleme kontrolü:', cleanedTags);
            setTags(cleanedTags);
            currentStateRef.current.tags = cleanedTags;
          });
        }
      }

      if (result.category) {
        console.log('🎯 AI kategori önerisi:', result.category);
        
        // GERÇEK kategorilerden eşleşen bulma - actualCategories kullan
        let matchedCategory = null;
        if (actualCategories && actualCategories.length > 0) {
          const aiCategoryTitle = result.category.title || '';
          console.log('🔍 AI kategori adı:', aiCategoryTitle, '- Actual kategorilerde arıyor...');
          console.log('📋 Aranacak kategoriler:', actualCategories.map(s => s.title).join(', '));
          
          // Tam isim eşleşmesi
          matchedCategory = actualCategories.find(s => 
            s.title.toLowerCase() === aiCategoryTitle.toLowerCase()
          );
          
          // Kısmi eşleşme
          if (!matchedCategory) {
            matchedCategory = actualCategories.find(s => 
              s.title.toLowerCase().includes(aiCategoryTitle.toLowerCase()) ||
              aiCategoryTitle.toLowerCase().includes(s.title.toLowerCase())
            );
          }
          
          if (matchedCategory) {
            console.log('✅ AI önerisi kabul edildi:', matchedCategory.title, 'ID:', matchedCategory.shop_section_id);
            const categoryId = matchedCategory.shop_section_id.toString();
            
            // IMMEDIATE UPDATE with ref tracking
            setSelectedShopSection(categoryId);
            currentStateRef.current.selectedShopSection = categoryId;
            
            // Force state update using scheduler
            startTransition(() => {
              setSelectedShopSection(categoryId);
            });
            
            // Use queueMicrotask for immediate scheduling
            queueMicrotask(() => {
              setSelectedShopSection(categoryId);
              currentStateRef.current.selectedShopSection = categoryId;
            });
            
            // Extra delay to ensure UI updates
            setTimeout(() => {
              console.log('🔄 Final kategori UI update:', categoryId);
              setSelectedShopSection(categoryId);
              currentStateRef.current.selectedShopSection = categoryId;
            }, 100);
          } else {
            console.log('⚠️ AI önerisi actual kategorilerde bulunamadı, Modern Art default seçiliyor');
            // AI'nin önerdiği kategori bulunamadıysa Modern Art seç
            const modernCategory = actualCategories?.find(s => 
              s.title.toLowerCase().includes('modern')
            );
            
            if (modernCategory) {
              console.log('🎨 Default olarak Modern Art seçildi:', modernCategory.title);
              const categoryId = modernCategory.shop_section_id.toString();
              setSelectedShopSection(categoryId);
              currentStateRef.current.selectedShopSection = categoryId;
              
              // Extra delay to ensure UI updates
              setTimeout(() => {
                console.log('🔄 Modern Art UI update:', categoryId);
                setSelectedShopSection(categoryId);
                currentStateRef.current.selectedShopSection = categoryId;
              }, 100);
            } else {
              console.log('⚠️ Modern Art bulunamadı, Abstract Art fallback');
              const abstractCategory = shopSections?.find(s => 
                s.title.toLowerCase().includes('abstract')
              );
              if (abstractCategory) {
                setSelectedShopSection(abstractCategory.shop_section_id.toString());
                currentStateRef.current.selectedShopSection = abstractCategory.shop_section_id.toString();
              }
            }
          }
        } else {
          console.log('⚠️ shopSections henüz hazır değil, Modern Art seçilecek');
          // Shop sections hazır değilse Modern Art'ı seç
          setTimeout(() => {
            const modernFallback = shopSections?.find(s => 
              s.title.toLowerCase().includes('modern')
            );
            if (modernFallback) {
              console.log('🎨 Fallback: Modern Art seçildi');
              setSelectedShopSection(modernFallback.shop_section_id.toString());
            }
          }, 200);
        }
      } else {
        // AI'den kategori gelmezse Modern Art'ı seç (AI'ya güven)
        console.log('🤖 AI kategori önermedi, AI güveni ile Modern Art seçiliyor...');
        const modernCategory = shopSections?.find(s => 
          s.title.toLowerCase().includes('modern')
        );
        
        if (modernCategory) {
          console.log('🎨 Modern Art varsayılan olarak seçildi');
          setSelectedShopSection(modernCategory.shop_section_id.toString());
          currentStateRef.current.selectedShopSection = modernCategory.shop_section_id.toString();
        }
      }

      console.log('✅ Auto generation completed');
      
      // Enhanced state synchronization check
      const checkStateSync = () => {
        const currentState = {
          titleSet: !!title || !!currentStateRef.current.title,
          tagsSet: tags.length > 0 || currentStateRef.current.tags.length > 0,
          categorySet: !!selectedShopSection || !!currentStateRef.current.selectedShopSection,
          shippingSet: (!!shippingProfileId && shippingProfileId !== 'loading') || (!!currentStateRef.current.shippingProfileId && currentStateRef.current.shippingProfileId !== 'loading')
        };
        
        console.log('🔄 Enhanced state sync check:', {
          state: { title, tags: tags.length, selectedShopSection, shippingProfileId },
          ref: { 
            title: currentStateRef.current.title, 
            tags: currentStateRef.current.tags.length, 
            selectedShopSection: currentStateRef.current.selectedShopSection,
            shippingProfileId: currentStateRef.current.shippingProfileId 
          },
          checks: currentState
        });
        
        return currentState;
      };

      // Universal checker zaten tüm state'leri izliyor - ekstra auto-submit gereksiz
      console.log('✅ AI generation tamamlandı, Universal Checker devreye girecek');

    } catch (error) {
      console.error('❌ Auto generation error:', error);
      toast({
        variant: "destructive",
        title: "AI Üretim Hatası",
        description: error instanceof Error ? error.message : "Bilinmeyen hata"
      });
    } finally {
      setAutoTitleLoading(false);
      setIsProcessingAuto(false);
    }
  }, [autoFiles, autoMode, toast, waitForShopSections]);

  // === SELECT CATEGORY BY TITLE (AI FALLBACK) ===
  const selectCategoryByTitle = useCallback((title: string) => {
    if (!shopSections || shopSections.length === 0) {
      console.log('⚠️ Shop sections henüz yüklenmemiş, kategori seçimi atlanıyor');
      return;
    }

    console.log('🔍 Başlık bazlı kategori seçimi:', title);
    console.log('📊 Mevcut kategoriler:', shopSections.map(s => s.title).join(', '));
    
    const titleLower = title.toLowerCase();
    let selectedCategory = null;

    // Gelişmiş anahtar kelime bazlı kategori eşleştirme
    const categoryKeywords = [
      { keywords: ['woman', 'women', 'female', 'girl', 'lady', 'feminine'], categoryName: 'woman art' },
      { keywords: ['abstract', 'geometric', 'modern', 'contemporary', 'minimalist'], categoryName: 'abstract art' },
      { keywords: ['love', 'heart', 'romantic', 'valentine', 'couples', 'romance'], categoryName: 'love art' },
      { keywords: ['flower', 'floral', 'rose', 'botanical', 'roses', 'garden', 'bloom'], categoryName: 'flowers art' },
      { keywords: ['landscape', 'mountain', 'nature', 'forest', 'scenery', 'outdoor'], categoryName: 'landscape art' },
      { keywords: ['animal', 'cat', 'dog', 'bird', 'wildlife', 'pet', 'fauna'], categoryName: 'animal art' },
      { keywords: ['rothko', 'color field', 'mark rothko'], categoryName: 'mark rothko art print' },
      { keywords: ['surreal', 'surrealism', 'dream', 'fantasy', 'psychedelic'], categoryName: 'surreal canvas art' },
      { keywords: ['banksy', 'graffiti', 'street art', 'urban', 'spray'], categoryName: 'banksy & graffiti art' },
      { keywords: ['music', 'dance', 'musical', 'instrument', 'melody'], categoryName: 'music & dance art' },
      { keywords: ['ethnic', 'cultural', 'tribal', 'traditional', 'folk'], categoryName: 'ethnic' },
      { keywords: ['religious', 'spiritual', 'sacred', 'divine', 'holy'], categoryName: 'religious art' },
      { keywords: ['peacock', 'bird', 'feather', 'colorful bird'], categoryName: 'peacock art' },
      { keywords: ['kitchen', 'cooking', 'food', 'culinary', 'chef'], categoryName: 'kitchen art' },
      { keywords: ['buddha', 'zen', 'meditation', 'peaceful', 'stones', 'spiritual'], categoryName: 'buddha and zen stones' },
      { keywords: ['oil painting', 'classical', 'traditional painting', 'realistic'], categoryName: 'oil painting' },
      // Gothic/Dark aesthetic için fallback'ler
      { keywords: ['gothic', 'dark', 'skeleton', 'skull', 'spooky', 'alternative', 'horror'], categoryName: 'abstract art' },
      { keywords: ['black', 'dark aesthetic', 'alternative', 'emo', 'punk'], categoryName: 'abstract art' }
    ];

    // Anahtar kelimelere göre kategori bul
    for (const rule of categoryKeywords) {
      if (rule.keywords.some(keyword => titleLower.includes(keyword))) {
        selectedCategory = shopSections.find(section => 
          section.title.toLowerCase().includes(rule.categoryName.toLowerCase())
        );
        if (selectedCategory) {
          console.log(`✅ Anahtar kelime "${rule.keywords.find(k => titleLower.includes(k))}" ile kategori bulundu: "${selectedCategory.title}"`);
          break;
        }
      }
    }

    // Eğer hiçbir eşleşme yoksa Modern Art seç
    if (!selectedCategory) {
      selectedCategory = shopSections.find(s => s.title.toLowerCase().includes('modern')) || shopSections[0];
      console.log('🔄 Fallback kategori seçildi:', selectedCategory?.title);
    }

    if (selectedCategory) {
      const categoryId = selectedCategory.shop_section_id.toString();
      console.log('🏪 Başlık bazlı kategori ayarlanıyor:', selectedCategory.title, 'ID:', categoryId);
      setSelectedShopSection(categoryId);
    }
  }, [shopSections]);

  // === AUTO GENERATION HANDLER (STATE-BASED) ===
  const handleAutoGeneration = useCallback(async () => {
    return handleAutoGenerationWithImages(productImages);
  }, [productImages, handleAutoGenerationWithImages]);


  // === MANUAL SUBMIT HANDLER ===
  const handleManualSubmit = useCallback(async () => {
    console.log('📝 MANUEL SUBMIT - current state check:', {
      title: title || 'empty',
      titleLength: title.length,
      tags: tags || [],
      tagsLength: tags.length,
      productImages: productImages || [],
      productImagesLength: productImages.length,
      selectedShopSection: selectedShopSection || 'empty',
      shippingProfileId: shippingProfileId || 'empty',
      refTitle: currentStateRef.current.title,
      refTags: currentStateRef.current.tags,
      refProductImages: currentStateRef.current.productImages.length,
      refSelectedShopSection: currentStateRef.current.selectedShopSection
    });
    
    // Use ref values if state is empty
    const finalTitle = title || currentStateRef.current.title;
    const finalTags = tags.length > 0 ? tags : currentStateRef.current.tags;
    const finalProductImages = productImages.length > 0 ? productImages : currentStateRef.current.productImages;
    const finalSelectedShopSection = selectedShopSection || currentStateRef.current.selectedShopSection;
    
    const submissionData = {
      title: finalTitle,
      description,
      price,
      quantity,
      tags: finalTags,
      isPersonalizable,
      personalizationRequired,
      personalizationInstructions,
      taxonomyId,
      hasVariations,
      variations,
      selectedShopSection: finalSelectedShopSection,
      shippingProfileId,
      whoMade: "i_did",
      whenMade: "made_to_order",
      isSupply: false,
      renewalOption: "automatic",
      state: "draft"
    };

    // Validate form
    const validation = submission.validateForm(submissionData, finalProductImages);
    console.log('🔍 Form validation result:', validation);
    
    if (!validation.isValid) {
      console.log('❌ Form validation failed:', validation.errors);
      toast({
        variant: "destructive",
        title: "Form Hatası",
        description: validation.errors.join(', ')
      });
      return;
    }
    
    console.log('✅ Form validation passed, submitting...');

    if (autoMode === 'direct-etsy') {
      await submission.submitToEtsy(submissionData, finalProductImages, videoFile);
    } else {
      await submission.submitToQueue(submissionData, finalProductImages, videoFile);
    }
  }, [
    title, description, price, quantity, tags, isPersonalizable,
    personalizationRequired, personalizationInstructions, taxonomyId,
    hasVariations, variations, selectedShopSection, shippingProfileId,
    productImages, videoFile, autoMode, submission, toast
  ]);

  // === RESET FORM ===
  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setPrice(80);
    setQuantity(999);
    setTags([]);
    setProductImages([]);
    setVideoFile(null);
    setAutoTitleUsed(false);
    setIsProcessingAuto(false);
    setAutoTitleLoading(false);
    setAutoDescriptionLoading(false);
    setAutoTagsLoading(false);
  }, []);

  // === INDIVIDUAL AUTO GENERATION HANDLERS ===
  const handleGenerateTitle = useCallback(async () => {
    try {
      setAutoTitleLoading(true);
      await autoGeneration.generateTitle();
    } catch (error) {
      console.error('Title generation error:', error);
    } finally {
      setAutoTitleLoading(false);
    }
  }, [autoGeneration]);

  const handleGenerateDescription = useCallback(async () => {
    try {
      setAutoDescriptionLoading(true);
      await autoGeneration.generateDescription(title);
    } catch (error) {
      console.error('Description generation error:', error);
    } finally {
      setAutoDescriptionLoading(false);
    }
  }, [autoGeneration, title]);

  const handleGenerateTags = useCallback(async () => {
    try {
      setAutoTagsLoading(true);
      await autoGeneration.generateTags(title);
    } catch (error) {
      console.error('Tags generation error:', error);
    } finally {
      setAutoTagsLoading(false);
    }
  }, [autoGeneration, title]);

  if (!isVisible) return null;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full overflow-y-auto p-4 bg-white">
        {/* Progress bar when submitting */}
        {submission.isSubmitting && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-600 font-medium">
                {autoMode === 'direct-etsy' ? "Etsy'ye Draft Gönderiliyor..." : "Kuyruğa Ekleniyor..."}
              </span>
              <span className="text-gray-500">{submission.progress}%</span>
            </div>
            <Progress value={submission.progress} className="h-2" />
          </div>
        )}

        {/* Auto processing indicator */}
        {isProcessingAuto && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-sm text-blue-800 font-medium">AI ile otomatik işleniyor...</span>
            </div>
            <div className="text-xs text-blue-600 mt-1">
              Başlık ve etiketler üretiliyor, ardından otomatik gönderilecek
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Media Manager */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Medya Dosyaları</CardTitle>
            </CardHeader>
            <CardContent>
              <ProductMediaManager
                productImages={productImages}
                videoFile={videoFile}
                onImagesChange={setProductImages}
                onVideoChange={setVideoFile}
                isSubmitting={submission.isSubmitting}
              />
            </CardContent>
          </Card>

          {/* Form Fields */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Ürün Bilgileri</CardTitle>
            </CardHeader>
            <CardContent>
              <ProductFormFields
                title={title}
                description={description}
                price={price}
                quantity={quantity}
                tags={tags}
                isPersonalizable={isPersonalizable}
                personalizationRequired={personalizationRequired}
                personalizationInstructions={personalizationInstructions}
                taxonomyId={taxonomyId}
                hasVariations={hasVariations}
                variations={variations}
                selectedShopSection={selectedShopSection}
                shippingProfileId={shippingProfileId}
                shopSections={shopSections}
                autoTitleLoading={autoTitleLoading}
                autoDescriptionLoading={autoDescriptionLoading}
                autoTagsLoading={autoTagsLoading}
                loadingShopSections={loadingShopSections}
                loadingShippingProfiles={loadingShippingProfiles}
                isSubmitting={submission.isSubmitting}
                onTitleChange={setTitle}
                onDescriptionChange={setDescription}
                onPriceChange={setPrice}
                onQuantityChange={setQuantity}
                onTagsChange={setTags}
                onPersonalizableChange={setIsPersonalizable}
                onPersonalizationRequiredChange={setPersonalizationRequired}
                onPersonalizationInstructionsChange={setPersonalizationInstructions}
                onTaxonomyIdChange={setTaxonomyId}
                onHasVariationsChange={setHasVariations}
                onVariationsChange={setVariations}
                onShopSectionChange={setSelectedShopSection}
                onShippingProfileChange={setShippingProfileId}
                onGenerateTitle={handleGenerateTitle}
                onGenerateDescription={handleGenerateDescription}
                onGenerateTags={handleGenerateTags}
              />
            </CardContent>
          </Card>

          {/* Submit Section */}
          <div className="pt-4 border-t">
            <div className="flex flex-col gap-3">
              {/* Form Status */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  {title && productImages.length > 0 ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Package className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-sm font-medium">
                    {title && productImages.length > 0 ? 'Form Hazır' : 'Form Tamamlanmadı'}
                  </span>
                </div>
                <Badge variant={autoMode === 'direct-etsy' ? 'default' : 'secondary'}>
                  {autoMode === 'direct-etsy' ? 'Direkt Etsy' : 'Kuyruk Modu'}
                </Badge>
              </div>

              {/* Submit Button */}
              <Button 
                onClick={handleManualSubmit}
                disabled={submission.isSubmitting}
                className="w-full"
                size="lg"
                data-testid="submit-button"
              >
                {submission.isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {autoMode === 'direct-etsy' ? "Etsy'ye Gönderiliyor..." : "Kuyruğa Ekleniyor..."}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {autoMode === 'direct-etsy' ? "Etsy'ye Draft Gönder" : "Kuyruğa Ekle"}
                  </>
                )}
              </Button>

              {/* Quick Actions */}
              {!submission.isSubmitting && productImages.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateTitle}
                    disabled={autoTitleLoading}
                    className="flex-1"
                  >
                    <Wand2 className="w-3 h-3 mr-1" />
                    AI Başlık
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateTags}
                    disabled={autoTagsLoading || !title}
                    className="flex-1"
                  >
                    <Wand2 className="w-3 h-3 mr-1" />
                    AI Etiket
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}