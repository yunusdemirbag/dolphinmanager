'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  FolderOpen, 
  Settings as SettingsIcon,
  Clock,
  Image,
  CheckCircle,
  AlertCircle,
  Zap
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import ProductFormModal from './ProductFormModal';

interface AutoProductPanelProps {
  onClose?: () => void;
}

interface ProcessingState {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  currentProduct: number;
  totalProducts: number;
  currentImage: string;
  progress: number;
  timeRemaining: string;
  averageTime: number;
  startTime: number | null;
  errors: string[];
  processedProducts: Array<{
    title: string;
    image: string;
    timestamp: string;
  }>;
}

interface Settings {
  imagesPerProduct: number;
  selectedImagesFolder: string;
  selectedResourcesFolder: string;
  imageFiles: File[];
  resourceFiles: File[];
  imagePreviewUrls: string[];
  resourcePreviewUrls: string[];
}

export default function AutoProductPanel({ onClose }: AutoProductPanelProps) {
  const { toast } = useToast();
  const imagesFolderRef = useRef<HTMLInputElement>(null);
  const resourcesFolderRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<Settings>({
    imagesPerProduct: 6,
    selectedImagesFolder: '',
    selectedResourcesFolder: '',
    imageFiles: [],
    resourceFiles: [],
    imagePreviewUrls: [],
    resourcePreviewUrls: []
  });

  const [processing, setProcessing] = useState<ProcessingState>({
    status: 'idle',
    currentProduct: 0,
    totalProducts: 0,
    currentImage: '',
    progress: 0,
    timeRemaining: '',
    averageTime: 0,
    startTime: null,
    errors: [],
    processedProducts: []
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);

  // LocalStorage keys
  const STORAGE_KEY = 'auto-product-state';
  const SETTINGS_KEY = 'auto-product-settings';

  // Load saved state on component mount
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        setProcessing(prev => ({ ...prev, ...parsedState }));
      } catch (error) {
        console.error('Failed to load saved state:', error);
      }
    }
    
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsedSettings }));
      } catch (error) {
        console.error('Failed to load saved settings:', error);
      }
    }
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    if (processing.status !== 'idle') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        currentProduct: processing.currentProduct,
        totalProducts: processing.totalProducts,
        progress: processing.progress,
        timeRemaining: processing.timeRemaining,
        averageTime: processing.averageTime,
        errors: processing.errors
      }));
    }
  }, [processing]);

  // Save settings to localStorage
  useEffect(() => {
    if (settings.imagesPerProduct !== 6 || settings.selectedImagesFolder || settings.selectedResourcesFolder) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        imagesPerProduct: settings.imagesPerProduct,
        selectedImagesFolder: settings.selectedImagesFolder,
        selectedResourcesFolder: settings.selectedResourcesFolder
      }));
    }
  }, [settings]);
  
  // Component unmount olduğunda preview URL'leri temizle
  useEffect(() => {
    return () => {
      settings.imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
      settings.resourcePreviewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const handleImagesFolderSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const imageFiles = Array.from(files)
        .filter(file => file.type.startsWith('image/'))
        .sort((a, b) => a.name.localeCompare(b.name));
      
      // İlk 4 resim için önizleme URL'leri oluştur
      const previewFiles = imageFiles.slice(0, 4);
      const previewUrls = previewFiles.map(file => URL.createObjectURL(file));
      
      setSettings(prev => {
        // Önceki preview URL'leri temizle
        prev.imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
        
        return {
          ...prev,
          selectedImagesFolder: imageFiles.length > 0 ? `${imageFiles.length} resim seçildi` : '',
          imageFiles,
          imagePreviewUrls: previewUrls
        };
      });

      // Her ürün için images + resources kullanılacak
      const totalProducts = Math.floor(imageFiles.length / settings.imagesPerProduct);
      setProcessing(prev => ({
        ...prev,
        totalProducts
      }));

      toast({
        title: "Görseller Klasörü",
        description: `${imageFiles.length} resim yüklendi. ${settings.imagesPerProduct} resim + kaynaklar = ${totalProducts} ürün oluşturulacak.`
      });
    }
  }, [settings.imagesPerProduct, toast]);

  const handleResourcesFolderSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const resourceFiles = Array.from(files)
        .filter(file => file.type.startsWith('image/') || file.type.startsWith('video/'))
        .sort((a, b) => a.name.localeCompare(b.name));
      
      console.log('📁 Kaynaklar klasörü seçildi:', {
        total: files.length,
        images: resourceFiles.filter(f => f.type.startsWith('image/')).length,
        videos: resourceFiles.filter(f => f.type.startsWith('video/')).length
      });
      
      // İlk 4 dosya için önizleme URL'leri oluştur (sadece resimler için)
      const previewFiles = resourceFiles.filter(file => file.type.startsWith('image/')).slice(0, 4);
      const previewUrls = previewFiles.map(file => URL.createObjectURL(file));
      
      setSettings(prev => {
        // Önceki preview URL'leri temizle
        prev.resourcePreviewUrls.forEach(url => URL.revokeObjectURL(url));
        
        return {
          ...prev,
          selectedResourcesFolder: resourceFiles.length > 0 ? `${resourceFiles.length} kaynak dosya seçildi` : '',
          resourceFiles,
          resourcePreviewUrls: previewUrls
        };
      });

      toast({
        title: "Kaynaklar Klasörü",
        description: `${resourceFiles.length} kaynak dosya yüklendi.`
      });
    }
  }, [toast]);


  const startProcessing = useCallback(async () => {
    if (settings.imageFiles.length === 0) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Lütfen önce Görseller klasörünü seçin."
      });
      return;
    }

    // Reset and start from first product
    setCurrentProductIndex(0);
    setProcessing(prev => ({
      ...prev,
      status: 'running',
      startTime: Date.now(),
      currentProduct: 1,
      totalProducts: Math.floor(settings.imageFiles.length / settings.imagesPerProduct),
      progress: 0
    }));

    setIsSettingsOpen(false);
    
    // Show normal ProductFormModal directly
    setShowProductForm(true);
    
    toast({
      title: "Otomatik İşleme Başladı",
      description: `Normal ürün ekleme formu açılıyor. ${Math.floor(settings.imageFiles.length / settings.imagesPerProduct)} ürün işlenecek.`
    });
  }, [settings.imageFiles.length, settings.imagesPerProduct, toast]);


  const resetProcessing = useCallback(() => {
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEY);
    
    setProcessing({
      status: 'idle',
      currentProduct: 0,
      totalProducts: Math.floor(settings.imageFiles.length / settings.imagesPerProduct),
      currentImage: '',
      progress: 0,
      timeRemaining: '',
      averageTime: 0,
      startTime: null,
      errors: [],
      processedProducts: []
    });
    
    // Preview URL'leri de temizle
    settings.imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
    settings.resourcePreviewUrls.forEach(url => URL.revokeObjectURL(url));
    setSettings(prev => ({
      ...prev,
      imagePreviewUrls: [],
      resourcePreviewUrls: []
    }));

    // Reset form states
    setShowProductForm(false);
    setCurrentProductIndex(0);

    toast({
      title: "İşleme Sıfırlandı",
      description: "Baştan başlayabilirsiniz."
    });
  }, [settings.imageFiles.length, settings.imagesPerProduct, toast, STORAGE_KEY]);

  // Get current product files
  const getCurrentProductFiles = useCallback(() => {
    const startImageIndex = currentProductIndex * settings.imagesPerProduct;
    const currentProductImages = settings.imageFiles.slice(startImageIndex, startImageIndex + settings.imagesPerProduct);
    return [...currentProductImages, ...settings.resourceFiles];
  }, [currentProductIndex, settings.imageFiles, settings.resourceFiles, settings.imagesPerProduct]);

  // Generate product title from image name
  const generateProductTitle = useCallback((imageName: string): string => {
    const baseName = imageName.replace(/\.[^/.]+$/, "");
    const cleanName = baseName
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
    
    const title = `${cleanName} Canvas Wall Art - Modern Home Decor`;
    
    if (title.length > 140) {
      return title.substring(0, 137) + '...';
    }
    
    if (title.length < 5) {
      return `${cleanName} Art Print - Canvas Wall Decor for Home`;
    }
    
    return title;
  }, []);

  // Handle form submission success
  const handleFormSubmitSuccess = useCallback(async () => {
    console.log(`✅ Ürün ${currentProductIndex + 1} başarıyla eklendi`);
    
    // Add to processed products
    const currentFiles = getCurrentProductFiles();
    const firstImage = currentFiles.find(f => f.type.startsWith('image/'));
    
    if (firstImage) {
      const imageUrl = URL.createObjectURL(firstImage);
      const productTitle = generateProductTitle(firstImage.name);
      
      setProcessing(prev => ({
        ...prev,
        processedProducts: [...prev.processedProducts, {
          title: productTitle,
          image: imageUrl,
          timestamp: new Date().toLocaleTimeString('tr-TR')
        }],
        currentProduct: currentProductIndex + 1,
        progress: ((currentProductIndex + 1) / processing.totalProducts) * 100
      }));
    }
    
    // Close current form
    setShowProductForm(false);
    
    // Move to next product
    const nextProductIndex = currentProductIndex + 1;
    const totalProducts = Math.floor(settings.imageFiles.length / settings.imagesPerProduct);
    
    if (nextProductIndex < totalProducts) {
      // Wait 5 seconds before opening next form (as requested)
      console.log('⏰ Form kapandı, 5 saniye bekleniyor...');
      setTimeout(() => {
        console.log('🔄 Sonraki ürün için form açılıyor...');
        setCurrentProductIndex(nextProductIndex);
        setShowProductForm(true);
        
        toast({
          title: "Sonraki Ürün",
          description: `Ürün ${nextProductIndex + 1}/${totalProducts} otomatik işleniyor...`
        });
      }, 5000); // 5 saniye bekle (kullanıcının isteği)
    } else {
      // All products completed
      setProcessing(prev => ({
        ...prev,
        status: 'completed',
        progress: 100
      }));
      
      toast({
        title: "Tamamlandı!",
        description: `${totalProducts} ürün başarıyla kuyruğa eklendi.`
      });
    }
  }, [currentProductIndex, settings.imageFiles.length, settings.imagesPerProduct, processing.totalProducts, toast, getCurrentProductFiles, generateProductTitle]);

  // Handle form close
  const handleFormClose = useCallback(() => {
    setShowProductForm(false);
    setProcessing(prev => ({
      ...prev,
      status: 'idle'
    }));
  }, []);


  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Settings Panel */}
      {isSettingsOpen && (
        <Card className="border-2 border-dashed border-gray-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" />
              Otomatik Ürün Ekleme Ayarları
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Images Folder */}
              <div className="space-y-2">
                <Label htmlFor="images-folder">Görseller Klasörü</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => imagesFolderRef.current?.click()}
                    className="flex-1"
                  >
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Klasör Seç
                  </Button>
                  <input
                    ref={imagesFolderRef}
                    type="file"
                    multiple
                    accept="image/*"
                    webkitdirectory=""
                    className="hidden"
                    onChange={handleImagesFolderSelect}
                  />
                </div>
                {settings.selectedImagesFolder && (
                  <div className="space-y-3">
                    <p className="text-sm text-green-600 font-medium">{settings.selectedImagesFolder}</p>
                    
                    {/* Resim önizlemeleri */}
                    {settings.imagePreviewUrls.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500">Önizleme:</p>
                        <div className="grid grid-cols-4 gap-2">
                          {settings.imagePreviewUrls.map((url, index) => (
                            <div key={index} className="relative">
                              <img 
                                src={url} 
                                alt={`Önizleme ${index + 1}`}
                                className="w-full h-16 object-cover rounded-md border border-gray-200 shadow-sm"
                              />
                              <div className="absolute bottom-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1 py-0.5 rounded">
                                {index + 1}
                              </div>
                            </div>
                          ))}
                          {settings.imageFiles.length > 4 && (
                            <div className="flex items-center justify-center h-16 bg-gray-100 rounded-md border border-gray-200">
                              <span className="text-xs text-gray-500 text-center">
                                +{settings.imageFiles.length - 4}<br/>tane daha
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Resources Folder */}
              <div className="space-y-2">
                <Label htmlFor="resources-folder">Kaynaklar Klasörü</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => resourcesFolderRef.current?.click()}
                    className="flex-1"
                  >
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Klasör Seç
                  </Button>
                  <input
                    ref={resourcesFolderRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    webkitdirectory=""
                    className="hidden"
                    onChange={handleResourcesFolderSelect}
                  />
                </div>
                {settings.selectedResourcesFolder && (
                  <div className="space-y-3">
                    <p className="text-sm text-green-600 font-medium">{settings.selectedResourcesFolder}</p>
                    
                    {/* Kaynak dosya önizlemeleri */}
                    {settings.resourcePreviewUrls.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500">Önizleme:</p>
                        <div className="grid grid-cols-4 gap-2">
                          {settings.resourcePreviewUrls.map((url, index) => (
                            <div key={index} className="relative">
                              <img 
                                src={url} 
                                alt={`Kaynak önizleme ${index + 1}`}
                                className="w-full h-16 object-cover rounded-md border border-gray-200 shadow-sm"
                              />
                              <div className="absolute bottom-1 right-1 bg-green-600 bg-opacity-80 text-white text-xs px-1 py-0.5 rounded">
                                K{index + 1}
                              </div>
                            </div>
                          ))}
                          {settings.resourceFiles.length > settings.resourcePreviewUrls.length && (
                            <div className="flex items-center justify-center h-16 bg-green-50 rounded-md border border-green-200">
                              <span className="text-xs text-green-600 text-center">
                                +{settings.resourceFiles.length - settings.resourcePreviewUrls.length}<br/>tane daha
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Images per Product */}
            <div className="space-y-2">
              <Label htmlFor="images-per-product">Ürün Başına Resim Sayısı</Label>
              <Input
                id="images-per-product"
                type="number"
                min="1"
                max="20"
                value={settings.imagesPerProduct}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setSettings(prev => ({ ...prev, imagesPerProduct: value }));
                  const totalProducts = Math.floor(settings.imageFiles.length / value);
                  setProcessing(prev => ({ ...prev, totalProducts }));
                }}
                className="w-32"
              />
              <p className="text-sm text-gray-600">
                {settings.imageFiles.length > 0 && (
                  `${settings.imageFiles.length} resim ÷ ${settings.imagesPerProduct} = ${Math.floor(settings.imageFiles.length / settings.imagesPerProduct)} ürün (her üründe ${settings.imagesPerProduct} resim + ${settings.resourceFiles.length} kaynak dosya)`
                )}
              </p>
            </div>

            {/* Start Button */}
            <div className="flex gap-2">
              <Button
                onClick={startProcessing}
                disabled={settings.imageFiles.length === 0}
                className="flex items-center gap-2"
                size="lg"
              >
                <Play className="w-4 h-4" />
                İşlemeyi Başlat
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Basit Progress - Sadece eklenen ürünler listesi */}
      {!isSettingsOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Eklenen Ürünler ({processing.processedProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {processing.processedProducts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Henüz ürün eklenmedi. Otomatik işlem devam ediyor...
                </p>
              ) : (
                processing.processedProducts.map((product, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-200">
                    <img 
                      src={product.image} 
                      alt={product.title}
                      className="w-12 h-12 object-cover rounded border"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {product.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {product.timestamp}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Basit Reset Butonu */}
            <div className="mt-4 text-center">
              <Button onClick={resetProcessing} variant="outline" className="flex items-center gap-2 mx-auto">
                <RotateCcw className="w-4 h-4" />
                Sıfırla
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Simple ProductFormModal - opens directly when processing starts */}
      <ProductFormModal
        isOpen={showProductForm}
        onClose={handleFormClose}
        userId="auto-processing"
        isAutoMode={true}
        autoFiles={getCurrentProductFiles()}
        autoTitle=""
        onSubmitSuccess={handleFormSubmitSuccess}
      />
    </div>
  );
}