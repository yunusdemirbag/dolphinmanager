'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Package } from 'lucide-react';
import ProductFormModal from '@/components/ProductFormModal';

interface AutoProductEngineProps {
  isActive: boolean;
  imageFiles: File[];
  resourceFiles: File[];
  imagesPerProduct: number;
  startFromProduct?: number;
  onProgress: (progress: {
    currentProduct: number;
    currentImage: string;
    progress: number;
    timeRemaining: string;
    averageTime: number;
    status: string;
    completedProduct?: {
      title: string;
      image: string;
    };
  }) => void;
  onComplete: (totalProcessed: number) => void;
  onError: (error: string) => void;
  onPause: () => void;
}

export default function AutoProductEngine({
  isActive,
  imageFiles,
  resourceFiles,
  imagesPerProduct,
  startFromProduct = 0,
  onProgress,
  onComplete,
  onError,
  onPause
}: AutoProductEngineProps) {
  const [currentProductIndex, setCurrentProductIndex] = useState(startFromProduct);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [productTimes, setProductTimes] = useState<number[]>([]);
  const productFormRef = useRef<any>(null);

  const processNextProduct = useCallback(async () => {
    if (!isActive || currentProductIndex >= Math.floor(imageFiles.length / imagesPerProduct)) {
      onComplete(currentProductIndex);
      return;
    }

    const productStartTime = Date.now();
    if (!startTime) setStartTime(productStartTime);

    // Get images for current product (6 resim)
    const startImageIndex = currentProductIndex * imagesPerProduct;
    const endImageIndex = startImageIndex + imagesPerProduct;
    const currentProductImages = imageFiles.slice(startImageIndex, endImageIndex);

    if (currentProductImages.length === 0) {
      onError(`Ürün ${currentProductIndex + 1} için resim bulunamadı`);
      return;
    }
    
    console.log(`📷 Ürün ${currentProductIndex + 1}:`, {
      productImages: currentProductImages.length,
      resourceFiles: resourceFiles.length,
      totalFiles: currentProductImages.length + resourceFiles.length
    });

    // Update progress
    const currentImage = currentProductImages[0]?.name || '';
    const progress = (currentProductIndex / Math.floor(imageFiles.length / imagesPerProduct)) * 100;
    
    // Calculate time estimates - only for next product
    const avgTime = productTimes.length > 0 
      ? productTimes.reduce((a, b) => a + b, 0) / productTimes.length 
      : 0;
    
    const remainingProducts = Math.floor(imageFiles.length / imagesPerProduct) - currentProductIndex;
    const timeRemaining = avgTime > 0 && remainingProducts > 0
      ? `Sonraki ürün: ~${Math.round(avgTime / 1000)}s, Kalan: ${remainingProducts} ürün`
      : remainingProducts > 0 
        ? `Kalan: ${remainingProducts} ürün`
        : 'Tamamlanıyor...';

    onProgress({
      currentProduct: currentProductIndex + 1,
      currentImage,
      progress,
      timeRemaining,
      averageTime: Math.round(avgTime / 1000),
      status: 'İşleniyor...'
    });

    try {
      // Ürün resimleri (6 adet) + kaynak dosyalar = toplam dosyalar
      const allFiles = [...currentProductImages, ...resourceFiles];
      
      console.log(`📦 Ürün ${currentProductIndex + 1} için dosya kombinasyonu:`, {
        productTitle: generateProductTitle(currentProductImages[0]?.name || ''),
        mainImages: currentProductImages.map(f => f.name),
        resourceFiles: resourceFiles.map(f => f.name),
        totalFiles: allFiles.length
      });
      
      // Create a data object for the form
      const productData = {
        title: generateProductTitle(currentProductImages[0]?.name || ''),
        description: generateProductDescription(),
        price: 80, // Default price
        tags: generateTags(currentProductImages[0]?.name || ''),
        images: allFiles, // 6 resim + kaynaklar
        // Add other required form data
      };

      // Submit product using ProductFormModal (real form)
      await submitProductDirectly(productData);

      const productEndTime = Date.now();
      const processingTime = productEndTime - productStartTime;
      
      setProductTimes(prev => [...prev, processingTime]);
      
      // Create image URL for display
      const imageUrl = URL.createObjectURL(currentProductImages[0]);
      
      // Notify completion with product details
      onProgress({
        currentProduct: currentProductIndex + 1,
        currentImage,
        progress,
        timeRemaining,
        averageTime: Math.round(processingTime / 1000),
        status: 'Ürün kuyruğa eklendi',
        completedProduct: {
          title: productData.title,
          image: imageUrl
        }
      });
      
      setCurrentProductIndex(prev => prev + 1);
      
      // 3 saniye bekle sonraki ürün için
      console.log('🕰️ 3 saniye bekleniyor...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Move to next product
      setTimeout(() => {
        processNextProduct();
      }, 1000); // Small delay between products

    } catch (error) {
      onError(`Ürün ${currentProductIndex + 1} işlenirken hata: ${error}`);
    }
  }, [
    isActive, 
    currentProductIndex, 
    imageFiles, 
    resourceFiles, 
    imagesPerProduct, 
    startTime, 
    productTimes, 
    onProgress, 
    onComplete, 
    onError
  ]);

  const generateProductTitle = (imageName: string): string => {
    // Remove extension and clean up filename
    const baseName = imageName.replace(/\.[^/.]+$/, "");
    const cleanName = baseName
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
    
    const title = `${cleanName} Canvas Wall Art - Modern Home Decor`;
    
    // Etsy title validation (max 140 characters)
    if (title.length > 140) {
      return title.substring(0, 137) + '...';
    }
    
    // Minimum length validation
    if (title.length < 5) {
      return `${cleanName} Art Print - Canvas Wall Decor for Home`;
    }
    
    return title;
  };

  const generateProductDescription = (): string => {
    return `🌟 Made Just for You – Fast & Safe Delivery 🌟

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
  };

  const generateTags = (imageName: string): string[] => {
    const baseTags = [
      'wall art', 'canvas print', 'modern decor', 'home decoration',
      'living room art', 'bedroom decor', 'office art', 'contemporary'
    ];

    // Add specific tags based on image name
    const fileName = imageName.toLowerCase();
    if (fileName.includes('abstract')) baseTags.push('abstract art');
    if (fileName.includes('flower') || fileName.includes('floral')) baseTags.push('floral art');
    if (fileName.includes('landscape')) baseTags.push('landscape art');
    if (fileName.includes('modern')) baseTags.push('modern art');
    if (fileName.includes('vintage')) baseTags.push('vintage style');

    return baseTags.slice(0, 13); // Etsy limit
  };

  const submitProductDirectly = async (productData: any): Promise<void> => {
    try {
      console.log('🚀 Form üzerinden ürün ekleme başlatılıyor...', {
        title: productData.title,
        imageCount: productData.images.length
      });
      
      // Real form submit through ProductFormModal
      if (productFormRef.current) {
        // Form'u otomatik doldur
        await productFormRef.current.fillFormAutomatically({
          title: productData.title,
          description: productData.description,
          price: productData.price,
          tags: productData.tags.join(', '),
          images: productData.images
        });
        
        // 2 saniye bekle ki doldurulmayı görebilesin
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Form submit et (Kuyruğa Gönder butonuna bas)
        await productFormRef.current.submitToQueue();
        
        // Form kapat
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('✅ Ürün form üzerinden başarıyla eklendi!');
      } else {
        // Fallback: Direct API
        await submitToQueue(productData);
      }
      
    } catch (error) {
      console.error('❌ Ürün ekleme hatası:', error);
      // Fallback: Direct API
      await submitToQueue(productData);
    }
  };
  
  const submitToQueue = async (productData: any): Promise<void> => {
    try {
      console.log('🚀 Queue API çağrısı başlatılıyor...', {
        title: productData.title,
        imageCount: productData.images.length
      });
      
      // Create FormData for the queue API
      const formData = new FormData();
      
      // Add listing data
      const listingData = {
        title: productData.title,
        description: productData.description,
        price: productData.price,
        tags: productData.tags,
        
        // Required Etsy fields
        quantity: 999,
        taxonomy_id: 1027, // Default to wall art category
        who_made: "i_did",
        when_made: "made_to_order",
        is_supply: false,
        renewal_option: "automatic",
        state: "draft",
        
        // Personalization settings
        is_personalizable: true,
        personalization_is_required: false,
        personalization_instructions: "Phone Number for Delivery",
        personalization_char_count_max: 256,
        
        // Default shipping profile - will be resolved by API
        shipping_profile_id: 1
      };
      
      console.log('📋 FormData oluşturuluyor...');
      formData.append('listingData', JSON.stringify(listingData));
      
      // Add image files
      productData.images.forEach((file: File, index: number) => {
        console.log(`📷 Resim ${index + 1} ekleniyor:`, file.name, (file.size / 1024).toFixed(1) + 'KB');
        formData.append(`imageFile_${index}`, file);
      });
      
      console.log('📤 API çağrısı yapılıyor...');
      
      // Submit to queue API
      const response = await fetch('/api/etsy/listings/queue', {
        method: 'POST',
        body: formData,
      });
      
      console.log('📥 API yanıtı alındı:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API hatası detayı:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Ürün başarıyla kuyruğa eklendi:', {
        queue_id: result.queue_id,
        status: result.status,
        message: result.message
      });
      
    } catch (error) {
      console.error('❌ Kuyruk API hatası:', error);
      throw error;
    }
  };

  // Start processing when activated
  useEffect(() => {
    if (isActive) {
      processNextProduct();
    }
  }, [isActive, processNextProduct]);

  return (
    <div>
      {/* Real ProductFormModal - visible when active */}
      <ProductFormModal
        ref={productFormRef}
        isOpen={isActive}
        onClose={() => {}}
        userId="auto-processing"
        isAutoMode={true}
      />
      
      {/* When not active, show placeholder */}
      {!isActive && (
        <div className="text-center p-8 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Otomatik işleme başlamadı</p>
          <p className="text-sm">"İşlemeyi Başlat" butonuna tıklayın</p>
        </div>
      )}
    </div>
  );
}