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

// GELATO VARYASYONLARı VE FİYATLARI
const GELATO_VARIATIONS = {
  'Roll (Poster)': [
    { size: '8"x12" (20x30 cm)', price: 66.00 },
    { size: '12"x18" (30x45 cm)', price: 61.48 },
    { size: '16"x24" (40x60 cm)', price: 74.64 },
    { size: '20"x28" (50x70 cm)', price: 90.14 },
    { size: '24"x36" (60x90 cm)', price: 102.42 },
    { size: '28"x40" (70x100 cm)', price: 117.14 },
    { size: '33"x46" (84x118 cm)', price: 145.23 }
  ],
  'Standard Canvas': [
    { size: '12"x18" (30x45 cm)', price: 107.25 },
    { size: '16"x24" (40x60 cm)', price: 139.74 },
    { size: '20"x28" (50x70 cm)', price: 157.86 },
    { size: '24"x36" (60x90 cm)', price: 189.28 },
    { size: '28"x40" (70x100 cm)', price: 228.31 }
  ],
  'Wood Frame': [
    { size: '8"x12" (20x30 cm)', price: 189.77 },
    { size: '12"x18" (30x45 cm)', price: 232.67 },
    { size: '16"x24" (40x60 cm)', price: 300.19 },
    { size: '20"x28" (50x70 cm)', price: 391.41 },
    { size: '24"x36" (60x90 cm)', price: 511.50 }
  ],
  'Dark Wood Frame': [
    { size: '8"x12" (20x30 cm)', price: 189.77 },
    { size: '12"x18" (30x45 cm)', price: 232.67 },
    { size: '16"x24" (40x60 cm)', price: 300.19 },
    { size: '20"x28" (50x70 cm)', price: 391.41 },
    { size: '24"x36" (60x90 cm)', price: 511.50 }
  ],
  'Black Frame': [
    { size: '8"x12" (20x30 cm)', price: 189.77 },
    { size: '12"x18" (30x45 cm)', price: 232.67 },
    { size: '16"x24" (40x60 cm)', price: 300.19 },
    { size: '20"x28" (50x70 cm)', price: 391.41 },
    { size: '24"x36" (60x90 cm)', price: 511.50 }
  ]
};

// TÜM GELATO VARYASYONLARINI BİRLEŞTİR
const ALL_GELATO_VARIATIONS = [
  // Roll (Poster)
  { size: '8"x12" (20x30 cm)', pattern: 'Roll', price: 66.00 },
  { size: '12"x18" (30x45 cm)', pattern: 'Roll', price: 61.48 },
  { size: '16"x24" (40x60 cm)', pattern: 'Roll', price: 74.64 },
  { size: '20"x28" (50x70 cm)', pattern: 'Roll', price: 90.14 },
  { size: '24"x36" (60x90 cm)', pattern: 'Roll', price: 102.42 },
  { size: '28"x40" (70x100 cm)', pattern: 'Roll', price: 117.14 },
  { size: '33"x46" (84x118 cm)', pattern: 'Roll', price: 145.23 },
  // Standard Canvas
  { size: '12"x18" (30x45 cm)', pattern: 'Standard Canvas', price: 107.25 },
  { size: '16"x24" (40x60 cm)', pattern: 'Standard Canvas', price: 139.74 },
  { size: '20"x28" (50x70 cm)', pattern: 'Standard Canvas', price: 157.86 },
  { size: '24"x36" (60x90 cm)', pattern: 'Standard Canvas', price: 189.28 },
  { size: '28"x40" (70x100 cm)', pattern: 'Standard Canvas', price: 228.31 },
  // Wood Frame
  { size: '8"x12" (20x30 cm)', pattern: 'Wood Frame', price: 189.77 },
  { size: '12"x18" (30x45 cm)', pattern: 'Wood Frame', price: 232.67 },
  { size: '16"x24" (40x60 cm)', pattern: 'Wood Frame', price: 300.19 },
  { size: '20"x28" (50x70 cm)', pattern: 'Wood Frame', price: 391.41 },
  { size: '24"x36" (60x90 cm)', pattern: 'Wood Frame', price: 511.50 },
  // Dark Wood Frame
  { size: '8"x12" (20x30 cm)', pattern: 'Dark Wood Frame', price: 189.77 },
  { size: '12"x18" (30x45 cm)', pattern: 'Dark Wood Frame', price: 232.67 },
  { size: '16"x24" (40x60 cm)', pattern: 'Dark Wood Frame', price: 300.19 },
  { size: '20"x28" (50x70 cm)', pattern: 'Dark Wood Frame', price: 391.41 },
  { size: '24"x36" (60x90 cm)', pattern: 'Dark Wood Frame', price: 511.50 },
  // Black Frame
  { size: '8"x12" (20x30 cm)', pattern: 'Black Frame', price: 189.77 },
  { size: '12"x18" (30x45 cm)', pattern: 'Black Frame', price: 232.67 },
  { size: '16"x24" (40x60 cm)', pattern: 'Black Frame', price: 300.19 },
  { size: '20"x28" (50x70 cm)', pattern: 'Black Frame', price: 391.41 },
  { size: '24"x36" (60x90 cm)', pattern: 'Black Frame', price: 511.50 }
];

interface GelatoProductPanelProps {
  onClose?: () => void;
  isDigital?: boolean;
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
  selectedSourceResourcesFolder: string;
  mode: 'queue' | 'direct-etsy';
  imageFiles: File[];
  resourceFiles: File[];
  sourceResourceFiles: File[];
  imagePreviewUrls: string[];
  resourcePreviewUrls: string[];
  sourceResourcePreviewUrls: string[];
}

// Helper function to format time duration
const formatDuration = (totalSeconds: number): string => {
  if (totalSeconds <= 0) return '0 dk';
  
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  
  let result = '';
  
  if (days > 0) {
    result += `${days} gün`;
  }
  
  if (hours > 0) {
    if (result) result += ' ';
    result += `${hours} saat`;
  }
  
  if (minutes > 0) {
    if (result) result += ' ';
    result += `${minutes} dk`;
  }
  
  if (!result) {
    result = '< 1 dk';
  }
  
  return result;
};

export default function GelatoProductPanel({ onClose, isDigital = false }: GelatoProductPanelProps) {
  const { toast } = useToast();
  const imagesFolderRef = useRef<HTMLInputElement>(null);
  const resourcesFolderRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<Settings>({
    imagesPerProduct: 6,
    selectedImagesFolder: '',
    selectedResourcesFolder: '',
    selectedSourceResourcesFolder: '',
    mode: 'direct-etsy',
    imageFiles: [],
    resourceFiles: [],
    sourceResourceFiles: [],
    imagePreviewUrls: [],
    resourcePreviewUrls: [],
    sourceResourcePreviewUrls: []
  });
  
  const [lastImagesFolderName, setLastImagesFolderName] = useState<string>('');
  const [lastResourcesFolderName, setLastResourcesFolderName] = useState<string>('');
  const [lastSourceResourcesFolderName, setLastSourceResourcesFolderName] = useState<string>('');

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
  
  const [formCycleStartTime, setFormCycleStartTime] = useState<number | null>(null);
  const [globalStartTime, setGlobalStartTime] = useState<number | null>(null);
  const [lastProductTitle, setLastProductTitle] = useState<string>('');
  const [cycleTimes, setCycleTimes] = useState<number[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // LocalStorage keys - Gelato için farklı keyler
  const STORAGE_KEY = 'gelato-product-state';
  const SETTINGS_KEY = 'gelato-product-settings';

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
        
        if (parsedSettings.lastImagesFolderName) {
          setLastImagesFolderName(parsedSettings.lastImagesFolderName);
        }
        if (parsedSettings.lastResourcesFolderName) {
          setLastResourcesFolderName(parsedSettings.lastResourcesFolderName);
        }
        if (parsedSettings.lastSourceResourcesFolderName) {
          setLastSourceResourcesFolderName(parsedSettings.lastSourceResourcesFolderName);
        }
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
    if (settings.imagesPerProduct !== 6 || settings.selectedImagesFolder || settings.selectedResourcesFolder || settings.selectedSourceResourcesFolder) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        imagesPerProduct: settings.imagesPerProduct,
        selectedImagesFolder: settings.selectedImagesFolder,
        selectedResourcesFolder: settings.selectedResourcesFolder,
        selectedSourceResourcesFolder: settings.selectedSourceResourcesFolder,
        lastImagesFolderName,
        lastResourcesFolderName,
        lastSourceResourcesFolderName
      }));
    }
  }, [settings, lastImagesFolderName, lastResourcesFolderName, lastSourceResourcesFolderName]);
  
  // Component unmount olduğunda preview URL'leri temizle
  useEffect(() => {
    return () => {
      settings.imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
      settings.resourcePreviewUrls.forEach(url => URL.revokeObjectURL(url));
      settings.sourceResourcePreviewUrls.forEach(url => URL.revokeObjectURL(url));
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
      console.log('⏱️ Gelato Form açıldı - Cycle timer başlatıldı:', new Date(startTime).toLocaleTimeString());
    }
  }, [showProductForm]);

  const handleImagesFolderSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const imageFiles = Array.from(files)
        .filter(file => file.type.startsWith('image/'))
        .sort((a, b) => a.name.localeCompare(b.name, 'tr-TR', { numeric: true }));
      
      let folderName = "Görseller Klasörü";
      if (imageFiles.length > 0 && imageFiles[0].webkitRelativePath) {
        folderName = imageFiles[0].webkitRelativePath.split('/')[0];
        setLastImagesFolderName(folderName);
      }
      
      console.log('📂 Gelato klasör dosyaları alfabetik sıralandı:', {
        klasörAdı: folderName,
        toplamDosya: files.length,
        resimDosya: imageFiles.length,
        ilk5Dosya: imageFiles.slice(0, 5).map(f => f.name),
        son5Dosya: imageFiles.slice(-5).map(f => f.name)
      });
      
      const previewFiles = imageFiles.slice(0, 4);
      const previewUrls = previewFiles.map(file => URL.createObjectURL(file));
      
      setSettings(prev => {
        prev.imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
        
        return {
          ...prev,
          selectedImagesFolder: imageFiles.length > 0 ? 'selected' : '',
          imageFiles,
          imagePreviewUrls: previewUrls
        };
      });

      const totalProducts = Math.floor(imageFiles.length / settings.imagesPerProduct);
      setProcessing(prev => ({
        ...prev,
        totalProducts
      }));

      toast({
        title: "Gelato Görseller Klasörü",
        description: `${folderName}: ${imageFiles.length} resim yüklendi. ${settings.imagesPerProduct} resim + kaynaklar = ${totalProducts} ürün oluşturulacak.`
      });
    }
  }, [settings.imagesPerProduct, toast]);

  const handleResourcesFolderSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      let resourceFiles: File[] = [];
      
      let folderName = isDigital ? "Digital Dosyalar Klasörü" : "Kaynaklar Klasörü";
      if (files.length > 0 && files[0].webkitRelativePath) {
        folderName = files[0].webkitRelativePath.split('/')[0];
        setLastResourcesFolderName(folderName);
      }
      
      if (isDigital) {
        const allFiles = Array.from(files);
        
        const filteredFiles = allFiles.filter(file => {
          if (file.name === '.DS_Store' || file.name.startsWith('._')) {
            console.log(`🚫 Sistem dosyası filtrelendi: ${file.name}`);
            return false;
          }
          
          const lowerName = file.name.toLowerCase();
          if (!lowerName.endsWith('.jpg') && !lowerName.endsWith('.jpeg') && !lowerName.endsWith('.png')) {
            console.log(`🚫 Desteklenmeyen dosya formatı filtrelendi: ${file.name}`);
            return false;
          }
          
          return true;
        });
        
        resourceFiles = filteredFiles.sort((a, b) => a.name.localeCompare(b.name, 'tr-TR', { numeric: true }));
        
        console.log('📁 Gelato digital dosyalar klasörü seçildi:', {
          klasörAdı: folderName,
          total: resourceFiles.length,
          files: resourceFiles.slice(0, 10).map(f => ({ name: f.name, size: (f.size / 1024 / 1024).toFixed(2) + 'MB' }))
        });
      } else {
        resourceFiles = Array.from(files)
          .filter(file => file.type.startsWith('image/') || file.type.startsWith('video/'))
          .sort((a, b) => a.name.localeCompare(b.name, 'tr-TR', { numeric: true }));
        
        console.log('📁 Gelato kaynaklar klasörü seçildi:', {
          klasörAdı: folderName,
          total: files.length,
          images: resourceFiles.filter(f => f.type.startsWith('image/')).length,
          videos: resourceFiles.filter(f => f.type.startsWith('video/')).length
        });
      }
      
      const previewFiles = resourceFiles.filter(file =>
        file.type.startsWith('image/') ||
        (isDigital && (file.name.toLowerCase().endsWith('.jpg') ||
                      file.name.toLowerCase().endsWith('.jpeg') ||
                      file.name.toLowerCase().endsWith('.png')))
      ).slice(0, 4);
      const previewUrls = previewFiles.map(file => URL.createObjectURL(file));
      
      setSettings(prev => {
        prev.resourcePreviewUrls.forEach(url => URL.revokeObjectURL(url));
        
        return {
          ...prev,
          selectedResourcesFolder: resourceFiles.length > 0 ? 'selected' : '',
          resourceFiles,
          resourcePreviewUrls: previewUrls
        };
      });

      toast({
        title: isDigital ? "Gelato Digital Dosyalar" : "Gelato Kaynaklar Klasörü",
        description: `${folderName}: ${resourceFiles.length} ${isDigital ? 'digital dosya' : 'kaynak dosya'} yüklendi.`
      });
    }
  }, [toast, isDigital]);

  const startProcessing = useCallback(async () => {
    if (settings.imageFiles.length === 0) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Lütfen önce Görseller klasörünü seçin."
      });
      return;
    }

    setCurrentProductIndex(0);
    setCycleTimes([]);
    setLastProductTitle('');
    
    setProcessing(prev => ({
      ...prev,
      status: 'running',
      startTime: Date.now(),
      currentProduct: 1,
      totalProducts: Math.floor(settings.imageFiles.length / settings.imagesPerProduct),
      progress: 0,
      averageTime: 0,
      processedProducts: [],
      errors: []
    }));

    setIsSettingsOpen(false);
    setGlobalStartTime(Date.now());
    setShowProductForm(true);
    
    toast({
      title: "Gelato İşleme Başladı",
      description: `Gelato ürün ekleme formu açılıyor. ${Math.floor(settings.imageFiles.length / settings.imagesPerProduct)} ürün işlenecek.`
    });
  }, [settings.imageFiles.length, settings.imagesPerProduct, toast]);

  const resetProcessing = useCallback(() => {
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
    
    settings.imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
    settings.resourcePreviewUrls.forEach(url => URL.revokeObjectURL(url));
    settings.sourceResourcePreviewUrls.forEach(url => URL.revokeObjectURL(url));
    setSettings(prev => ({
      ...prev,
      imagePreviewUrls: [],
      resourcePreviewUrls: [],
      sourceResourcePreviewUrls: []
    }));

    setShowProductForm(false);
    setCurrentProductIndex(0);
    setCycleTimes([]);
    setFormCycleStartTime(null);
    setGlobalStartTime(null);

    toast({
      title: "Gelato İşleme Sıfırlandı",
      description: "Baştan başlayabilirsiniz."
    });
  }, [settings.imageFiles.length, settings.imagesPerProduct, toast, STORAGE_KEY]);

  const getCurrentProductFiles = useCallback(() => {
    const currentProductImages = settings.imageFiles.slice(0, settings.imagesPerProduct);
    
    const digitalFiles = isDigital
      ? settings.resourceFiles.slice(0, 5)
      : [];
    
    const sourceFiles = isDigital
      ? settings.sourceResourceFiles
      : settings.resourceFiles;
    
    const resourceImages = !isDigital
      ? sourceFiles.filter(file => file.type.startsWith('image/'))
      : settings.sourceResourceFiles.filter(file => file.type.startsWith('image/'));
    
    const resourceVideos = !isDigital
      ? sourceFiles.filter(file => file.type.startsWith('video/'))
      : settings.sourceResourceFiles.filter(file => file.type.startsWith('video/'));
    
    const allFiles = [...currentProductImages, ...resourceImages];
    
    console.log(`🔍 GELATO GÜNCEL DOSYA LİSTESİ:`, {
      toplamDosyaSayısı: settings.imageFiles.length,
      alınacakResimSayısı: currentProductImages.length,
      alınacakResimAdları: currentProductImages.map(f => f.name),
      kaynakResimleri: resourceImages.map(f => f.name),
      kaynakVideoları: resourceVideos.map(f => f.name),
      digitalDosyalar: digitalFiles.map(f => f.name),
      toplamGönderilecekResim: allFiles.length,
      toplamGönderilecekVideo: resourceVideos.length,
      toplamDigitalDosya: digitalFiles.length,
      alfabetikSıralama: currentProductImages.map((f, i) => `${i+1}: ${f.name}`).slice(0, 3)
    });
    
    return { files: allFiles, videos: resourceVideos, digitalFiles };
  }, [settings.imageFiles, settings.resourceFiles, settings.sourceResourceFiles, settings.imagesPerProduct, isDigital]);

  const memoizedProductFiles = useMemo(() => {
    return getCurrentProductFiles();
  }, [settings.imageFiles.length, settings.resourceFiles.length, settings.sourceResourceFiles.length, settings.imagesPerProduct]);

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

  const handleFormSubmitSuccess = useCallback(async (productTitle?: string) => {
    console.log(`✅ Gelato ürün ${currentProductIndex + 1} başarıyla eklendi`);
    
    setProcessing(prevProc => ({
      ...prevProc,
      completedProducts: prevProc.completedProducts + 1
    }));

    // Süre hesaplama - daha güvenilir fallback mekanizması
    const currentTime = Date.now();
    let cycleElapsed = 0;
    
    if (formCycleStartTime) {
      // Normal durum: formCycleStartTime varsa kullan
      cycleElapsed = Math.round((currentTime - formCycleStartTime) / 1000);
      console.log('⏱️ Gelato ürün döngü süresi:', cycleElapsed, 'saniye');
    } else if (globalStartTime) {
      // Fallback 1: globalStartTime varsa ve son ürün sayısı biliniyorsa ortalama hesapla
      const completedProducts = processing.completedProducts || 0;
      if (completedProducts > 0) {
        const totalElapsed = Math.round((currentTime - globalStartTime) / 1000);
        cycleElapsed = Math.round(totalElapsed / completedProducts);
        console.log('⚠️ formCycleStartTime null - globalStartTime ve tamamlanan ürün sayısı kullanılarak hesaplandı:', cycleElapsed, 'saniye');
      } else {
        // Fallback 2: Tamamlanan ürün yoksa, globalStartTime'dan beri geçen süreyi kullan
        cycleElapsed = Math.round((currentTime - globalStartTime) / 1000);
        console.log('⚠️ formCycleStartTime null - sadece globalStartTime kullanılarak hesaplandı:', cycleElapsed, 'saniye');
      }
    } else {
      // Fallback 3: Hiçbir zaman verisi yoksa, varsayılan değer kullan
      cycleElapsed = 60; // 1 dakika varsayılan
      console.log('⚠️ formCycleStartTime ve globalStartTime null - varsayılan süre kullanıldı:', cycleElapsed, 'saniye');
    }
    
    setCycleTimes(prev => {
      const newTimes = [...prev, cycleElapsed];
      const totalTime = newTimes.reduce((a, b) => a + b, 0);
      const avgTime = totalTime / newTimes.length;
      
      console.log('📊 Gelato cycle times updated:', {
        newTime: cycleElapsed,
        allTimes: newTimes,
        totalTime,
        averageTime: Math.round(avgTime),
        completedProducts: newTimes.length
      });
      
      setProcessing(prevProc => ({
        ...prevProc,
        averageTime: totalTime
      }));
      
      return newTimes;
    });
    
    const finalProductTitle = productTitle || generateProductTitle(getCurrentProductFiles().files.find(f => f.type.startsWith('image/'))?.name || '');
    setLastProductTitle(finalProductTitle);
    
    const currentFiles = getCurrentProductFiles();
    const productImages = currentFiles.files.filter(f => f.type.startsWith('image/') && !f.name.includes('logo') && !f.name.includes('watermark'));
    const firstProductImage = productImages[0];
    
    if (firstProductImage) {
      const imageUrl = URL.createObjectURL(firstProductImage);
      
      setProcessing(prev => ({
        ...prev,
        processedProducts: [...prev.processedProducts, {
          title: finalProductTitle,
          image: imageUrl,
          timestamp: new Date().toLocaleTimeString('tr-TR')
        }],
        currentProduct: currentProductIndex + 1,
        progress: ((currentProductIndex + 1) / Math.floor(settings.imageFiles.length / settings.imagesPerProduct)) * 100
      }));
      
      console.log(`📝 Eklenen Gelato ürün kaydedildi: "${finalProductTitle}" - Resim: ${firstProductImage.name}`);
    }
    
    console.log('🗑️ Gelato form başarıyla gönderildi, dosya silme işlemi başlıyor...');
    
    const imagesToDelete = settings.imageFiles.slice(0, settings.imagesPerProduct);
    const remainingImages = settings.imageFiles.slice(settings.imagesPerProduct);
    const newRemainingImages = remainingImages.length;
    const newTotalProducts = Math.floor(newRemainingImages / settings.imagesPerProduct);
    
    let digitalFilesToDelete: File[] = [];
    let remainingDigitalFiles: File[] = [];
    
    if (isDigital) {
      digitalFilesToDelete = settings.resourceFiles.slice(0, 5);
      remainingDigitalFiles = settings.resourceFiles.slice(5);
      console.log('🗑️ Gelato digital dosya silme işlemi:', {
        silinecekDosyalar: digitalFilesToDelete.map(f => f.name),
        kalanDosyalar: remainingDigitalFiles.map(f => f.name)
      });
    }
    
    try {
      for (const file of imagesToDelete) {
        const filePath = file.webkitRelativePath || file.name;
        console.log(`🗑️ Çöp kutusuna taşınıyor (Gelato resim): ${file.name}`);
      }
      
      if (isDigital && digitalFilesToDelete.length > 0) {
        for (const file of digitalFilesToDelete) {
          console.log(`🗑️ Çöp kutusuna taşınıyor (Gelato digital): ${file.name}`);
        }
      }
      
      setSettings(prev => ({
        ...prev,
        imageFiles: remainingImages,
        resourceFiles: isDigital ? remainingDigitalFiles : prev.resourceFiles
      }));
      
      console.log(`🗑️ ${imagesToDelete.length} Gelato resim listeden çıkarıldı, kalan: ${remainingImages.length}`);
      if (isDigital) {
        console.log(`🗑️ ${digitalFilesToDelete.length} Gelato digital dosya listeden çıkarıldı, kalan: ${remainingDigitalFiles.length}`);
      }
      
      toast({
        title: "Gelato Dosyalar Temizlendi",
        description: isDigital
          ? `${imagesToDelete.length} resim ve ${digitalFilesToDelete.length} digital dosya listeden çıkarıldı`
          : `${imagesToDelete.length} işlenen dosya listeden çıkarıldı`
      });
      
    } catch (error) {
      console.error('❌ Gelato dosya silme hatası:', error);
    }
    
    setShowProductForm(false);
    
    if (newRemainingImages >= settings.imagesPerProduct) {
      const waitTime = 500;
      console.log(`⏰ Gelato form kapandı, ${waitTime}ms bekleniyor...`);
      
      const currentFormCycleStartTime = formCycleStartTime;
      const currentLastProductTitle = lastProductTitle;
      
      setTimeout(() => {
        console.log(`🔄 Sonraki Gelato ürün için form açılıyor... (index sıfırlanıyor: 0)`);
        
        if (currentFormCycleStartTime && currentLastProductTitle) {
          const cycleEndTime = Date.now();
          const cycleElapsed = Math.round((cycleEndTime - currentFormCycleStartTime) / 1000);
          const firstThreeWords = currentLastProductTitle.split(' ').slice(0, 3).join(' ');
          
          console.log(`🔄 ${firstThreeWords} - Gelato form döngüsü ${cycleElapsed} saniyede tamamlandı (kapanış→açılış)`);
        }
        
        // Yeni form açıldığında formCycleStartTime'ı ayarla
        const newStartTime = Date.now();
        setFormCycleStartTime(newStartTime);
        console.log('⏱️ Yeni form döngüsü başlatıldı:', new Date(newStartTime).toLocaleTimeString());
        
        setCurrentProductIndex(0);
        setShowProductForm(true);
        
        const remainingProducts = Math.ceil(newRemainingImages / 6);
        
        let toastDescription = `Kalan ${newRemainingImages} dosyadan ${remainingProducts} Gelato ürün kaldı`;
        if (cycleTimes.length > 0) {
          const avgTime = cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length;
          const modeText = settings.mode === 'direct-etsy' ? 'Etsy\'ye' : 'kuyruğa';
          toastDescription += ` | Ortalama: ${formatDuration(Math.round(avgTime))}`;
        }
        
        toast({
          title: "Sonraki Gelato Ürün",
          description: toastDescription,
          duration: 3000
        });
      }, waitTime);
    } else {
      console.log('🏁 Tüm Gelato ürünler tamamlandı - Global timer durduruluyor (ama süre korunuyor)');
      setProcessing(prev => ({
        ...prev,
        status: 'completed',
        progress: 100
      }));
      
      const totalTimeElapsed = globalStartTime ? Math.round((Date.now() - globalStartTime) / 1000) : 0;
      
      toast({
        title: "Gelato Tamamlandı!",
        description: `Tüm Gelato dosyalar işlendi! Toplam süre: ${formatDuration(totalTimeElapsed)}`
      });
    }
  }, [currentProductIndex, settings.imageFiles, settings.imagesPerProduct, processing.totalProducts, toast, getCurrentProductFiles, generateProductTitle]);

  const handleFormClose = useCallback(() => {
    setShowProductForm(false);
    setProcessing(prev => ({
      ...prev,
      status: 'idle'
    }));
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      {/* İki bölümlü layout */}
      <div className={`grid transition-all duration-500 ${!isSettingsOpen ? 'grid-cols-1 lg:grid-cols-2 gap-6' : 'grid-cols-1'}`}>
        {/* Sol bölüm - Settings/Form Panel */}
        <div className="space-y-6">
          {/* Settings Panel */}
          {isSettingsOpen && (
            <Card className="border-2 border-dashed border-gray-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" />
              Gelato Ürün Ekleme Ayarları
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* MOD BİLGİSİ */}
            <div className="border rounded-lg p-4 bg-blue-50">
              <Label className="text-sm font-semibold text-blue-800 mb-3 block">
                🎨 Gelato İşlem Modu
              </Label>
              <div className="flex items-center gap-3 p-3 bg-white rounded border border-blue-200">
                <Zap className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-semibold text-blue-800">Gelato Print on Demand</div>
                  <div className="text-xs text-blue-600">Ürünler Gelato varyasyonları ile Etsy'ye gönderilir</div>
                </div>
                <Badge variant="secondary" className="ml-auto bg-blue-100 text-blue-700">
                  Aktif
                </Badge>
              </div>
              
              {/* Gelato varyasyon fiyatları önizleme */}
              <div className="mt-3 p-3 bg-blue-100 rounded max-h-64 overflow-y-auto">
                <p className="text-xs font-semibold text-blue-800 mb-2">Gelato Varyasyon ve Fiyatları (27 Boyut):</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold text-blue-800 mb-1">📋 Roll (Poster)</p>
                      <div className="space-y-0.5 text-blue-700 pl-2">
                        <div>8"x12" → $66.00</div>
                        <div>12"x18" → $61.48</div>
                        <div>16"x24" → $74.64</div>
                        <div>20"x28" → $90.14</div>
                        <div>24"x36" → $102.42</div>
                        <div>28"x40" → $117.14</div>
                        <div>33"x46" → $145.23</div>
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-blue-800 mb-1">🖼️ Standard Canvas</p>
                      <div className="space-y-0.5 text-blue-700 pl-2">
                        <div>12"x18" → $107.25</div>
                        <div>16"x24" → $139.74</div>
                        <div>20"x28" → $157.86</div>
                        <div>24"x36" → $189.28</div>
                        <div>28"x40" → $228.31</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold text-blue-800 mb-1">🪵 Wood Frame</p>
                      <div className="space-y-0.5 text-blue-700 pl-2">
                        <div>8"x12" → $189.77</div>
                        <div>12"x18" → $232.67</div>
                        <div>16"x24" → $300.19</div>
                        <div>20"x28" → $391.41</div>
                        <div>24"x36" → $511.50</div>
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-blue-800 mb-1">🟫 Dark Wood Frame</p>
                      <div className="space-y-0.5 text-blue-700 pl-2">
                        <div>8"x12" → $189.77</div>
                        <div>12"x18" → $232.67</div>
                        <div>16"x24" → $300.19</div>
                        <div>20"x28" → $391.41</div>
                        <div>24"x36" → $511.50</div>
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-blue-800 mb-1">⬛ Black Frame</p>
                      <div className="space-y-0.5 text-blue-700 pl-2">
                        <div>8"x12" → $189.77</div>
                        <div>12"x18" → $232.67</div>
                        <div>16"x24" → $300.19</div>
                        <div>20"x28" → $391.41</div>
                        <div>24"x36" → $511.50</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-3 text-xs text-blue-700 bg-blue-100 p-2 rounded">
                ⚡ Ürünler otomatik olarak Gelato varyasyonları ile Etsy'ye draft (taslak) olarak eklenir.
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
                    // @ts-ignore - webkitdirectory özelliği TypeScript tarafından tanınmıyor
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

              {/* Resources Folder / Digital Files */}
              <div className="space-y-2">
                <Label htmlFor="resources-folder">{isDigital ? "Digital Dosyalar Klasörü" : "Kaynaklar Klasörü"}</Label>
                {isDigital && (
                  <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border">
                    📁 Seçilen klasördeki tüm dosyalar 5'er 5'er işlenecek
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => resourcesFolderRef.current?.click()}
                    className="flex-1"
                  >
                    <FolderOpen className="w-4 h-4 mr-2" />
                    {isDigital ? "Digital Dosyalar Klasörü Seç" : "Klasör Seç"}
                  </Button>
                  <input
                    ref={resourcesFolderRef}
                    type="file"
                    multiple={true}
                    accept="*/*"
                    // @ts-ignore - webkitdirectory özelliği TypeScript tarafından tanınmıyor
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
                Gelato İşlemeyi Başlat
              </Button>
            </div>
            </CardContent>
          </Card>
          )}

          {/* Sol panel'de form açık kalacak */}
          {!isSettingsOpen && (
            <div className="space-y-4">
              {/* İşlem durumu - küçük kart */}
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Gelato İşlem Durumu</span>
                    </div>
                    <div className="text-xs text-blue-600">
                      {showProductForm ? 'Form Açık' : 'Bekliyor'}
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between items-center text-xs text-blue-700">
                      <span>Ürün {processing.currentProduct} / {processing.totalProducts}</span>
                      <span>%{Math.round(processing.progress)}</span>
                    </div>
                    <div className="w-full bg-blue-100 rounded-full h-1.5 mt-1">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${processing.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <Button onClick={resetProcessing} variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-50">
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Durdur
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* EMBEDDED FORM - Normal form gömülü halde */}
              <div className="h-[700px] border border-gray-200 rounded-lg bg-white">
                {/* Form header */}
                <div className="bg-indigo-50 border-b border-indigo-200 px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-medium text-indigo-800">Yeni Gelato Ürün Ekle</span>
                  </div>
                  <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">
                    {showProductForm ? 'Gelato Mod' : 'Bekleme'}
                  </Badge>
                </div>
                
                {/* Form content */}
                <div className="h-[calc(100%-48px)]">
                  {showProductForm ? (
                    <EmbeddedProductForm
                      key={`gelato-embedded-form-${currentProductIndex}`}
                      isVisible={true}
                      autoFiles={memoizedProductFiles.files}
                      autoVideoFiles={memoizedProductFiles.videos}
                      autoDigitalFiles={memoizedProductFiles.digitalFiles}
                      autoMode={settings.mode}
                      forceRefreshCategories={true} // Kategorileri her zaman yeniden yükle
                      forceAnimalCategoryDetection={true} // Hayvan temalı ürünleri Animal Art kategorisine zorla
                      onSubmitSuccess={handleFormSubmitSuccess}
                      onClose={handleFormClose}
                      isDigital={isDigital}
                      // TÜM Gelato varyasyonlarını gönder
                      customVariations={ALL_GELATO_VARIATIONS}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Package className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-500">Gelato form bekleme modunda</p>
                        <p className="text-xs text-gray-400 mt-1">Gelato işlem başlatıldığında form burada açılacak</p>
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
            {/* En Son Eklenen Gelato Ürünler */}
            <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-indigo-800">
                  <Package className="w-5 h-5" />
                  En Son Eklenen Gelato Ürünler
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {processing.processedProducts.slice(-5).reverse().length === 0 ? (
                    <div className="text-center py-8 text-indigo-400">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Henüz Gelato ürün eklenmedi</p>
                    </div>
                  ) : (
                    processing.processedProducts.slice(-5).reverse().map((product, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-white/70 rounded-lg border border-indigo-100 hover:bg-white/90 transition-colors">
                        <img
                          src={product.image}
                          alt={product.title}
                          className="w-10 h-10 object-cover rounded border-2 border-indigo-200"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {product.title.split(' ').slice(0, 4).join(' ')}...
                          </p>
                          <p className="text-xs text-indigo-600">
                            {product.timestamp}
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 text-xs">
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
                  Gelato İşlem İstatistikleri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Toplam Ürün Ekleme Süresi */}
                <div className="p-4 bg-white/70 rounded-lg border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-800">Toplam Gelato Ürün Ekleme Süresi</span>
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {globalStartTime ? (() => {
                      const totalElapsed = Math.floor((currentTime - globalStartTime) / 1000);
                      return `${Math.floor(totalElapsed / 3600).toString().padStart(2, '0')}:${Math.floor((totalElapsed % 3600) / 60).toString().padStart(2, '0')}:${(totalElapsed % 60).toString().padStart(2, '0')}`;
                    })() : '--:--:--'}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    Toplam Gelato Liste Süresi (saat:dakika:saniye)
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
                      1 Gelato Ürün Ortalama Süresi
                    </div>
                  </div>
                </div>

                {/* Kalan Ürün Sayısı */}
                <div className="p-4 bg-white/70 rounded-lg border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-800">Kalan Gelato Ürün Sayısı</span>
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
                <div className="p-4 bg-gradient-to-r from-indigo-100 to-blue-100 rounded-lg border border-indigo-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-indigo-800">Gelato Bitiş Zamanı</span>
                    <CheckCircle className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-lg font-bold text-indigo-900">
                    {cycleTimes.length > 0 && settings.imageFiles.length > 0 ? (() => {
                      const avgTimePerProduct = cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length;
                      const remainingProducts = Math.max(0, Math.floor(settings.imageFiles.length / settings.imagesPerProduct));
                      const totalRemainingTime = remainingProducts * avgTimePerProduct;
                      return new Date(currentTime + (totalRemainingTime * 1000)).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                    })() : '--:--'}
                  </div>
                  <div className="text-xs text-indigo-600 mt-1">
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
      
      {/* Processing Profiles bilgisi */}
      <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
        <h3 className="text-sm font-medium text-indigo-800 mb-2">Etsy Processing Profiles Bilgisi</h3>
        <p className="text-xs text-indigo-600">
          Etsy'nin yeni güncellemesi ile tüm ürünler için "Processing Profiles" kullanılmaktadır.
          Gelato ürünleri için "Made to Order" durumu ve 1-2 günlük işleme süresi ayarlanmıştır.
        </p>
      </div>
    </div>
  );
}