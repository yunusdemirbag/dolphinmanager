'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
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
  Zap,
  Package
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import ProductFormModal from './ProductFormModal';
import EmbeddedProductForm from './EmbeddedProductForm';

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
  completedProducts: number;
}

interface Settings {
  imagesPerProduct: number;
  selectedImagesFolder: string;
  selectedResourcesFolder: string;
  mode: 'queue' | 'direct-etsy'; // İki mod: Kuyruğa ekle veya direkt Etsy'ye
  imageFiles: File[];
  resourceFiles: File[];
  imagePreviewUrls: string[];
  resourcePreviewUrls: string[];
}

// Helper function to format time duration
const formatDuration = (totalSeconds: number): string => {
  if (totalSeconds <= 0) return '0 dk';
  
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  
  let result = '';
  
  // Gün varsa ekle
  if (days > 0) {
    result += `${days} gün`;
  }
  
  // Saat varsa ekle  
  if (hours > 0) {
    if (result) result += ' ';
    result += `${hours} saat`;
  }
  
  // Dakika varsa ekle
  if (minutes > 0) {
    if (result) result += ' ';
    result += `${minutes} dk`;
  }
  
  // Hiçbiri yoksa en az 1 dk göster
  if (!result) {
    result = '< 1 dk';
  }
  
  return result;
};

export default function AutoProductPanel({ onClose }: AutoProductPanelProps) {
  const { toast } = useToast();
  const imagesFolderRef = useRef<HTMLInputElement>(null);
  const resourcesFolderRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<Settings>({
    imagesPerProduct: 6,
    selectedImagesFolder: '',
    selectedResourcesFolder: '',
    mode: 'direct-etsy', // Default: Direkt Etsy'ye
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
    processedProducts: [],
    completedProducts: 0
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  
  // Form döngü süresi için state'ler
  const [formCycleStartTime, setFormCycleStartTime] = useState<number | null>(null);
  const [globalStartTime, setGlobalStartTime] = useState<number | null>(null);
  const [lastProductTitle, setLastProductTitle] = useState<string>('');
  const [cycleTimes, setCycleTimes] = useState<number[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());

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

  // Real-time timer update
  useEffect(() => {
    if (globalStartTime && processing.status !== 'completed') {
      const interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [globalStartTime, processing.status]);

  // Form açıldığında cycle timer başlat
  useEffect(() => {
    if (showProductForm) {
      const startTime = Date.now();
      setFormCycleStartTime(startTime);
      console.log('⏱️ Form açıldı - Cycle timer başlatıldı:', new Date(startTime).toLocaleTimeString());
    }
  }, [showProductForm]);

  const handleImagesFolderSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const imageFiles = Array.from(files)
        .filter(file => file.type.startsWith('image/'))
        .sort((a, b) => a.name.localeCompare(b.name, 'tr-TR', { numeric: true }));
      
      // Alfabetik sıralama debug
      console.log('📂 Klasör dosyaları alfabetik sıralandı:', {
        toplamDosya: files.length,
        resimDosya: imageFiles.length,
        ilk5Dosya: imageFiles.slice(0, 5).map(f => f.name),
        son5Dosya: imageFiles.slice(-5).map(f => f.name)
      });
      
      // İlk 4 resim için önizleme URL'leri oluştur
      const previewFiles = imageFiles.slice(0, 4);
      const previewUrls = previewFiles.map(file => URL.createObjectURL(file));
      
      setSettings(prev => {
        // Önceki preview URL'leri temizle
        prev.imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
        
        return {
          ...prev,
          selectedImagesFolder: imageFiles.length > 0 ? 'selected' : '',
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
        .sort((a, b) => a.name.localeCompare(b.name, 'tr-TR', { numeric: true }));
      
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
          selectedResourcesFolder: resourceFiles.length > 0 ? 'selected' : '',
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
    
    // Reset all statistics for new processing session
    setCycleTimes([]);
    setLastProductTitle('');
    
    setProcessing(prev => ({
      ...prev,
      status: 'running',
      startTime: Date.now(),
      currentProduct: 1,
      totalProducts: Math.floor(settings.imageFiles.length / settings.imagesPerProduct),
      progress: 0,
      // Reset statistics
      averageTime: 0,
      processedProducts: [],
      errors: []
    }));

    setIsSettingsOpen(false);
    
    // Global zamanlayıcıyı başlat
    setGlobalStartTime(Date.now());
    
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
      processedProducts: [],
      completedProducts: 0
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
    setCycleTimes([]);
    setFormCycleStartTime(null);
    setGlobalStartTime(null);

    toast({
      title: "İşleme Sıfırlandı",
      description: "Baştan başlayabilirsiniz."
    });
  }, [settings.imageFiles.length, settings.imagesPerProduct, toast, STORAGE_KEY]);

  // Get current product files - YENİ MANTIK: Her zaman ilk 6 dosya + kaynak dosyalar
  const getCurrentProductFiles = useCallback(() => {
    // Artık index hesaplamaya gerek yok - her zaman ilk 6 dosyayı al
    const currentProductImages = settings.imageFiles.slice(0, settings.imagesPerProduct);
    
    // Kaynak dosyalarını video ve resim olarak ayır
    const resourceImages = settings.resourceFiles.filter(file => file.type.startsWith('image/'));
    const resourceVideos = settings.resourceFiles.filter(file => file.type.startsWith('video/'));
    
    // Her ürün için: İlk 6 resim + Kaynak resimleri (video hariç)
    const allFiles = [...currentProductImages, ...resourceImages];
    
    console.log(`🔍 GÜNCEL DOSYA LİSTESİ:`, {
      toplamDosyaSayısı: settings.imageFiles.length,
      alınacakResimSayısı: currentProductImages.length,
      alınacakResimAdları: currentProductImages.map(f => f.name),
      kaynakResimleri: resourceImages.map(f => f.name),
      kaynakVideoları: resourceVideos.map(f => f.name),
      toplamGönderilecekResim: allFiles.length,
      toplamGönderilecekVideo: resourceVideos.length,
      alfabetikSıralama: currentProductImages.map((f, i) => `${i+1}: ${f.name}`).slice(0, 3)
    });
    
    return { files: allFiles, videos: resourceVideos };
  }, [settings.imageFiles, settings.resourceFiles, settings.imagesPerProduct]);

  // Memoize edilmiş dosya listesi - infinite loop önlemi
  const memoizedProductFiles = useMemo(() => {
    return getCurrentProductFiles();
  }, [settings.imageFiles.length, settings.resourceFiles.length, settings.imagesPerProduct]);

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
  const handleFormSubmitSuccess = useCallback(async (productTitle?: string) => {
    console.log(`✅ Ürün ${currentProductIndex + 1} başarıyla eklendi`);
    
    // Önce completedProducts sayısını artır
    setProcessing(prevProc => ({
      ...prevProc,
      completedProducts: prevProc.completedProducts + 1
    }));

    // Form döngü zamanını hesapla ve kaydet
    const currentTime = Date.now();
    if (formCycleStartTime) {
      const cycleElapsed = Math.round((currentTime - formCycleStartTime) / 1000);
      console.log('⏱️ Ürün döngü süresi:', cycleElapsed, 'saniye');
      
      setCycleTimes(prev => {
        const newTimes = [...prev, cycleElapsed];
        const totalTime = newTimes.reduce((a, b) => a + b, 0); // Toplam süre
        const avgTime = totalTime / newTimes.length;
        
        console.log('📊 Cycle times updated:', {
          newTime: cycleElapsed,
          allTimes: newTimes,
          totalTime,
          averageTime: Math.round(avgTime),
          completedProducts: newTimes.length
        });
        
        // Processing state'ini güncelle (averageTime)
        setProcessing(prevProc => ({
          ...prevProc,
          averageTime: totalTime // Toplam süre olarak kaydet
        }));
        
        return newTimes;
      });
    } else {
      console.log('❌ formCycleStartTime null - süre hesaplanamadı!');
    }
    
    // Ürün başlığını kaydet (döngü süresi için)
    const finalProductTitle = productTitle || generateProductTitle(getCurrentProductFiles().files.find(f => f.type.startsWith('image/'))?.name || '');
    setLastProductTitle(finalProductTitle);
    
    // Add to processed products - her ürünün KENDI resmi
    const currentFiles = getCurrentProductFiles();
    // İlk resmi değil, o ürün için kullanılan GERÇEK ilk resmi al
    const productImages = currentFiles.files.filter(f => f.type.startsWith('image/') && !f.name.includes('logo') && !f.name.includes('watermark'));
    const firstProductImage = productImages[0]; // İlk ürün resmi
    
    if (firstProductImage) {
      const imageUrl = URL.createObjectURL(firstProductImage);
      
      setProcessing(prev => ({
        ...prev,
        processedProducts: [...prev.processedProducts, {
          title: finalProductTitle, // Gerçek gönderilen başlık
          image: imageUrl,
          timestamp: new Date().toLocaleTimeString('tr-TR')
        }],
        currentProduct: currentProductIndex + 1,
        progress: ((currentProductIndex + 1) / Math.floor(settings.imageFiles.length / settings.imagesPerProduct)) * 100
      }));
      
      console.log(`📝 Eklenen ürün kaydedildi: "${finalProductTitle}" - Resim: ${firstProductImage.name}`);
    }
    
    // 🗑️ YENİ MANTIK: İlk 6 dosyayı çöp kutusuna at
    console.log('🗑️ Form başarıyla gönderildi, ilk 6 resmi silme işlemi başlıyor...');
    const filesToDelete = settings.imageFiles.slice(0, settings.imagesPerProduct); // İlk 6 dosya
    
    // Calculate remaining files BEFORE try block
    const remainingFiles = settings.imageFiles.slice(settings.imagesPerProduct);
    const newRemainingFiles = remainingFiles.length;
    const newTotalProducts = Math.floor(newRemainingFiles / settings.imagesPerProduct);
    
    try {
      // Dosyaları çöp kutusuna taşı (macOS için)
      for (const file of filesToDelete) {
        const filePath = file.webkitRelativePath || file.name;
        console.log(`🗑️ Çöp kutusuna taşınıyor: ${file.name}`);
        
        // Web API ile dosya silme (sadece referansı kaldırır)
        // Gerçek dosya silme browser'da mümkün değil, ama listeden çıkarabiliriz
      }
      
      // Dosya listesini güncelle - ilk 6'yı çıkar
      setSettings(prev => ({
        ...prev,
        imageFiles: remainingFiles
      }));
      
      console.log(`🗑️ ${filesToDelete.length} dosya listeden çıkarıldı, kalan: ${remainingFiles.length}`);
      console.log('🔄 Kalan dosyaların ilk 5\'i:', remainingFiles.slice(0, 5).map(f => f.name));
      
      toast({
        title: "Dosyalar Temizlendi",
        description: `${filesToDelete.length} işlenen dosya listeden çıkarıldı`
      });
      
    } catch (error) {
      console.error('❌ Dosya silme hatası:', error);
    }
    
    // Close current form
    setShowProductForm(false);
    
    if (newRemainingFiles >= settings.imagesPerProduct) {
      // Hala işlenecek dosya var - sonraki ürüne geç (ama index sıfırla)
      // Minimum bekleme süresi - sadece UI render için
      const waitTime = 500; // 0.5 saniye yeterli
      console.log(`⏰ Form kapandı, ${waitTime}ms bekleniyor...`);
      
      // Capture current values before setTimeout to avoid stale closure
      const currentFormCycleStartTime = formCycleStartTime;
      const currentLastProductTitle = lastProductTitle;
      
      setTimeout(() => {
        console.log(`🔄 Sonraki ürün için form açılıyor... (index sıfırlanıyor: 0)`);
        
        // Form döngü süresini hesapla
        if (currentFormCycleStartTime && currentLastProductTitle) {
          const cycleEndTime = Date.now();
          const cycleElapsed = Math.round((cycleEndTime - currentFormCycleStartTime) / 1000);
          const firstThreeWords = currentLastProductTitle.split(' ').slice(0, 3).join(' ');
          
          console.log(`🔄 ${firstThreeWords} - Form döngüsü ${cycleElapsed} saniyede tamamlandı (kapanış→açılış)`);
        }
        
        setCurrentProductIndex(0); // Index'i sıfırla çünkü dosyalar silindi
        setShowProductForm(true);
        
        // Kalan ürün sayısını hesapla (6'şar resimle)
        const remainingProducts = Math.ceil(newRemainingFiles / 6);
        
        // Toast mesajında döngü süresini göster
        let toastDescription = `Kalan ${newRemainingFiles} dosyadan ${remainingProducts} ürün kaldı`;
        if (cycleTimes.length > 0) {
          const avgTime = cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length;
          const modeText = settings.mode === 'direct-etsy' ? 'Etsy\'ye' : 'kuyruğa';
          toastDescription += ` | Ortalama: ${formatDuration(Math.round(avgTime))}`;
        }
        
        toast({
          title: "Sonraki Ürün",
          description: toastDescription,
          duration: 3000 // 3 saniye
        });
      }, waitTime); // Mode'a göre bekleme süresi
    } else {
      // All products completed
      console.log('🏁 Tüm ürünler tamamlandı - Global timer durduruluyor (ama süre korunuyor)');
      // setGlobalStartTime(null); // ← KALDIRILDI: Sayacı sıfırlamıyoruz, sadece durduruyoruz
      setProcessing(prev => ({
        ...prev,
        status: 'completed',
        progress: 100
      }));
      
      const totalTimeElapsed = globalStartTime ? Math.round((Date.now() - globalStartTime) / 1000) : 0;
      
      toast({
        title: "Tamamlandı!",
        description: `Tüm dosyalar işlendi! Toplam süre: ${formatDuration(totalTimeElapsed)}`
      });
    }
  }, [currentProductIndex, settings.imageFiles, settings.imagesPerProduct, processing.totalProducts, toast, getCurrentProductFiles, generateProductTitle]);

  // Handle form close
  const handleFormClose = useCallback(() => {
    setShowProductForm(false);
    setProcessing(prev => ({
      ...prev,
      status: 'idle'
    }));
  }, []);


  return (
    <div className="max-w-7xl mx-auto">
      {/* iki bölümlü layout */}
      <div className={`grid transition-all duration-500 ${!isSettingsOpen ? 'grid-cols-1 lg:grid-cols-2 gap-6' : 'grid-cols-1'}`}>
        {/* Sol bölüm - Settings/Form Panel */}
        <div className="space-y-6">
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
            {/* MOD BİLGİSİ */}
            <div className="border rounded-lg p-4 bg-green-50">
              <Label className="text-sm font-semibold text-green-800 mb-3 block">
                🚀 İşlem Modu
              </Label>
              <div className="flex items-center gap-3 p-3 bg-white rounded border border-green-200">
                <Zap className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-semibold text-green-800">Direkt Etsy Draft</div>
                  <div className="text-xs text-green-600">Ürünler direkt Etsy'ye taslak olarak gönderilir</div>
                </div>
                <Badge variant="secondary" className="ml-auto bg-green-100 text-green-700">
                  Aktif
                </Badge>
              </div>
              
              <div className="mt-3 text-xs text-green-700 bg-green-100 p-2 rounded">
                ⚡ Ürünler otomatik olarak Etsy'ye draft (taslak) olarak eklenir. Etsy mağazanızda kontrol edebilirsiniz.
              </div>
            </div>
            
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
                    {settings.imageFiles.length > 0 && (
                      <p className="text-sm text-green-600 font-medium">{settings.imageFiles.length} resim seçildi</p>
                    )}
                    
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
                    {settings.resourceFiles.length > 0 && (
                      <p className="text-sm text-green-600 font-medium">{settings.resourceFiles.length} kaynak dosya seçildi</p>
                    )}
                    
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
{settings.imageFiles.length > 0 && (
                <p className="text-sm text-gray-600">
                  {`${settings.imageFiles.length} resim ÷ ${settings.imagesPerProduct} = ${Math.floor(settings.imageFiles.length / settings.imagesPerProduct)} ürün (her üründe ${settings.imagesPerProduct} resim + ${settings.resourceFiles.length} kaynak dosya)`}
                </p>
              )}
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

          {/* Sol panel'de form açık kalacak */}
          {!isSettingsOpen && (
            <div className="space-y-4">
              {/* İşlem durumu - küçük kart */}
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">İşlem Durumu</span>
                    </div>
                    <div className="text-xs text-green-600">
                      {showProductForm ? 'Form Açık' : 'Bekliyor'}
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between items-center text-xs text-green-700">
                      <span>Ürün {processing.currentProduct} / {processing.totalProducts}</span>
                      <span>%{Math.round(processing.progress)}</span>
                    </div>
                    <div className="w-full bg-green-100 rounded-full h-1.5 mt-1">
                      <div 
                        className="bg-green-500 h-1.5 rounded-full transition-all duration-500" 
                        style={{ width: `${processing.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <Button onClick={resetProcessing} variant="outline" size="sm" className="border-green-300 text-green-700 hover:bg-green-50">
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Durdur
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* EMBEDDED FORM - Normal form gömülü halde */}
              <div className="h-[700px] border border-gray-200 rounded-lg bg-white">
                {/* Form header */}
                <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Yeni Ürün Ekle</span>
                  </div>
                  <Badge variant="outline" className="text-xs bg-green-100 text-green-700">
                    {showProductForm ? 'Otomatik Mod' : 'Bekleme'}
                  </Badge>
                </div>
                
                {/* Form content */}
                <div className="h-[calc(100%-48px)]">
                  {showProductForm ? (
                    <EmbeddedProductForm
                      key={`embedded-form-stable-${currentProductIndex}`}
                      isVisible={true}
                      autoFiles={memoizedProductFiles.files}
                      autoVideoFiles={memoizedProductFiles.videos}
                      autoMode={settings.mode}
                      onSubmitSuccess={handleFormSubmitSuccess}
                      onClose={handleFormClose}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Package className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-500">Form bekleme modunda</p>
                        <p className="text-xs text-gray-400 mt-1">Otomatik işlem başlatıldığında form burada açılacak</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sağ bölüm - İstatistikler Paneli */}
        {!isSettingsOpen && (
          <div className="space-y-6">
            {/* En Son Eklenen Ürünler */}
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-purple-800">
                  <Package className="w-5 h-5" />
                  En Son Eklenen Ürünler
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {processing.processedProducts.slice(-5).reverse().length === 0 ? (
                    <div className="text-center py-8 text-purple-400">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Henüz ürün eklenmedi</p>
                    </div>
                  ) : (
                    processing.processedProducts.slice(-5).reverse().map((product, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-white/70 rounded-lg border border-purple-100 hover:bg-white/90 transition-colors">
                        <img 
                          src={product.image} 
                          alt={product.title}
                          className="w-10 h-10 object-cover rounded border-2 border-purple-200"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {product.title.split(' ').slice(0, 4).join(' ')}...
                          </p>
                          <p className="text-xs text-purple-600">
                            {product.timestamp}
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs">
                          #{processing.processedProducts.length - index}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* İstatistikler Paneli */}
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Clock className="w-5 h-5" />
                  İşlem İstatistikleri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Toplam Ürün Ekleme Süresi */}
                <div className="p-4 bg-white/70 rounded-lg border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-800">Toplam Ürün Ekleme Süresi</span>
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {globalStartTime ? (() => {
                      const totalElapsed = Math.floor((currentTime - globalStartTime) / 1000);
                      return `${Math.floor(totalElapsed / 3600).toString().padStart(2, '0')}:${Math.floor((totalElapsed % 3600) / 60).toString().padStart(2, '0')}:${(totalElapsed % 60).toString().padStart(2, '0')}`;
                    })() : '--:--:--'}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    Toplam Liste Süresi (saat:dakika:saniye)
                  </div>
                  
                  {/* Tek Ürün Ortalama Süresi */}
                  <div className="mt-3 pt-3 border-t border-blue-100">
                    <div className="text-lg font-semibold text-blue-800">
                      {cycleTimes.length > 0 ? (() => {
                        const avgTimePerProduct = cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length;
                        return formatDuration(Math.floor(avgTimePerProduct));
                      })() : '--'}
                    </div>
                    <div className="text-xs text-blue-600">
                      1 Ürün Ortalama Süresi
                    </div>
                  </div>
                </div>

                {/* Kalan Ürün Sayısı */}
                <div className="p-4 bg-white/70 rounded-lg border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-800">Kalan Ürün Sayısı</span>
                    <Package className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {Math.max(0, Math.floor(settings.imageFiles.length / settings.imagesPerProduct))}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    {settings.imageFiles.length} resim ÷ {settings.imagesPerProduct} = {Math.floor(settings.imageFiles.length / settings.imagesPerProduct)} ürün
                  </div>
                </div>

                {/* Tahmini İşlem Bitiş Süresi */}
                <div className="p-4 bg-white/70 rounded-lg border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-800">Tahmini Bitiş Süresi</span>
                    <AlertCircle className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="space-y-2">
                    <div className="text-lg font-bold text-blue-900">
                      {cycleTimes.length > 0 && settings.imageFiles.length > 0 ? (() => {
                        const avgTimePerProduct = cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length;
                        const remainingProducts = Math.max(0, Math.floor(settings.imageFiles.length / settings.imagesPerProduct));
                        const totalRemainingTime = remainingProducts * avgTimePerProduct;
                        return formatDuration(Math.floor(totalRemainingTime));
                      })() : '--'}
                    </div>
                    <div className="text-xs text-blue-600">
                      Kalan DK: {cycleTimes.length > 0 && settings.imageFiles.length > 0 ? (() => {
                        const avgTimePerProduct = cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length;
                        const remainingProducts = Math.max(0, Math.floor(settings.imageFiles.length / settings.imagesPerProduct));
                        const totalRemainingTime = remainingProducts * avgTimePerProduct;
                        return Math.floor(totalRemainingTime / 60);
                      })() : '--'}
                    </div>
                  </div>
                </div>

                {/* Bitiş Zamanı */}
                <div className="p-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-800">Bitiş Zamanı</span>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="text-lg font-bold text-green-900">
                    {cycleTimes.length > 0 && settings.imageFiles.length > 0 ? (() => {
                      const avgTimePerProduct = cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length;
                      const remainingProducts = Math.max(0, Math.floor(settings.imageFiles.length / settings.imagesPerProduct));
                      const totalRemainingTime = remainingProducts * avgTimePerProduct;
                      return new Date(currentTime + (totalRemainingTime * 1000)).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                    })() : '--:--'}
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    {cycleTimes.length > 0 && settings.imageFiles.length > 0 ? (() => {
                      const avgTimePerProduct = cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length;
                      const remainingProducts = Math.max(0, Math.floor(settings.imageFiles.length / settings.imagesPerProduct));
                      const totalRemainingTime = remainingProducts * avgTimePerProduct;
                      return new Date(currentTime + (totalRemainingTime * 1000)).toLocaleDateString('tr-TR');
                    })() : 'Hesaplanıyor...'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Modal kaldırıldı - artık embedded form kullanıyoruz */}
    </div>
  );
}