"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { useDrag, useDrop } from "react-dnd"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2, Plus, X, Image as ImageIcon, Upload, GripVertical, RefreshCw, FileText, Tag as TagIcon, Image, Video, ChevronDown, Wand2 } from "lucide-react"
import { Product, CreateProductForm, TaxonomyNode, ShippingProfile, EtsyProcessingProfile } from "@/types/product"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { useRouter, useSearchParams } from "next/navigation"
import { ProductMediaSection } from './ProductMediaSection';
import { PromptEditor } from './PromptEditor';
// Supabase kaldırıldı - sadece Firebase kullanıyoruz
import { categoryPrompt, tagPrompt, titlePrompt, generateTitleWithFocus, selectCategory } from "@/lib/openai-yonetim";
import { getPromptById } from "@/lib/prompts";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { predefinedVariations } from '@/lib/etsy-variation-presets';

// Debounce fonksiyonu
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Sabit kategori ID'leri
const WALL_DECOR_TAXONOMY_ID = 1027;
const DIGITAL_PRINTS_TAXONOMY_ID = 2078;

// Default materials - API'de sabit değerler gönderildiği için burada kullanılmayacak
const DEFAULT_MATERIALS = ["Cotton Canvas", "Wood Frame", "Hanger"];

// Kişiselleştirme sabitleri
const PERSONALIZATION_INSTRUCTIONS = 'Phone Number for Delivery';

// Add interface for API response
interface CreateListingResponse {
  success: boolean;
  listing_id?: number;
  listing?: {
    listing_id: number;
    [key: string]: any;
  };
  message: string;
}

interface ProductFormModalProps {
  isOpen: boolean
  onClose: () => void
  product?: Product
  initialData?: any
  isEditMode?: boolean
  queueItemId?: string
  userId?: string
  isAutoMode?: boolean
  autoMode?: 'queue' | 'direct-etsy'
  isEmbedded?: boolean
  autoFiles?: File[]
  autoTitle?: string
  onSubmitSuccess?: () => void
}

// Drag and drop için item tipleri
const ItemTypes = {
  IMAGE: 'IMAGE',
};

// Sürüklenebilir resim bileşeni
const DraggableImage = ({ 
  image, 
  index, 
  moveImage,
  onRemove 
}: { 
  image: { file: File; preview: string; uploading: boolean; error?: string; }; 
  index: number; 
  moveImage: (dragIndex: number, hoverIndex: number) => void;
  onRemove: (index: number) => void; 
}) => {
  const ref = useRef<HTMLDivElement>(null);
  
  const [{ isDragging }, drag] = useDrag({
    type: 'IMAGE',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  
  const [, drop] = useDrop({
    accept: 'IMAGE',
    hover(item: { index: number }, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;
      
      if (dragIndex === hoverIndex) {
        return;
      }
      
      moveImage(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });
  
  // drag ve drop ref'lerini birleştir
  drag(drop(ref));
  
  // Prepare the image source - use proxy for Etsy static URLs
  const imageSource = image.preview ? (
    image.preview.includes('etsystatic.com') 
      ? `/api/etsy/image-proxy?url=${encodeURIComponent(image.preview)}`
      : image.preview
  ) : null;
  
  return (
    <div
      ref={ref}
      className={`relative group rounded-md overflow-hidden border ${
        index === 0 ? "ring-1 ring-primary border-primary" : "border-gray-100"
      } shadow-sm transition-all ${isDragging ? "opacity-50" : "opacity-100"}`}
      style={{ aspectRatio: "1/1" }}
    >
      {imageSource ? (
        <img
          src={imageSource}
          alt={`Ürün resmi ${index + 1}`}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-700 text-xs">
          Görsel yüklenemedi
        </div>
      )}
      
      {image.uploading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-white animate-spin" />
        </div>
      )}
      
      {image.error && (
        <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-red-500 text-white text-xs text-center">
          Hata
        </div>
      )}
      
      {!image.uploading && (
        <>
          {index === 0 && (
            <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-primary rounded text-white text-[10px] font-medium">
              Ana
            </div>
          )}
          
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="absolute top-2 right-2 p-1 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
          >
            <X className="w-3 h-3 text-white" />
          </button>
          
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          <div className="absolute bottom-1 right-1 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-4 h-4 text-white drop-shadow-md" />
          </div>
        </>
      )}
    </div>
  );
};

// MediaFile interface'ini güncelliyorum
export interface MediaFile {
  file: File;
  preview: string;
  uploading: boolean;
  error?: string;
  id?: string; // Unique identifier
}

export function ProductFormModal({
  isOpen,
  onClose,
  product,
  initialData,
  isEditMode = false,
  queueItemId,
  userId,
  isAutoMode = false,
  isEmbedded = false,
  autoFiles,
  autoTitle,
  autoMode = 'queue',
  onSubmitSuccess,
}: ProductFormModalProps) {
  // All useState declarations at the top
  const { toast } = useToast()
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false)
  const [title, setTitle] = useState(initialData?.title || product?.title || "")
  const [titleInput, setTitleInput] = useState("")
  const [description, setDescription] = useState(initialData?.description || product?.description || "")
  const [price, setPrice] = useState(initialData?.price || product?.price?.amount || 0)
  const [quantity, setQuantity] = useState(4)
  const [shippingProfileId, setShippingProfileId] = useState(
    product?.shipping_profile_id?.toString() || ""
  )

  // Additional fields to match Etsy
  const [tags, setTags] = useState<string[]>(initialData?.tags || product?.tags || [])
  const [newTag, setNewTag] = useState("")
  const [isPersonalizable, setIsPersonalizable] = useState(true)
  const [personalizationRequired, setPersonalizationRequired] = useState(false)
  const [personalizationInstructions, setPersonalizationInstructions] = useState(
    'Phone Number for Delivery'
  )
  const [taxonomyId, setTaxonomyId] = useState(initialData?.taxonomy_id || product?.taxonomy_id || WALL_DECOR_TAXONOMY_ID);
  
  const [hasVariations, setHasVariations] = useState<boolean>(initialData?.has_variations ?? true);
  const [variations, setVariations] = useState(initialData?.variations || product?.variations || predefinedVariations.map(v => ({ ...v, is_active: true })))
  const [shopSections, setShopSections] = useState<{ shop_section_id: number; title: string }[]>([]);
  const [selectedShopSection, setSelectedShopSection] = useState<string>('');
  const [aiCategorySelected, setAiCategorySelected] = useState(false); // AI kategori seçimi bayrağı
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null); // AI'den gelen kategori ID'si
  
  // Shipping profiles and shop sections data fetching
  const [shippingProfiles, setShippingProfiles] = useState<ShippingProfile[]>([]);
  const [loadingShippingProfiles, setLoadingShippingProfiles] = useState(false);
  const [loadingShopSections, setLoadingShopSections] = useState(false);
  
  // Ürün görselleri için state
  const [productImages, setProductImages] = useState<MediaFile[]>([])
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [videoFile, setVideoFile] = useState<MediaFile | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // --- BAŞLIK OTO-ÜRETİMİ STATE ---
  const [autoTitleLoading, setAutoTitleLoading] = useState(false);
  const [autoTitleUsed, setAutoTitleUsed] = useState(false);

  // Açıklama üretimi için state
  const [autoDescriptionLoading, setAutoDescriptionLoading] = useState(false);

  // Etiket üretimi için state
  const [autoTagsLoading, setAutoTagsLoading] = useState(false);

  // Otomatik kategori seçimi için state
  const [shopSectionAutoSelected, setShopSectionAutoSelected] = useState(true)

  // QWE tuş kombinasyonu için state
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [userEditedTitle, setUserEditedTitle] = useState(false);
  const [focusTitleLoading, setFocusTitleLoading] = useState(false);
  const [focusStatus, setFocusStatus] = useState<string | null>(null);

  // Progress tracking
  const [currentStep, setCurrentStep] = useState(1);
  const [formProgress, setFormProgress] = useState(0);

  // Klasör batch processing state'leri
  const [selectedFolderFiles, setSelectedFolderFiles] = useState<File[]>([]);
  const [processedFileIndex, setProcessedFileIndex] = useState(0);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const BATCH_SIZE = 6;

  // LocalStorage anahtarları
  const FOLDER_FILES_KEY = 'dolphinmanager_folder_files';
  const PROCESSED_INDEX_KEY = 'dolphinmanager_processed_index';

  // Klasör dosyalarını localStorage'dan yükle
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFiles = localStorage.getItem(FOLDER_FILES_KEY);
      const savedIndex = localStorage.getItem(PROCESSED_INDEX_KEY);
      
      if (savedFiles && savedIndex) {
        try {
          // Note: File objects can't be directly stored in localStorage
          // We'll handle this differently by tracking file names and paths
          setProcessedFileIndex(parseInt(savedIndex, 10));
        } catch (error) {
          console.error('localStorage verilerini yüklerken hata:', error);
        }
      }
    }
  }, []);

  // Batch processing: Klasörden 6'şar resim seç
  const processBatchFromFolder = useCallback((allFiles: File[]) => {
    // Sadece resim dosyalarını al ve alfabetik sırala
    const imageFiles = allFiles
      .filter(file => file.type.startsWith('image/'))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    console.log('📁 Klasör içindeki tüm resimler:', imageFiles.map(f => f.name));
    
    // Mevcut batch'i al (6'şar)
    const currentBatch = imageFiles.slice(processedFileIndex, processedFileIndex + BATCH_SIZE);
    
    console.log('📋 Şu anki batch:', {
      startIndex: processedFileIndex,
      endIndex: processedFileIndex + BATCH_SIZE,
      fileNames: currentBatch.map(f => f.name)
    });
    
    if (currentBatch.length === 0) {
      toast({
        title: "Tüm Resimler İşlendi",
        description: "Klasördeki tüm resimler işlendi. Baştan başlamak için klasörü yeniden seçin.",
        variant: "default"
      });
      
      // Reset batch processing
      setProcessedFileIndex(0);
      setIsBatchMode(false);
      setSelectedFolderFiles([]);
      localStorage.removeItem(FOLDER_FILES_KEY);
      localStorage.removeItem(PROCESSED_INDEX_KEY);
      return;
    }
    
    // Mevcut resimleri temizle (yeni batch için)
    setProductImages([]);
    
    // Yeni batch'i ekle
    const newImages = currentBatch.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: false,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.name}`
    }));
    
    setProductImages(newImages);
    
    // Sonraki batch için index'i güncelle
    const nextIndex = processedFileIndex + BATCH_SIZE;
    setProcessedFileIndex(nextIndex);
    
    // LocalStorage'a kaydet
    localStorage.setItem(PROCESSED_INDEX_KEY, nextIndex.toString());
    
    toast({
      title: "Batch Yüklendi",
      description: `${currentBatch.length} resim yüklendi. (${processedFileIndex + 1}-${Math.min(processedFileIndex + BATCH_SIZE, imageFiles.length)})`,
      variant: "default"
    });
    
  }, [processedFileIndex, toast]);

  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    media: true,
    basic: true,
    tags: false,
    shipping: false,
    variations: false,
    personalization: false
  });

  // Toast bildirim sistemi
  const [toastMessages, setToastMessages] = useState<Array<{
    id: number;
    message: string;
    type: "success" | "error" | "info";
    timestamp: number;
  }>>([]);

  const router = useRouter()

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev]
    }));
  };

  // Initialize media files from initialData (for queue editing)
  useEffect(() => {
    if (initialData?.images && initialData.images.length > 0) {
      const mediaFiles: MediaFile[] = initialData.images.map((img: any, index: number) => {
        // Base64'ten File objesi oluştur
        const base64Data = img.base64;
        const mimeType = img.type || 'image/jpeg';
        const filename = img.name || `image_${index + 1}.jpg`;
        
        // Base64'ü blob'a çevir
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        const file = new File([blob], filename, { type: mimeType });
        
        return {
          file: file,
          preview: `data:${mimeType};base64,${base64Data}`,
          uploading: false
        };
      });
      
      setProductImages(mediaFiles);
    }
    
    if (initialData?.video) {
      const video = initialData.video;
      const base64Data = video.base64;
      const mimeType = video.type || 'video/mp4';
      const filename = video.name || 'video.mp4';
      
      // Base64'ü blob'a çevir
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      const file = new File([blob], filename, { type: mimeType });
      
      setVideoFile({
        file: file,
        preview: `data:${mimeType};base64,${base64Data}`,
        uploading: false
      });
    }
  }, [initialData]);

  // Form progress calculation
  useEffect(() => {
    let progress = 0;
    const totalFields = 8;
    
    if ((productImages || []).length > 0) progress += 1;
    if ((title || '').length > 10) progress += 1;
    if ((description || '').length > 50) progress += 1;
    if (price > 0 || (hasVariations && variations.some(v => v.price > 0))) progress += 1;
    if ((tags || []).length > 3) progress += 1;
    if (shippingProfileId) progress += 1;
    if (selectedShopSection) progress += 1;
    if (hasVariations && variations.some(v => v.is_active)) progress += 1;
    
    const percentage = Math.round((progress / totalFields) * 100);
    setFormProgress(percentage);
    
    // Auto step calculation
    if (progress <= 2) setCurrentStep(1);
    else if (progress <= 4) setCurrentStep(2);
    else if (progress <= 6) setCurrentStep(3);
    else setCurrentStep(4);
  }, [productImages, title, description, price, tags, shippingProfileId, selectedShopSection, hasVariations, variations]);

  // Video reminder check
  const shouldShowVideoReminder = (productImages || []).length >= 3 && !videoFile;

  // Validation states
  const fieldValidation = {
    media: (productImages || []).length > 0 ? 'valid' : 'invalid',
    title: (title || '').length > 10 ? 'valid' : (title || '').length > 0 ? 'warning' : 'invalid',
    description: (description || '').length > 50 ? 'valid' : (description || '').length > 0 ? 'warning' : 'invalid',
    price: (price > 0 || (hasVariations && variations.some(v => v.price > 0))) ? 'valid' : 'invalid',
    tags: (tags || []).length > 3 ? 'valid' : (tags || []).length > 0 ? 'warning' : 'invalid'
  };

  // Basit toast alternatifi - güzel UI ile
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    // Console'a yaz
    console.log(`Toast ${type.toUpperCase()}: ${message}`);
    
    // Yeni toast mesajı ekle
    const newToast = {
      id: Date.now(),
      message,
      type,
      timestamp: Date.now()
    };
    
    setToastMessages(prev => [...prev, newToast]);
    
    // 4 saniye sonra otomatik sil
    setTimeout(() => {
      setToastMessages(prev => prev.filter(toast => toast.id !== newToast.id));
    }, 4000);
    
    // useToast hook'unu da dene (eğer çalışıyorsa)
    try {
      toast({
        title: message,
        variant: type === "error" ? "destructive" : undefined
      });
    } catch (e) {
      // Sessizce geç, kendi toast sistemimiz var
    }
  };

  // Step Navigation
  const steps = [
    { id: 1, name: 'Medya', icon: '📸', description: 'Resim ve video yükle' },
    { id: 2, name: 'Temel', icon: '📝', description: 'Başlık ve açıklama' },
    { id: 3, name: 'Detay', icon: '🏷️', description: 'Etiket ve kategori' },
    { id: 4, name: 'Tamamla', icon: '✅', description: 'Son kontroller' }
  ];

  // Eğer ürün düzenleniyorsa onun bölümünü, değilse ilk bölümü seç
  const initialSectionId = product?.shop_section_id?.toString() || shopSections[0]?.shop_section_id.toString() || '';
  
  useEffect(() => {
    if (isOpen) {
      setSelectedShopSection(initialSectionId);
    }
  }, [isOpen, initialSectionId]);

  // Shop sections yüklendikten sonra default seçim yap
  useEffect(() => {
    console.log('🔄 useEffect OTOMATIK SEÇİM çalıştı:', {
      isOpen,
      shopSectionsLength: shopSections.length,
      selectedShopSection,
      product: !!product,
      aiCategorySelected
    });
    
    // Yeni ürün oluşturuluyorsa ve shop sections yüklendiyse, ilkini seç
    // ANCAK AI kategorisi seçilmediyse
    if (isOpen && shopSections.length > 0 && !selectedShopSection && !product && !aiCategorySelected) {
      const firstSectionId = shopSections[0].shop_section_id.toString();
      console.log('🚨🚨🚨 OTOMATIK SEÇİM YAPILIYOR - OVERRIDE RISKI!', firstSectionId, shopSections[0].title);
      setSelectedShopSection(firstSectionId);
      console.log('🏪 Otomatik shop section seçildi:', {
        id: firstSectionId,
        title: shopSections[0].title,
        total_sections: shopSections.length
      });
      
      // DOM üzerinde de select elementini güncelle
      setTimeout(() => {
        const selectElement = document.querySelector('select[name="shopSection"]') as HTMLSelectElement;
        if (selectElement) {
          selectElement.value = firstSectionId;
          console.log('🏪 DOM select değeri güncellendi:', selectElement.value);
        }
      }, 100);
    } else {
      console.log('❌ Otomatik seçim yapılmadı çünkü:', {
        aiCategorySelected,
        selectedShopSection,
        kondülyonlar: `isOpen:${isOpen}, shopSections:${shopSections.length}, selectedShopSection:${!selectedShopSection}, product:${!product}, aiCategorySelected:${!aiCategorySelected}`
      });
    }
  }, [isOpen, shopSections, selectedShopSection, product, aiCategorySelected]);

  // Pending category bilgisini shop sections yüklendiğinde uygula
  useEffect(() => {
    if (pendingCategoryId && shopSections.length > 0 && !aiCategorySelected) {
      console.log('🔄 Pending category uygulanıyor:', pendingCategoryId);
      
      try {
        const categoryInfo = JSON.parse(pendingCategoryId);
        const categoryName = categoryInfo.title || categoryInfo.name;
        
        if (categoryName) {
          const matchedSection = shopSections.find(s => 
            s.title.toLowerCase() === categoryName.toLowerCase()
          );
          
          if (matchedSection) {
            setSelectedShopSection(matchedSection.shop_section_id.toString());
            setAiCategorySelected(true);
            setPendingCategoryId(null);
            console.log('✅ Pending kategori uygulandı:', matchedSection.title);
            
            // DOM üzerinde de select elementini güncelle
            setTimeout(() => {
              const selectElement = document.querySelector('select[name="shopSection"]') as HTMLSelectElement;
              if (selectElement) {
                selectElement.value = matchedSection.shop_section_id.toString();
                console.log('🏪 DOM select değeri güncellendi (AI kategori):', selectElement.value);
              }
            }, 100);
          } else {
            console.log('⚠️ Pending kategori bulunamadı:', categoryName);
            console.log('📋 Mevcut kategoriler:', shopSections.map(s => s.title));
            setPendingCategoryId(null);
          }
        }
      } catch (error) {
        console.log('❌ Pending category parse hatası:', error);
        setPendingCategoryId(null);
      }
    }
  }, [shopSections, pendingCategoryId, aiCategorySelected]);

  // Dükkan bölümlerini API'den çekmek için useEffect - eski çalışan versiyona uygun
  useEffect(() => {
    console.log('🔍 Shop sections useEffect çalıştı, isOpen:', isOpen);
    if (isOpen) {
      async function loadShopSections() {
        try {
          console.log('🏪 Shop sections yükleniyor...');
          const response = await fetch('/api/etsy/shop-sections');
          const data = await response.json();
          if (response.ok && data.sections) {
            console.log('✅ Shop sections yüklendi:', data.sections.length, 'adet');
            console.log('📋 Shop sections:', data.sections.map(s => ({ id: s.shop_section_id, title: s.title })));
            setShopSections(data.sections);
          } else {
            console.error('❌ Shop sections API hatası:', response.status, data);
          }
        } catch (error) { 
          console.error("❌ Dükkan bölümleri yüklenemedi:", error);
          toast({
            variant: "destructive",
            title: "Hata",
            description: "Dükkan bölümleri yüklenirken bir hata oluştu."
          });
        }
      }
      loadShopSections();
    }
  }, [isOpen, toast]);

  // Form açıldığında state'leri sıfırla
  useEffect(() => {
    if (isOpen) {
      setProductImages([]);
      setVideoFile(null);
      setTitle(product?.title || "");
      const randomDescription = generateRandomDescription();
      setDescription(randomDescription);
      setPrice(product?.price?.amount || 0);
      setQuantity(4);
      setShippingProfileId(product?.shipping_profile_id?.toString() || "");
      setTags(product?.tags || []);
      setNewTag("");
      setIsPersonalizable(true);
      setPersonalizationRequired(false);
      setPersonalizationInstructions(PERSONALIZATION_INSTRUCTIONS);
      setTaxonomyId(product?.taxonomy_id || WALL_DECOR_TAXONOMY_ID);
      setHasVariations(product?.variations ? (product.variations || []).length > 0 : true);
      const initialVariations = product?.variations && (product.variations || []).length > 0 
        ? (product.variations || [])
        : predefinedVariations.map(v => ({ ...v, is_active: true })); // Tüm varyasyonları otomatik aktif et
      setVariations(initialVariations);
      if (product?.images && (product.images || []).length) {
        setProductImages(product.images.map(img => ({
          file: new File([], img.url || ''),
          preview: img.url || '',
          uploading: false
        })));
      }
    }
    return () => {
      productImages.forEach(img => {
        if (img.preview) {
          URL.revokeObjectURL(img.preview);
        }
      });
    };
  }, [isOpen, product]);

  // Kargo profili varsayılanı: Yeni ürün eklerken ilk profili otomatik seç
  useEffect(() => {
    if (isOpen && !product && (shippingProfiles || []).length > 0) {
      setShippingProfileId(shippingProfiles[0].shipping_profile_id.toString());
    }
  }, [isOpen, product, shippingProfiles]);

  // Fetch shipping profiles and shop sections when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchStoreData = async () => {
      try {
        // Get user's connected store information
        const userId = 'local-user-123'; // This should come from auth context
        
        // Fetch user's store info to get shop_id
        const storeResponse = await fetch('/api/etsy/status');
        if (!storeResponse.ok) {
          console.error('Failed to fetch store info');
          return;
        }
        
        const storeData = await storeResponse.json();
        console.log('Store data received:', storeData);
        
        // API'den shopId veya store.shop_id'yi al
        const shopId = storeData.shopId || storeData.store?.shop_id;
        
        if (!shopId) {
          console.error('No shop ID found', { 
            storeData, 
            shopId,
            isConnected: storeData.isConnected,
            error: storeData.error 
          });
          
          // Etsy bağlantısı yoksa kullanıcıyı bilgilendir
          if (!storeData.isConnected) {
            toast({
              variant: "destructive",
              title: "Etsy Bağlantısı Yok",
              description: storeData.error || "Etsy hesabınızı bağlamanız gerekiyor. Ayarlar menüsünden Etsy hesabınızı bağlayın."
            });
          }
          return;
        }
        
        console.log('Using shop ID:', shopId);

        // Fetch shipping profiles
        setLoadingShippingProfiles(true);
        try {
          const shippingResponse = await fetch(`/api/shipping-profiles/firebase?shop_id=${shopId}`);
          if (shippingResponse.ok) {
            const shippingData = await shippingResponse.json();
            console.log('Shipping profiles received:', shippingData.profiles?.length || 0, 'profiles');
            setShippingProfiles(shippingData.profiles || []);
          } else {
            console.error('Shipping profiles request failed:', shippingResponse.status);
          }
        } catch (error) {
          console.error('Error fetching shipping profiles:', error);
        } finally {
          setLoadingShippingProfiles(false);
        }

        // Fetch shop sections
        setLoadingShopSections(true);
        try {
          const sectionsResponse = await fetch(`/api/shop-sections/firebase?shop_id=${shopId}`);
          if (sectionsResponse.ok) {
            const sectionsData = await sectionsResponse.json();
            console.log('Shop sections received:', sectionsData.sections?.length || 0, 'sections');
            setShopSections(sectionsData.sections || []);
          } else {
            console.error('Shop sections request failed:', sectionsResponse.status);
          }
        } catch (error) {
          console.error('Error fetching shop sections:', error);
        } finally {
          setLoadingShopSections(false);
        }

      } catch (error) {
        console.error('Error fetching store data:', error);
      }
    };

    fetchStoreData();
  }, [isOpen]);

  // Başlık değişimini debounce ile geciktir
  const debouncedTitle = useDebounce(title, 1000); // 1 saniye debounce

  // hasUnsavedChanges fonksiyonunu güncelle
  const hasUnsavedChanges = () => {
    return (
      title !== "" ||
      description !== "" ||
      price !== 0 ||
      (productImages || []).length > 0 ||
      (tags || []).length > 0
    );
  };

  // Modal kapatılırken değişiklik varsa onay sor
  const handleCloseModal = () => {
    if (hasUnsavedChanges()) {
      setShowUnsavedChangesDialog(true);
    } else {
      // Tüm form state'lerini temizle
      setTitle("");
      setAutoTitleUsed(false);
      setUserEditedTitle(false);
      setProductImages([]);
      setDescription("");
      setPrice("");
      setQuantity(1);
      setTags([]);
      setSelectedCategory(null);
      setSelectedShopSection("");
      setAiCategorySelected(false); // AI seçim flag'ini sıfırla
      setPendingCategoryId(null); // Pending kategori ID'yi sıfırla
      // Force modal close
      setTimeout(() => {
        onClose();
      }, 0);
    }
  };

  // Tag ekleme
  const handleAddTag = () => {
    if (!newTag.trim()) return;
    
    // Özel karakterleri temizle
    const cleanTag = cleanTagText(newTag.trim());
    
    if (!cleanTag) {
      toast({ 
        variant: "destructive", 
        title: "Geçersiz Etiket", 
        description: "Etiket sadece harf, rakam ve boşluk içerebilir" 
      });
      return;
    }
    
    // Karakter sınırı kontrolü
    if (cleanTag.length > 20) {
      toast({ 
        variant: "destructive", 
        title: "Etiket Çok Uzun", 
        description: "Etiket 20 karakterden uzun olamaz" 
      });
      return;
    }
    
    // Duplicate kontrolü
    if (tags.includes(cleanTag)) {
      toast({ 
        variant: "destructive", 
        title: "Tekrar Eden Etiket", 
        description: "Bu etiket zaten ekli" 
      });
      return;
    }
    
    // Maksimum limit kontrolü
    if (tags.length >= 13) {
      toast({ 
        variant: "destructive", 
        title: "Etiket Limiti", 
        description: "Maksimum 13 etiket ekleyebilirsiniz" 
      });
      return;
    }
    
    setTags([...tags, cleanTag]);
    setNewTag("");
  }

  // Etiket metnini temizleme fonksiyonu
  const cleanTagText = (tag: string): string => {
    // Türkçe karakterleri İngilizce karakterlere dönüştür
    let cleanTag = tag
      .replace(/ğ/g, 'g')
      .replace(/Ğ/g, 'G')
      .replace(/ü/g, 'u')
      .replace(/Ü/g, 'U')
      .replace(/ş/g, 's')
      .replace(/Ş/g, 'S')
      .replace(/ı/g, 'i')
      .replace(/İ/g, 'I')
      .replace(/ö/g, 'o')
      .replace(/Ö/g, 'O')
      .replace(/ç/g, 'c')
      .replace(/Ç/g, 'C');
    
    // Sadece alfanumerik karakterleri ve boşlukları koru
    cleanTag = cleanTag.replace(/[^a-zA-Z0-9\s]/g, '');
    
    return cleanTag.toLowerCase(); // Tüm etiketleri küçük harfe dönüştür
  }

  // Tag silme
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  }

  // Uzun etiketleri otomatik temizle
  const cleanupLongTags = useCallback(() => {
    const longTags = tags.filter(tag => tag.length > 20);
    if (longTags.length > 0) {
      const validTags = tags.filter(tag => tag.length <= 20);
      setTags(validTags);
      
      toast({ 
        variant: "default", 
        title: "Uzun Etiketler Temizlendi", 
        description: `${longTags.length} adet 20+ karakterlik etiket otomatik olarak silindi: ${longTags.slice(0,3).join(', ')}${longTags.length > 3 ? '...' : ''}` 
      });
      
      if (validTags.length < 13) {
        const neededTags = 13 - validTags.length;
        setTimeout(() => {
          toast({ 
            variant: "default", 
            title: "Ek Etiket Gerekli", 
            description: `${neededTags} adet daha etiket eklemek için "Yeni Etiket İste" butonuna tıklayın.` 
          });
        }, 2000); // 2 saniye gecikme ile göster
      }
    }
  }, [tags, toast]);

  // Component açıldığında uzun etiketleri kontrol et
  useEffect(() => {
    if (isOpen && tags.length > 0) {
      cleanupLongTags();
    }
  }, [isOpen, cleanupLongTags]);

  // Duplicate resim kontrolü - çok güçlü
  const isDuplicateImage = useCallback((newFile: File, existingImages: MediaFile[]) => {
    // Dosya özelliklerine göre duplicate kontrolü
    const isDuplicateByFileProperties = existingImages.some(existing => 
      existing.file && 
      existing.file.name === newFile.name && 
      existing.file.size === newFile.size &&
      existing.file.lastModified === newFile.lastModified &&
      existing.file.type === newFile.type
    );
    
    if (isDuplicateByFileProperties) {
      console.log('🔄 Duplicate dosya tespit edildi:', newFile.name, newFile.size, 'bytes');
      return true;
    }
    
    return false;
  }, []);

  // Resim yükleme işleyicileri
  const handleImageDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    const videoFiles = files.filter(f => f.type.startsWith('video/'));
    
    // Duplicate kontrolü
    const uniqueImageFiles = imageFiles.filter(file => {
      if (isDuplicateImage(file, productImages || [])) {
        console.log('🔄 Duplicate resim atlandı:', file.name);
        return false;
      }
      return true;
    });
    
    if (uniqueImageFiles.length !== imageFiles.length) {
      toast({ 
        title: "Duplicate Resimler Atlandı", 
        description: `${imageFiles.length - uniqueImageFiles.length} duplicate resim atlandı.`, 
        variant: "default" 
      });
    }
    
    if ((productImages || []).length + uniqueImageFiles.length > 10) {
      toast({ title: "Maksimum Resim Limiti", description: "En fazla 10 resim yükleyebilirsiniz.", variant: "destructive" });
    } else if (uniqueImageFiles.length > 0) {
      const newImages = uniqueImageFiles.map(file => ({ 
        file, 
        preview: URL.createObjectURL(file), 
        uploading: false,
        // Unique identifier için timestamp + random ekliyoruz
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.name}`
      }));
      setProductImages(prev => {
        console.log('📷 Önceki resimler:', prev.length);
        console.log('📷 Yeni resimler:', newImages.length);
        console.log('📷 Toplam olacak:', prev.length + newImages.length);
        return [...prev, ...newImages];
      });
    }
    if ((videoFiles || []).length > 0) {
      if (videoFile) URL.revokeObjectURL(videoFile.preview);
      setVideoFile({ file: videoFiles[0], preview: URL.createObjectURL(videoFiles[0]), uploading: false });
    }
  }, [(productImages || []).length, videoFile, toast, isDuplicateImage]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    const videoFiles = files.filter(f => f.type.startsWith('video/'));
    
    // Duplicate kontrolü
    const uniqueImageFiles = imageFiles.filter(file => {
      if (isDuplicateImage(file, productImages || [])) {
        console.log('🔄 Duplicate resim atlandı:', file.name);
        return false;
      }
      return true;
    });
    
    if (uniqueImageFiles.length !== imageFiles.length) {
      toast({ 
        title: "Duplicate Resimler Atlandı", 
        description: `${imageFiles.length - uniqueImageFiles.length} duplicate resim atlandı.`, 
        variant: "default" 
      });
    }
    
    if ((productImages || []).length + uniqueImageFiles.length > 10) {
      toast({ title: "Maksimum Resim Limiti", description: "En fazla 10 resim yükleyebilirsiniz.", variant: "destructive" });
    } else if (uniqueImageFiles.length > 0) {
      const newImages = uniqueImageFiles.map(file => ({ 
        file, 
        preview: URL.createObjectURL(file), 
        uploading: false,
        // Unique identifier için timestamp + random ekliyoruz
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.name}`
      }));
      setProductImages(prev => {
        console.log('📷 Önceki resimler:', prev.length);
        console.log('📷 Yeni resimler:', newImages.length);
        console.log('📷 Toplam olacak:', prev.length + newImages.length);
        return [...prev, ...newImages];
      });
    }
    if ((videoFiles || []).length > 0) {
      if (videoFile) URL.revokeObjectURL(videoFile.preview);
      setVideoFile({ file: videoFiles[0], preview: URL.createObjectURL(videoFiles[0]), uploading: false });
    }
    e.target.value = '';
  }, [(productImages || []).length, videoFile, toast]);

  const handleRemoveImage = useCallback((index: number) => {
    setProductImages(prev => {
      const newImages = [...prev];
      if (newImages[index].preview) {
        URL.revokeObjectURL(newImages[index].preview);
      }
      newImages.splice(index, 1);
      return newImages;
    });
  }, []);

  // Resim sırasını değiştir
  const moveImage = useCallback((dragIndex: number, hoverIndex: number) => {
    setProductImages((prevImages) => {
      const newImages = [...prevImages];
      const draggedImage = newImages[dragIndex];
      newImages.splice(dragIndex, 1);
      newImages.splice(hoverIndex, 0, draggedImage);
      return newImages;
    });
  }, []);

  const handleVariationChange = (index: number, field: 'price' | 'is_active', value: string | number | boolean) => {
    const newVariations = [...variations];
    const variationToUpdate = { ...newVariations[index] };
  
    if (field === 'price') {
      variationToUpdate.price = Number(value);
    } else if (field === 'is_active') {
      variationToUpdate.is_active = !!value;
    }
  
    newVariations[index] = variationToUpdate;
    setVariations(newVariations);
  };

  // Otomatik varyasyon yönetim fonksiyonları
  const handleAddAllVariations = () => {
    const activatedVariations = predefinedVariations.map(variation => ({
      ...variation,
      is_active: true
    }));
    setVariations(activatedVariations);
    setHasVariations(true);
    console.log('✅ Tüm varyasyonlar aktifleştirildi:', activatedVariations.length, 'adet varyasyon');
    const activeCount = activatedVariations.filter(v => v.is_active).length;
    console.log('📊 Aktif varyasyon sayısı:', activeCount);
  };

  const handleResetVariations = () => {
    setVariations([...predefinedVariations]);
    console.log('🔄 Varyasyonlar sıfırlandı');
  };

  const handleActivatePattern = (pattern: string) => {
    const newVariations = variations.map(variation => ({
      ...variation,
      is_active: variation.pattern === pattern ? true : variation.is_active
    }));
    setVariations(newVariations);
    console.log(`🎯 ${pattern} varyasyonları aktifleştirildi`);
  };

  const handleDeactivateAll = () => {
    const deactivatedVariations = variations.map(variation => ({
      ...variation,
      is_active: false
    }));
    setVariations(deactivatedVariations);
    console.log('❌ Tüm varyasyonlar deaktifleştirildi');
  };

  // productImages değiştiğinde autoTitleUsed'u sıfırla
  useEffect(() => {
    setAutoTitleUsed(false);
  }, [productImages]);

  // Yardımcı fonksiyon: Başta/sonda özel karakter/noktalama temizle + 140 karakter kontrolü
  const cleanTitle = (raw: string) =>
    raw
      .trim()
      .replace(/^[!.:,*]+|[!.:,*]+$/g, '')
      .substring(0, 140);
      
  // Etsy'nin kabul ettiği karakterlere göre başlık temizleme fonksiyonu
  const cleanEtsyTitle = (title: string) => {
    // Etsy'nin kabul etmediği karakterleri temizle
    return title
      .replace(/[^\w\s\-,.&'"\(\)\/\\]/g, '') // Sadece izin verilen karakterleri tut
      .trim()
      .substring(0, 140); // 140 karakter sınırı
  };

  // Image count'u optimize et - sadece length değiştiğinde yeniden hesapla
  const imageCount = useMemo(() => (productImages || []).length, [productImages]);

  // Resim yüklendiğinde başlık üret
  useEffect(() => {
    console.log('🔍 Auto title check:', {
      isOpen,
      imageCount,
      title: title ? `"${title.substring(0, 30)}..."` : 'empty',
      autoTitleUsed,
      userEditedTitle,
      shouldGenerate: isOpen && imageCount >= 1 && (!title || title.trim() === '') && !autoTitleUsed && !userEditedTitle && !autoTitleLoading
    });
    
    // İlk resim eklendiğinde SADECE 1 KEZ AI analizi yap - loading durumunu da kontrol et
    if (isOpen && imageCount >= 1 && (!title || title.trim() === '') && !autoTitleUsed && !userEditedTitle && !autoTitleLoading) {
      console.log('🤖 Otomatik başlık üretimi başlatılıyor...');
      
      const generateTitle = async () => {
        if (!productImages || productImages.length === 0) {
          toast({
            variant: "destructive",
            title: "Resim Yok",
            description: "Başlık oluşturmak için en az bir resim ekleyin."
          });
          return;
        }

        setAutoTitleLoading(true);
        setAutoTitleUsed(true);

        try {
          const formData = new FormData();
          formData.append('image', productImages[0].file);
          
          // Kategorileri ekle
          if (shopSections && shopSections.length > 0) {
            formData.append('categories', JSON.stringify(shopSections));
          }

          const response = await fetch('/api/ai/analyze-and-generate', {
            method: 'POST',
            body: formData,
          });

          const data = await response.json();
          
          // OpenAI API kredi/quota hatası kontrolü
          if (!data.success && data.error_type === 'openai_quota_exceeded') {
            console.error('❌ OpenAI API kredisi/quota hatası tespit edildi!');
            toast({
              variant: "destructive",
              title: "OpenAI API Kredisi Tükendi",
              description: "OpenAI API krediniz tükenmiş. Lütfen API kredinizi kontrol edin ve yenileyin.",
            });
            setAutoTitleLoading(false);
            return;
          }

                if (data.title) {
        const cleanedTitle = cleanTitle(data.title);
        console.log('✅ Başlık alındı:', cleanedTitle);
        setTitle(cleanedTitle);
        
        // Input alanını da güncelle (DOM manipülasyonu)
        const titleInput = document.querySelector('input[name="title"]') as HTMLInputElement;
        if (titleInput) {
          titleInput.value = cleanedTitle;
        }
        
        // Etiketleri ekle
            if (data.tags && Array.isArray(data.tags)) {
              const cleanTags = data.tags.map(tag => cleanTagText(tag)).filter(Boolean);
              setTags(cleanTags);
            }
            
            // Shop section seçimi
            if (data.suggestedCategoryId && shopSections.length > 0) {
              const categoryId = data.suggestedCategoryId.toString();
              setSelectedShopSection(categoryId);
              setAiCategorySelected(true);
              console.log('🏪 AI kategori seçildi:', categoryId);
              
              // DOM'daki select elementini de güncelle
              setTimeout(() => {
                const shopSectionSelect = document.querySelector('select[name="shop_section_id"]') as HTMLSelectElement;
                if (shopSectionSelect) {
                  shopSectionSelect.value = categoryId;
                  console.log('🏪 DOM shop section select güncellendi:', categoryId);
                  
                  // Select değişikliğini tetikle (React için)
                  const event = new Event('change', { bubbles: true });
                  shopSectionSelect.dispatchEvent(event);
                }
              }, 100);
            }
          }
        } catch (error) {
          console.error('❌ Başlık oluşturma hatası:', error);
          toast({
            variant: "destructive",
            title: "Başlık Oluşturulamadı",
            description: "Bir hata oluştu. Lütfen tekrar deneyin."
          });
        } finally {
          setAutoTitleLoading(false);
        }
      };
      generateTitle();
    }
  // imageCount optimize edildi, sadece gerçekten değiştiğinde tetiklenecek
  }, [isOpen, title, autoTitleUsed, userEditedTitle, imageCount, autoTitleLoading, shopSections]);


  // Shop section select değiştiğinde otomatik güncellemeyi kapat
  const handleShopSectionChange = (val: string) => {
    setSelectedShopSection(val);
    setShopSectionAutoSelected(false); // Manuel seçim yapıldığında otomatiği kapat
    console.log('Manuel kategori seçimi:', val);
  };

  // Category auto-selection is now handled by the unified AI API
  // This useEffect is kept for fallback category selection if needed
  useEffect(() => {
    // Only run if we have title, shop sections, and auto-selection is active
    // But unified AI already handles this, so we'll use simple keyword matching as fallback
    if (!title || !(shopSections || []).length || !shopSectionAutoSelected) return;
    
    // Simple keyword-based category selection as fallback
    const timer = setTimeout(() => {
      try {
        console.log('Fallback kategori seçimi başlatılıyor:', title);
        
        const titleLower = title.toLowerCase();
        let matchedSection = null;
        
        // Try to find category based on common keywords in title
        const keywordMapping = {
          'abstract': ['abstract', 'geometric', 'modern'],
          'animal': ['animal', 'pet', 'cat', 'dog', 'bird', 'wildlife'],
          'botanical': ['flower', 'plant', 'leaf', 'tree', 'nature', 'botanical'],
          'landscape': ['landscape', 'mountain', 'ocean', 'sunset', 'beach'],
          'minimalist': ['minimalist', 'simple', 'clean', 'minimal']
        };
        
        for (const [categoryType, keywords] of Object.entries(keywordMapping)) {
          if (keywords.some(keyword => titleLower.includes(keyword))) {
            matchedSection = shopSections.find(s => 
              s.title.toLowerCase().includes(categoryType) ||
              keywords.some(k => s.title.toLowerCase().includes(k))
            );
            if (matchedSection) break;
          }
        }
        
        // Fallback to first section if no match
        if (!matchedSection && shopSections.length > 0) {
          matchedSection = shopSections[0];
        }
        
        if (matchedSection && !selectedShopSection) {
          console.log('Fallback kategori seçildi:', matchedSection.title);
          setSelectedShopSection(matchedSection.shop_section_id.toString());
        }
      } catch (error) {
        console.error('Fallback kategori seçimi hatası:', error);
      }
    }, 1000); // 1 saniye debounce
    
    return () => clearTimeout(timer);
  // Kompleks nesneleri (arrays, objects) bağımlılık dizisinden çıkarıyoruz ve sadece primitive değerleri kullanıyoruz
  }, [title, shopSectionAutoSelected, selectedShopSection]); // shopSections çıkarıldı

  // Form açıldığında otomatik seçimi aktif et
  useEffect(() => {
    if (isOpen) {
      setShopSectionAutoSelected(true);
      console.log('Form açıldı, otomatik kategori seçimi aktif');
    }
  }, [isOpen]);

  // Mount kontrolü - hydration fix
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // TAM OTOMATİK SİSTEM - Resimler otomatik sürüklensin, 10 saniye bekle, submit et
  useEffect(() => {
    if (isAutoMode && isOpen) {
      console.log('🤖 TAM OTOMATİK MOD BAŞLADI', { autoFiles: autoFiles?.length, autoTitle });
      
      // Başlık işi yok - sadece resimler sürüklenecek
      
      // 2. Resimleri otomatik sürükle (sadece bir kez, çift ekleme önlemi)
      if (autoFiles && autoFiles.length > 0 && productImages.length === 0 && countdown === null) {
        console.log('📸 Resimler otomatik sürükleniyor...', autoFiles.length, 'dosya');
        
        // Dosyaları tek tek ekle (video + resim) - MAX 10 dosya
        const addFilesSequentially = async () => {
          // Etsy limiti: max 10 dosya
          const maxFiles = Math.min(autoFiles.length, 10);
          console.log(`📁 ${autoFiles.length} dosya var, ${maxFiles} tanesini ekleyeceğiz (Etsy limiti: 10)`);
          
          for (let i = 0; i < maxFiles; i++) {
            const file = autoFiles[i];
            const preview = URL.createObjectURL(file);
            const isVideo = file.type.startsWith('video/');
            
            // Her dosyayı 500ms arayla ekle (gerçekçi sürükleme efekti)
            await new Promise(resolve => setTimeout(resolve, 500));
            
            if (isVideo) {
              // Video dosyası
              const newVideo: MediaFile = {
                file,
                preview,
                uploading: false
              };
              setVideoFile(newVideo);
              console.log(`🎥 Video ${i + 1}/${maxFiles} eklendi:`, file.name);
            } else {
              // Resim dosyası
              const newImage: MediaFile = {
                file,
                preview,
                uploading: false
              };
              setProductImages(prev => {
                const updated = [...prev, newImage];
                console.log(`📷 Resim ${i + 1}/${maxFiles} eklendi:`, file.name);
                return updated;
              });
            }
          }
          
          console.log('✅ Tüm resimler eklendi');
          
          // OTOMATIK ÜRÜN EKLEME MODU: Geri sayım yok, sadece başlık kontrolü
          if (isAutoMode) {
            console.log('🤖 Otomatik mod: Başlık kontrolü yapılıyor...');
            
            // Başlık kontrolü için interval
            const titleCheckInterval = setInterval(() => {
              // State'den güncel title değerini al
              const currentTitle = document.querySelector('input[name="title"]')?.value || title;
              console.log('🔍 Auto title check:', currentTitle);
              
              // Etsy için temizlenmiş başlık kontrolü
              const cleanedTitle = cleanEtsyTitle(currentTitle);
              console.log('🧹 Cleaned title for Etsy:', cleanedTitle);
              
              if (cleanedTitle && cleanedTitle.trim().length > 0 && !autoTitleLoading) {
                console.log('🎯 OTOMATIK MOD: Başlık hazır, etiket kontrolü yapılıyor...');
                // Temizlenmiş başlığı state'e ata
                setTitle(cleanedTitle);
                clearInterval(titleCheckInterval);
                
                // Etiket kontrolü: 9+ etiket varsa direkt gönder, yoksa yeni etiket iste
                const checkTagsAndSubmit = () => {
                  const currentTagCount = tags.length;
                  console.log(`🏷️ Mevcut etiket sayısı: ${currentTagCount}/13`);
                  
                  if (currentTagCount >= 9) {
                    console.log('✅ Yeterli etiket var (9+), direkt gönderiliyor...');
                    setTimeout(() => {
                      const buttonSelector = autoMode === 'direct-etsy' ? '[data-direct-submit-button]' : '[data-submit-button]';
                      const submitButton = document.querySelector(buttonSelector) as HTMLButtonElement;
                      if (submitButton && !submitButton.disabled) {
                        const actionText = autoMode === 'direct-etsy' ? 'Direkt Etsy\'ye gönderiliyor' : 'Kuyruğa gönderiliyor';
                        console.log(`🚀 Otomatik mod (${autoMode}) - ${actionText}...`);
                        submitButton.click();
                      }
                    }, 500);
                  } else {
                    console.log(`⚠️ Etiket eksik (${currentTagCount}/9), "Yeni Etiket İste" butonuna tıklanıyor...`);
                    
                    // "Yeni Etiket İste" butonunu bul ve tıkla
                    const newTagButton = document.querySelector('button[title="Yeni Etiket İste"]') as HTMLButtonElement;
                    if (newTagButton) {
                      console.log('🔄 Yeni etiket isteniyor...');
                      newTagButton.click();
                      
                      // Yeni etiketlerin gelmesini bekle, sonra tekrar kontrol et
                      setTimeout(() => {
                        console.log('🔁 Etiket güncellendikten sonra tekrar kontrol ediliyor...');
                        checkTagsAndSubmit(); // Recursive call
                      }, 2000); // 2 saniye bekle
                    } else {
                      console.log('❌ "Yeni Etiket İste" butonu bulunamadı, mevcut etiketlerle devam ediliyor...');
                      // Buton bulunamazsa mevcut etiketlerle devam et
                      setTimeout(() => {
                        const buttonSelector = autoMode === 'direct-etsy' ? '[data-direct-submit-button]' : '[data-submit-button]';
                        const submitButton = document.querySelector(buttonSelector) as HTMLButtonElement;
                        if (submitButton && !submitButton.disabled) {
                          const actionText = autoMode === 'direct-etsy' ? 'Direkt Etsy\'ye gönderiliyor' : 'Kuyruğa gönderiliyor';
                          console.log(`🚀 Otomatik mod (${autoMode}) - ${actionText}...`);
                          submitButton.click();
                        }
                      }, 500);
                    }
                  }
                };
                
                checkTagsAndSubmit();
                return;
              }
            }, 100); // Her 100ms kontrol et - 5x daha hızlı
            
            // Maximum 60 saniye bekle (başlık üretimi için daha fazla zaman)
            setTimeout(() => {
              clearInterval(titleCheckInterval);
              // State'den güncel title değerini al
              const currentTitle = document.querySelector('input[name="title"]')?.value || title;
              
              if (!currentTitle || currentTitle.trim().length === 0) {
                console.log('⚠️ Otomatik mod: 60 saniye sonra başlık gelmedi, yine de gönderiliyor...');
                
                // OpenAI kredi/quota hatası kontrolü
                const consoleOutput = document.querySelector('pre')?.textContent || '';
                if (consoleOutput.includes('insufficient_quota') || 
                    consoleOutput.includes('You exceeded your current quota') ||
                    consoleOutput.includes('429') ||
                    consoleOutput.includes('exceeded your current quota')) {
                  
                  console.error('❌ OpenAI API kredisi/quota hatası tespit edildi!');
                  toast({
                    variant: "destructive",
                    title: "OpenAI API Kredisi Tükendi",
                    description: "OpenAI API krediniz tükenmiş. Lütfen API kredinizi kontrol edin ve yenileyin.",
                  });
                  
                  // İşlemi durdur
                  setSubmitting(false);
                  return;
                }
                
                // API hata kontrolü
                const errorLogs = document.querySelectorAll('pre');
                let hasApiError = false;
                
                errorLogs.forEach(log => {
                  if (log.textContent?.includes('Failed to fetch')) {
                    hasApiError = true;
                  }
                });
                
                if (hasApiError) {
                  console.error('❌ API bağlantı hatası tespit edildi!');
                  toast({
                    variant: "destructive",
                    title: "API Bağlantı Hatası",
                    description: "API'ye bağlanırken bir sorun oluştu. Lütfen internet bağlantınızı kontrol edin.",
                  });
                  
                  // İşlemi durdur
                  setSubmitting(false);
                  return;
                }
                
                const buttonSelector = autoMode === 'direct-etsy' ? '[data-direct-submit-button]' : '[data-submit-button]';
                const submitButton = document.querySelector(buttonSelector) as HTMLButtonElement;
                if (submitButton && !submitButton.disabled) {
                  submitButton.click();
                }
              }
            }, 60000);
            
          } else {
            // MANUEL MOD: 15 saniye geri sayım
            console.log('👤 Manuel mod: 15 saniye geri sayım başlıyor...');
            setCountdown(15);
            
            const countdownInterval = setInterval(() => {
              setCountdown(prev => {
                if (prev === null || prev <= 1) {
                  clearInterval(countdownInterval);
                  
                  // Geri sayım bitince otomatik submit
                  setTimeout(() => {
                    console.log('⏰ Geri sayım bitti, otomatik submit başlıyor...');
                    const buttonSelector = autoMode === 'direct-etsy' ? '[data-direct-submit-button]' : '[data-submit-button]';
                    const submitButton = document.querySelector(buttonSelector) as HTMLButtonElement;
                    if (submitButton && !submitButton.disabled) {
                      const actionText = autoMode === 'direct-etsy' ? 'Direkt Etsy\'ye Gönder' : 'Kuyruğa Gönder';
                      console.log(`🚀 ${actionText} butonuna otomatik tıklanıyor...`);
                      submitButton.click();
                    } else {
                      console.log('❌ Submit butonu bulunamadı veya disabled');
                    }
                    setCountdown(null);
                  }, 500);
                  
                  return null;
                }
                
                // BYPASS KONTROLÜ: Başlık hazırsa geri sayımı bitir
                if (title && title.trim().length > 0 && title.length <= 140 && !autoTitleLoading) {
                  console.log('🎯 BYPASS: Başlık hazır ve uygun uzunlukta, geri sayım iptal ediliyor ve direkt gönderiliyor!');
                  clearInterval(countdownInterval);
                  
                  setTimeout(() => {
                    const buttonSelector = autoMode === 'direct-etsy' ? '[data-direct-submit-button]' : '[data-submit-button]';
                    const submitButton = document.querySelector(buttonSelector) as HTMLButtonElement;
                    if (submitButton && !submitButton.disabled) {
                      const actionText = autoMode === 'direct-etsy' ? 'Direkt Etsy\'ye gönderiliyor' : 'Direkt kuyruğa gönderiliyor';
                      console.log(`🚀 Başlık hazır - ${actionText}...`);
                      submitButton.click();
                    }
                    setCountdown(null);
                  }, 500);
                  
                  return null;
                }
                
                return prev - 1;
              });
            }, 1000);
          }
        };
        
        // Sıralı dosya ekleme işlemini başlat
        addFilesSequentially();
      }
    }
  // Kompleks nesneleri (arrays, objects) bağımlılık dizisinden çıkarıyoruz ve sadece primitive değerleri kullanıyoruz
  }, [isAutoMode, isOpen, autoFiles, countdown, title, autoTitleLoading]);

  // KUYRUK SİSTEMİ İÇİN YENİ FONKSİYON
  const handleSubmitToQueue = async () => {
    if (submitting) {
      console.log('⚠️ Zaten submit ediliyor, tekrar gönderim engellendet');
      return;
    }
    
    console.log('🚀 KUYRUK FONKSİYONU BAŞLADI');
    console.log('📊 Form state:', {
      title,
      shippingProfileId,
      productImagesLength: (productImages || []).length,
      price,
      hasVariations,
      variations: (variations || []).filter(v => v.is_active).length
    });

    // 1. Fiyat Validasyonu - DÜZELTILDI
    let isPriceValid = false;
    if (hasVariations) {
      // Varyasyon varsa aktif olanların fiyatını kontrol et
      isPriceValid = variations.some(v => v.is_active && Number(v.price) >= 0.20);
    } else {
      // Varyasyon yoksa ana fiyatı kontrol et
      isPriceValid = Number(price) >= 0.20;
    }

    console.log('💰 Fiyat validasyonu:', { 
      isPriceValid, 
      price, 
      hasVariations,
      activeVariations: (variations || []).filter(v => v.is_active).length,
      variations: (variations || []).map(v => ({ size: v.size, price: Number(v.price), is_active: v.is_active }))
    });

    if (!isPriceValid) {
      console.log('❌ Fiyat validasyonu başarısız');
      const message = hasVariations 
        ? "Varyasyonlarda en az bir aktif seçeneğin fiyatı 0.20 USD'den yüksek olmalı."
        : "Ana fiyat 0.20 USD'den yüksek olmalı.";
        
      toast({
        variant: "destructive",
        title: "Geçersiz Fiyat",
        description: message,
      });
      return;
    }

    setSubmitting(true);
    console.log('✅ setSubmitting(true) çağrıldı');
    
    // 2. Diğer Validasyonlar
    if (!title || !shippingProfileId || (productImages || []).length === 0) {
      console.log('❌ Diğer validasyonlar başarısız');
      const missingItems = [];
      if (!title) missingItems.push("Başlık");
      if (!shippingProfileId) missingItems.push("Kargo Profili");  
      if ((productImages || []).length === 0) missingItems.push("En az bir Resim");
      
      toast({ 
        variant: "destructive", 
        title: "❌ Eksik Bilgiler",
        description: `Eksik: ${missingItems.join(", ")}. Lütfen tüm zorunlu alanları doldurun.` 
      });
      setSubmitting(false);
      console.log('✅ setSubmitting(false) çağrıldı - validation fail');
      return;
    }

    console.log('✅ Tüm validasyonlar geçti, API çağrısına başlıyoruz');
    
    // İşlem başlangıç zamanı
    const startTime = Date.now();

    try {
      // Başlangıç toast mesajı
      toast({ 
        title: "🚀 Ürün kuyrukta kaydediliyor...", 
        description: "Lütfen bekleyin, ürün kuyrukta sisteme ekleniyor." 
      });
      
      let formData = new FormData();

      const listingData = {
        // Formdan gelen dinamik değerler
        title,
        description,
        price,
        shipping_profile_id: Number(shippingProfileId),
        tags,
        has_variations: hasVariations,
        variations: hasVariations ? variations.filter((v: any) => v.is_active) : [],
        state: "draft", // Kuyrukta her zaman draft olarak başlar
        shop_section_id: (() => {
          const shopSectionId = selectedShopSection ? Number(selectedShopSection) : null;
          console.log('🏪 Frontend shop section:', {
            selectedShopSection,
            converted: shopSectionId,
            type: typeof shopSectionId
          });
          return shopSectionId;
        })(),
        
        // --- Kişiselleştirme Ayarları (State'den Al) ---
        is_personalizable: isPersonalizable,
        personalization_is_required: personalizationRequired,
        personalization_instructions: personalizationInstructions,
        personalization_char_count_max: 256, // <-- Etsy için kritik alan

        // --- Etsy'nin İstediği Diğer Zorunlu Alanlar ---
        quantity: 999,
        taxonomy_id: taxonomyId,
        who_made: "i_did",
        when_made: "made_to_order",
        is_supply: false,
        
        // --- Renewal Options (Otomatik Yenileme) ---
        renewal_option: "automatic", // Her ürün otomatik yenileme ile oluşturulur
      };
      
      // Görselleri base64'e çevir (Local DB için)
      const imageDataArray: any[] = [];
      for (let i = 0; i < (productImages || []).length; i++) {
        const image = productImages[i];
        if (image.file) {
          // File'ı base64'e çevir
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(image.file);
          });
          
          imageDataArray.push({
            base64: base64,
            type: image.file.type,
            filename: image.file.name,
            position: i
          });
        }
      }
      
      // Video'yu base64'e çevir (Queue sisteminde saklamak için)
      let videoData: any = null;
      if (videoFile?.file) {
        console.log('🎥 Video base64\'e çevriliyor:', videoFile.file.name, (videoFile.file.size / 1024 / 1024).toFixed(2), 'MB');
        
        try {
          // Video'yu base64'e çevir
          const videoBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(videoFile.file);
          });
          
          videoData = {
            base64: videoBase64,
            type: videoFile.file.type,
            filename: videoFile.file.name,
            size: videoFile.file.size
          };
          
          console.log(`✅ Video base64'e çevrildi: ${videoFile.file.name}`);

        } catch (error) {
          console.error('❌ Video işleme hatası:', error);
          toast({
            variant: "destructive",
            title: "Video İşleme Hatası",
            description: error instanceof Error ? error.message : 'Video işlenirken beklenmeyen bir hata oluştu'
          });
          throw error;
        }
      }

      // Base64 verileri ayrı olarak FormData'ya ekle (JSON size'ı küçültmek için)
      console.log('🔍 listingData before stringify:', {
        keys: Object.keys(listingData),
        title: listingData.title,
        imagesLength: (imageDataArray || []).length,
        videoData: videoData ? `${videoData.filename} (${(videoData.size / 1024 / 1024).toFixed(2)} MB)` : null
      });
      
      // FormData'yı burada yeniden güvence altına al
      if (!formData) {
        console.error('❌ FormData undefined, yeniden oluşturuluyor');
        formData = new FormData();
      }
      
      // Resimleri doğrudan File obje olarak gönder (Base64 yerine)
      productImages.forEach((image, index) => {
        if (image.file) {
          formData.append(`imageFile_${index}`, image.file);
        }
      });
      
      // listingData'dan büyük verileri temizle
      const cleanListingData = { ...listingData };
      delete cleanListingData.images;
      delete cleanListingData.video;
      
      const jsonString = JSON.stringify(cleanListingData);
      console.log('📝 Clean JSON string length:', jsonString.length);
      console.log('📝 Images count:', (imageDataArray || []).length);
      console.log('📝 Video data:', videoData ? `${videoData.filename} (${(videoData.size / 1024 / 1024).toFixed(2)} MB)` : 'None');
      console.log('🎯 Varyasyon bilgileri:', {
        has_variations: hasVariations,
        total_variations: variations.length,
        active_variations: variations.filter((v: any) => v.is_active).length,
        quantity: quantity,
        price: hasVariations ? 'Backend hesaplar' : price
      });
      
      formData.append('listingData', jsonString);
      
      // Video'yu FormData'ya ekle
      if (videoData) {
        const videoBlob = new Blob([Uint8Array.from(atob(videoData.base64.split(',')[1]), c => c.charCodeAt(0))], { 
          type: videoData.type 
        });
        formData.append('videoFile', videoBlob, videoData.filename);
        console.log('🎥 Video FormData\'ya eklendi:', videoData.filename);
      }

      // 🚀 HAYVAN GİBİ HIZLI KUYRUK SİSTEMİ
      console.log('⚡ LIGHTNING FAST kuyruk gönderimi başlıyor...');
      
      // Instant feedback - kullanıcı hemen görsün!
      toast({
        title: "⚡ Kuyruk Gönderimi",
        description: `"${listingData.title}" kuyruğa ekleniyor...`
      });

      console.log('📦 HAYVAN GİBİ HIZLI veri:', {
        images: (imageDataArray || []).length,
        video: videoData ? `✅ ${videoData.filename}` : '❌ Yok',
        title: listingData.title,
        method: 'LIGHTNING FormData + Firebase'
      });

      // Reduced timeout for SPEED
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error('⏰ FAST timeout - 60 seconds');
      }, 60000); // 1 minute max - SPEED!
      
      console.log('⚡ LIGHTNING fetch başlatılıyor...');
      const response = await fetch('/api/etsy/listings/queue', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      console.log('⚡ LIGHTNING Response! Status:', response.status, response.statusText);

      console.log('📡 API yanıtı alındı:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      const result = await response.json();
      console.log('📋 API sonucu:', result);
      
      if (!response.ok) {
        throw new Error(result.error || 'Kuyruk sistemine ekleme başarısız.');
      }

      // İşlem süresini hesapla
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(1);

      // 🚀 HAYVAN GİBİ HIZLI başarı mesajı!
      toast({ 
        title: "⚡ LIGHTNING KUYRUK BAŞARILI!", 
        description: `"${title}" ${duration}s'de eklendi! Queue ID: #${result.queue_id}` 
      });

      // INSTANT modal kapatma - kullanıcı hemen kuyruka gidebilsin
      onClose();
      
      // Auto mode callback
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
      
      // HAYVAN GİBİ HIZLI refresh - kullanıcı hemen görsün
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          // Kuyruk sayfasını açık tutuyorsak güncellesin
          window.dispatchEvent(new CustomEvent('queueUpdated', { 
            detail: { newItem: result.queue_id } 
          }));
        }
        router.refresh();
      }, 100); // Instant!

    } catch (error: any) {
      console.error('❌ Kuyruk ekleme hatası:', error);
      console.log('🔄 setSubmitting(false) çağrılıyor - catch block');
      
      toast({ 
        variant: "destructive", 
        title: "❌ Kuyruk Hatası", 
        description: error.message || "Ürün kuyrukta eklenirken bir hata oluştu." 
      });
    } finally {
      console.log('🏁 Finally block - setSubmitting(false) çağrılıyor');
      setSubmitting(false);
    }
  };

  // Form verilerini handle eden fonksiyon - FİZİKSEL ÖZELLİKLER KALDIRILDI
  const handleSubmit = async (state: "draft" | "active") => {
    // 1. Fiyat Validasyonu
    let isPriceValid = false;
    if (hasVariations) {
      isPriceValid = variations.some(v => v.is_active && v.price >= 0.20);
    } else {
      isPriceValid = price >= 0.20;
    }

    if (!isPriceValid) {
      toast({
        variant: "destructive",
        title: "Geçersiz Fiyat",
        description: "Lütfen en az bir ürün veya varyasyon için 0.20 USD'den yüksek bir fiyat girin.",
      });
      setSubmitting(false);
      return;
    }

    // 2. Diğer Validasyonlar
    if (!title || !shippingProfileId || (productImages || []).length === 0) {
      toast({ variant: "destructive", description: "Başlık, Kargo Profili ve en az bir Resim zorunludur." });
      return;
    }

    setSubmitting(true);
    
    // İşlem başlangıç zamanı
    const startTime = Date.now();

    try {
      // Başlangıç toast mesajı
      toast({ 
        title: "🚀 Etsy'e gönderiliyor...", 
        description: `"${title}" taslak olarak yükleniyor... (Max 15 saniye)` 
      });
      
      const formData = new FormData();

      const listingData: any = {
        // Formdan gelen dinamik değerler
        title,
        description,
        price: hasVariations ? 0 : price, // Varyasyonlu ürünlerde backend hesaplar
        shipping_profile_id: Number(shippingProfileId),
        tags,
        has_variations: hasVariations, // Dinamik varyasyon durumu
        variations: hasVariations ? variations.filter((v: any) => v.is_active) : [], // Aktif varyasyonlar
        state: state, // Buton tarafından belirlenen durum (draft veya active)
        shop_section_id: (() => {
          const shopSectionId = selectedShopSection ? Number(selectedShopSection) : null;
          console.log('🏪 Frontend shop section:', {
            selectedShopSection,
            converted: shopSectionId,
            type: typeof shopSectionId
          });
          return shopSectionId;
        })(),
        
        // --- Kişiselleştirme Ayarları (State'den Al) ---
        is_personalizable: isPersonalizable,
        personalization_is_required: personalizationRequired,
        personalization_instructions: personalizationInstructions,
        personalization_char_count_max: 256, // <-- Etsy için kritik alan

        // --- Etsy'nin İstediği Diğer Zorunlu Alanlar ---
        quantity: quantity, // Dinamik quantity (default 4)
        taxonomy_id: taxonomyId,
        who_made: "i_did",
        when_made: "made_to_order",
        is_supply: false,
        
        // --- Renewal Options (Otomatik Yenileme) ---
        renewal_option: "automatic", // Her ürün otomatik yenileme ile oluşturulur
      };
      
      // Base64'leri JSON'a ekleme - sadece file bilgilerini ekle
      const imageInfoArray: any[] = [];
      for (let i = 0; i < (productImages || []).length; i++) {
        const image = productImages[i];
        if (image.file) {
          imageInfoArray.push({
            type: image.file.type,
            filename: image.file.name,
            position: i,
            size: image.file.size
          });
        }
      }
      
      // Video bilgilerini ekle (dosya olmadan)
      let videoInfo: any = null;
      if (videoFile?.file) {
        console.log('🎥 Video hazırlanıyor:', videoFile.file.name, (videoFile.file.size / 1024 / 1024).toFixed(2), 'MB');
        
        videoInfo = {
          type: videoFile.file.type,
          filename: videoFile.file.name,
          size: videoFile.file.size
        };
        
        console.log('🎥 Video File objesi hazır');
      }

      // Sadece bilgileri listingData'ya ekle (base64 değil)
      listingData.images = imageInfoArray;
      listingData.video = videoInfo;
      
      formData.append('listingData', JSON.stringify(listingData));
      
      // Resim dosyalarını FormData'ya ekle
      for (let i = 0; i < (productImages || []).length; i++) {
        const image = productImages[i];
        if (image.file) {
          formData.append(`imageFile_${i}`, image.file);
        }
      }
      
      // Video dosyasını FormData'ya ekle
      if (videoFile?.file) {
        formData.append('videoFile', videoFile.file);
      }

      // Timeout controller - Video upload için uzun süre
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error('⏰ Request timeout - 3 minutes');
      }, 180000); // 3 dakika timeout (video upload için)
      
      const response = await fetch('/api/etsy/listings/create', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      const result = await response.json();
      
      if (!response.ok) {
        // Özel hata kodlarını kontrol et
        if (result.code === 'NO_ETSY_TOKEN' || result.code === 'INVALID_ETSY_TOKEN') {
          throw new Error('Etsy hesabınız bağlı değil veya bağlantı süresi dolmuş. Lütfen Etsy hesabınızı yeniden bağlayın.');
        } else if (result.code === 'NO_ETSY_STORE') {
          throw new Error('Etsy mağazanız bulunamadı. Lütfen Etsy hesabınızı kontrol edin.');
        } else {
          throw new Error(result.error || 'Sunucu tarafında bilinmeyen bir hata oluştu.');
        }
      }

      // İşlem süresini hesapla
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(1);

      // Başarı mesajı göster
      const stateText = state === 'draft' ? 'taslak olarak' : 'aktif olarak';
      toast({ 
        title: "✅ Etsy'e Yüklendi!", 
        description: `"${title}" ürünü ${duration} saniyede Etsy'e ${stateText} yüklendi!` 
      });

      // Batch processing kontrolü
      if (isBatchMode && selectedFolderFiles.length > 0) {
        const totalImages = selectedFolderFiles.filter(f => f.type.startsWith('image/')).length;
        const remaining = totalImages - processedFileIndex;
        
        if (remaining > 0) {
          // Sonraki batch'i göster
          setTimeout(() => {
            processBatchFromFolder(selectedFolderFiles);
          }, 1000); // 1 saniye bekle
          
          toast({
            title: "🔄 Sonraki Batch Hazırlanıyor",
            description: `${remaining} resim daha var. Sonraki 6 resim yükleniyor...`,
            variant: "default"
          });
          
          // Modal'ı kapatma - açık bırak
          return;
        } else {
          // Tüm batch'ler tamamlandı
          toast({
            title: "🎉 Tüm Batch'ler Tamamlandı",
            description: "Klasördeki tüm resimler başarıyla işlendi!",
            variant: "default"
          });
          
          // Batch processing'i temizle
          setIsBatchMode(false);
          setSelectedFolderFiles([]);
          setProcessedFileIndex(0);
          localStorage.removeItem(FOLDER_FILES_KEY);
          localStorage.removeItem(PROCESSED_INDEX_KEY);
        }
      }

      // Modal'ı kapat (sadece batch mode değilse veya tamamlandıysa)
      onClose();
      
      // Auto mode callback - otomatik işleme devam etmesi için
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
      
      router.refresh();

    } catch (error: any) {
      console.error('Ürün oluşturma hatası:', error);
      
      // Timeout hatası kontrolü
      if (error.name === 'AbortError') {
        toast({ 
          variant: "destructive", 
          title: "⏰ Zaman Aşımı", 
          description: "İşlem 15 saniyede tamamlanamadı. Lütfen tekrar deneyin."
        });
      } else if (error.message && error.message.includes('Etsy')) {
        toast({ 
          variant: "destructive", 
          title: "❌ Etsy Bağlantı Hatası", 
          description: error.message,
          action: (
            <Button variant="outline" size="sm" onClick={() => router.push('/settings')}>
              Ayarlar
            </Button>
          )
        });
      } else {
        toast({ 
          variant: "destructive", 
          title: "❌ Hata Oluştu", 
          description: error.message || "Ürün oluşturulurken bir hata oluştu." 
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Resim bölümü
  const ImageSection = () => (
    <div className="space-y-4">
      {/* Gizli dosya input'ları */}
      <input
        type="file"
        id="image-upload"
        className="hidden"
        accept="image/*"
        multiple
        onChange={(e) => {
          if (e.target.files) {
            const files = Array.from(e.target.files);
            
            // Çok fazla dosya seçildiyse batch mode'a geç
            if (files.length > BATCH_SIZE) {
              console.log('🔄 Batch mode aktif - Toplam dosya:', files.length);
              
              // Alfabetik sırala
              const sortedFiles = files.sort((a, b) => a.name.localeCompare(b.name));
              
              // Batch processing başlat
              setSelectedFolderFiles(sortedFiles);
              setIsBatchMode(true);
              
              // İlk batch'i işle
              processBatchFromFolder(sortedFiles);
              
              // LocalStorage'a dosya isimlerini kaydet (referans için)
              const fileNames = sortedFiles.map(f => f.name);
              localStorage.setItem(FOLDER_FILES_KEY, JSON.stringify(fileNames));
              
            } else {
              // Normal mode: Az dosya varsa hepsini ekle
              console.log('📁 Normal mode - Toplam dosya:', files.length);
              
              const imageFiles = files.filter(f => f.type.startsWith('image/'));
              imageFiles.forEach(file => {
                if (file.type.startsWith('image/')) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const newImage = {
                      file,
                      preview: reader.result as string,
                      uploading: false,
                      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.name}`
                    };
                    setProductImages(prev => [...prev, newImage]);
                  };
                  reader.readAsDataURL(file);
                }
              });
            }
          }
          // Reset input value so the same file can be selected again
          e.target.value = '';
        }}
      />
      <input
        type="file"
        id="video-upload"
        className="hidden"
        accept="video/*"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type.startsWith('video/')) {
              const reader = new FileReader();
              reader.onloadend = () => {
                setVideoFile({
                  file,
                  preview: URL.createObjectURL(file),
                  uploading: false
                });
              };
              reader.readAsDataURL(file);
            }
          }
          // Reset input value so the same file can be selected again
          e.target.value = '';
        }}
      />

      {/* Medya Dosyaları Başlığı ve Sayaçları */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-medium text-gray-900">Medya Dosyaları</h3>
          {isBatchMode && (
            <Badge variant="secondary" className="text-xs">
              Batch Mode: {processedFileIndex}/{selectedFolderFiles.filter(f => f.type.startsWith('image/')).length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center text-xs text-gray-700">
            <Image className="w-3.5 h-3.5 mr-1 text-gray-800" />
            <span>{(productImages || []).length}/10</span>
          </div>
          {videoFile ? (
            <div className="flex items-center text-xs text-gray-700">
              <Video className="w-3.5 h-3.5 mr-1 text-gray-800" />
              <span>1/1</span>
            </div>
          ) : (
            <div className="flex items-center text-xs text-gray-800">
              <Video className="w-3.5 h-3.5 mr-1 opacity-50" />
              <span>0/1</span>
            </div>
          )}
        </div>
      </div>

      {/* SÜRÜKLE-BIRAK ALANI */}
      <div
        className={`border rounded-lg transition-all ${
          (productImages || []).length === 0 && !videoFile 
            ? "border-dashed border-gray-300 bg-gray-50/50 hover:border-primary/40 hover:bg-gray-50" 
            : "border-gray-100 shadow-sm"
        }`}
        onDrop={handleImageDrop}
        onDragOver={e => e.preventDefault()}
        onDragEnter={e => e.preventDefault()}
        onDragLeave={e => e.preventDefault()}
      >
        {(productImages || []).length === 0 && !videoFile ? (
          <div className="text-center py-8 px-4">
            <div className="mx-auto w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Upload className="w-5 h-5 text-gray-700" />
            </div>
            <p className="text-sm font-medium text-gray-900">Dosyaları buraya sürükleyin</p>
            <p className="text-xs text-gray-700 mb-3">veya</p>
            <div className="flex gap-2 justify-center mb-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => document.getElementById('image-upload')?.click()}
              >
                <Image className="w-3.5 h-3.5 mr-1.5" />
                Resim Seç
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => document.getElementById('video-upload')?.click()}
              >
                <Video className="w-3.5 h-3.5 mr-1.5" />
                Video Seç
              </Button>
            </div>
           
            <p className="text-xs text-gray-400 mt-3">
              PNG, JPG, GIF, MP4 • Max. 20MB
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-3">
            {productImages.map((image, index) => (
              <DraggableImage
                key={`${index}-${image.preview}`}
                image={image}
                index={index}
                moveImage={moveImage}
                onRemove={handleRemoveImage}
              />
            ))}
            {videoFile && (
              <div className="relative group rounded-md overflow-hidden border border-gray-100 shadow-sm aspect-square flex items-center justify-center bg-gray-50">
                <video
                  src={videoFile.preview}
                  controls={!videoFile.uploading}
                  className="w-full h-full object-cover"
                  controlsList="nodownload nofullscreen"
                  preload="metadata"
                />
                {!videoFile.uploading && (
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(videoFile.preview);
                      setVideoFile(null);
                    }}
                    className="absolute top-2 right-2 z-10 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                )}
                {videoFile.uploading && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                )}
              </div>
            )}
            {(productImages || []).length < 10 && (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => document.getElementById('image-upload')?.click()}
                  className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-lg p-3 h-full min-h-[100px] hover:bg-gray-50 hover:border-primary/40 transition-colors"
                >
                  <Image className="w-5 h-5 text-gray-400 mb-1" />
                  <span className="text-xs text-gray-700">Resim</span>
                </button>
                {isBatchMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsBatchMode(false);
                      setSelectedFolderFiles([]);
                      setProcessedFileIndex(0);
                      localStorage.removeItem(FOLDER_FILES_KEY);
                      localStorage.removeItem(PROCESSED_INDEX_KEY);
                      toast({
                        title: "Batch Mode Sıfırlandı",
                        description: "Klasör işleme modu kapatıldı.",
                        variant: "default"
                      });
                    }}
                    className="flex flex-col items-center justify-center border border-dashed border-orange-200 rounded-lg p-2 hover:bg-orange-50 hover:border-orange-400 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4 text-orange-600 mb-1" />
                    <span className="text-[10px] text-orange-700">Reset Batch</span>
                  </button>
                )}
                {!videoFile && (
                  <button
                    type="button"
                    onClick={() => document.getElementById('video-upload')?.click()}
                    className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-lg p-3 hover:bg-gray-50 hover:border-primary/40 transition-colors"
                  >
                    <Video className="w-5 h-5 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-700">Video</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Modified varyasyonlar section in the UI
  const VariationsSection = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Varyasyonlar</h3>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="hasVariations"
            checked={hasVariations}
            onCheckedChange={checked => setHasVariations(Boolean(checked))}
          />
          <label
            htmlFor="hasVariations"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Varyasyonlar var
          </label>
        </div>
      </div>

      {hasVariations && (
        <Collapsible className="border rounded-md p-2">
          <CollapsibleTrigger className="flex w-full items-center justify-between p-2 hover:bg-gray-50 rounded-md">
            <span className="text-sm font-medium">Varyasyon Detayları</span>
            <ChevronDown className="h-4 w-4" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            {/* Otomatik Varyasyon Yönetimi */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Hızlı Varyasyon Yönetimi</h4>
              
              {/* Ana İşlemler */}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddAllVariations}
                  className="text-green-700 border-green-200 hover:bg-green-50"
                >
                  ✅ Tümünü Aktifleştir
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDeactivateAll}
                  className="text-red-700 border-red-200 hover:bg-red-50"
                >
                  ❌ Tümünü Kapat
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetVariations}
                  className="text-blue-700 border-blue-200 hover:bg-blue-50"
                >
                  🔄 Sıfırla
                </Button>
              </div>
              
              {/* Pattern Bazlı İşlemler */}
              <div className="space-y-2">
                <p className="text-xs text-gray-600">Pattern bazlı aktifleştir:</p>
                <div className="flex flex-wrap gap-1">
                  {['Roll', 'Standard Canvas', 'White Frame', 'Gold Frame', 'Silver Frame', 'Black Frame'].map(pattern => (
                    <Button
                      key={pattern}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleActivatePattern(pattern)}
                      className="text-xs px-2 py-1 h-auto"
                    >
                      {pattern}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Size</TableHead>
                  <TableHead>Pattern</TableHead>
                  <TableHead className="w-[120px]">Fiyat</TableHead>
                  <TableHead className="w-[80px]">Görünür</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variations.map((variation, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{variation.size}</TableCell>
                    <TableCell>{variation.pattern}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={variation.price === 0 ? '' : variation.price}
                        placeholder="Fiyat"
                        onChange={(e) => handleVariationChange(index, 'price', e.target.value)}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={variation.is_active}
                        onCheckedChange={(checked) => handleVariationChange(index, 'is_active', checked)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );

  // Sabit açıklama bölümleri
  const descriptionParts = {
    headers: [
      "🌟 Personalized Artwork & Fast Shipping 🌟",
      "🌟 Customize Your Canvas with Confidence 🌟",
      "🌟 Made Just for You – Fast & Safe Delivery 🌟",
      "🌟 Custom Orders Made Simple 🌟",
      "🌟 Let's Create Something Unique – Delivered Safely 🌟"
    ],
    intros: [
      `🎨 Want a custom size or have a personal image in mind?
We're here to make it happen! Send us a message to get started on your one-of-a-kind canvas. We'll walk you through the process with care and precision. 💌`,

      `🖼️ Whether you're interested in a specific size or a personalized design, we've got you covered. Just drop us a message, and we'll create a piece tailored to your style.`,

      `💡 Looking to personalize your wall art? We offer custom sizing and design printing! Send us a message, and we'll help you bring your idea to life with a custom order.`,

      `🖌️ Want a different size or your own image turned into canvas art?
It's easy! Message us anytime and we'll guide you through creating your personalized piece.`,

      `🎨 If you need a custom size or want your own image on canvas, we're here to help. Just send us a message, and we'll take care of everything from design to delivery.`
    ],
    shippingTitles: [
      "📦 Delivery with Protection",
      "🚛 Secure Shipping You Can Count On",
      "📦 Careful Packaging – Express Shipping",
      "📦 We Pack with Care – You Receive with Confidence",
      "🚛 Handled with Care, Delivered with Speed"
    ],
    shippingDetails: [
      `Your artwork is handled with the highest level of care:
✔️ Wrapped in protective film
✔️ Cushioned with bubble wrap
✔️ Secured in a durable shipping box`,

      `✔️ Triple-layer packaging: cling film + bubble wrap + sturdy box
✔️ Safe transit guaranteed
✔️ Premium carriers like DHL, FedEx & UPS
✔️ Tracking details provided as soon as it ships
✔️ Delivered in 3–5 working days`,

      `Every canvas is:
✔️ Wrapped tightly in plastic
✔️ Surrounded by bubble wrap for protection
✔️ Packed in thick cardboard for safe travel`,

      `✔️ First layer: cling wrap for moisture protection
✔️ Second layer: bubble wrap for shock absorption
✔️ Final layer: sturdy box for secure delivery`,

      `✔️ Each canvas is carefully wrapped in film
✔️ Protected with a thick layer of bubble wrap
✔️ Shipped inside a strong, protective box`
    ],
    deliveryInfo: [
      `🚚 Shipped with express couriers (FedEx, UPS, or DHL)
🔍 Tracking number always included
⏱️ Delivery time: 3–5 business days`,

      `✔️ Premium carriers like DHL, FedEx & UPS
✔️ Tracking details provided as soon as it ships
✔️ Delivered in 3–5 working days

Your satisfaction and the safety of your artwork are our top priorities!`,

      `🚀 Express delivery via trusted carriers (UPS, FedEx, DHL)
📬 You'll get tracking as soon as it ships
⏳ Average delivery time: 3 to 5 business days`,

      `📦 Shipped using FedEx, DHL, or UPS
🕒 Estimated delivery: 3–5 business days
🔎 Tracking info always provided`,

      `📦 Sent with premium express couriers
📬 Tracking code provided on shipment
🕓 Delivery window: 3 to 5 business days`
    ]
  };

  // Rastgele bir açıklama oluştur
  const generateRandomDescription = () => {
    const randomIndex = Math.floor(Math.random() * 5);
    return `${descriptionParts.headers[randomIndex]}

${descriptionParts.intros[randomIndex]}

━━━━━━━━━━━━━━━━━━

${descriptionParts.shippingTitles[randomIndex]}

${descriptionParts.shippingDetails[randomIndex]}

${descriptionParts.deliveryInfo[randomIndex]}`;
  };

  // This function is removed - unified AI API now handles everything in one call

  // Başlık değişikliğini kontrol eden fonksiyonu güncelle
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newTitle = e.target.value;
    newTitle = cleanTitle(newTitle);
    setTitle(newTitle);
  };

  // Başlığın yanındaki buton için ayrı bir fonksiyon
  const generateTitleOnly = async () => {
    if ((productImages || []).length === 0) {
      toast({
        variant: "destructive",
        title: "Eksik Bilgi",
        description: "Lütfen en az bir resim yükleyin."
      });
      return;
    }

    // Shop sections yüklendiğinden emin ol - geçici olarak devre dışı
    // if (shopSections.length === 0) {
    //   toast({
    //     variant: "destructive",
    //     title: "Kategoriler henüz yüklenmedi",
    //     description: "Lütfen kategoriler yüklenene kadar bekleyin..."
    //   });
    //   return;
    // }

    setAutoTitleLoading(true);
    setTitle("");
    setUserEditedTitle(true);

    try {
      const file = productImages[0].file;
      const formData = new FormData();
      formData.append("image", file);
      console.log('🏪 GenerateTitleOnly - AI\'ye gönderilen kategoriler:', shopSections.length, 'adet');
      formData.append("categories", JSON.stringify(shopSections));
      formData.append("customPrompts", JSON.stringify({}));

      const response = await fetch("/api/ai/analyze-and-generate", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      
      if (data.title) {
        setTitle(cleanTitle(data.title.trim()));
        setAutoTitleUsed(true);
        
        // Etiketleri de ayarla
        if (data.tags && Array.isArray(data.tags)) {
          setTags(data.tags.slice(0, 13));
        }
        
        // Kategoriyi de ayarla
        if (data.suggestedCategoryId) {
          console.log('🔍 GenerateTitleOnly - Kategori seçimi:', {
            suggestedCategoryId: data.suggestedCategoryId,
            shopSectionsLength: shopSections.length
          });
          setSelectedShopSection(data.suggestedCategoryId.toString());
        }
      } else {
        throw new Error("Başlık üretilemedi");
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Başlık oluşturulamadı" });
    } finally {
      setAutoTitleLoading(false);
    }
  };

  // Focus başlık üretici fonksiyon - geliştirildi
  const handleFocusTitle = async () => {
    console.log('🎯 Focus başlık üretimi başlatılıyor...', {
      titleInput: titleInput.trim(),
      hasImage: (productImages || []).length > 0,
      imageFile: !!(productImages || [])[0]?.file
    });
    
    if (!titleInput.trim() || (productImages || []).length === 0 || !(productImages || [])[0]?.file) {
      toast({
        variant: "destructive",
        title: "Eksik Bilgi", 
        description: "Lütfen focus kelimesi girin ve en az bir resim yükleyin."
      });
      return;
    }

    // Shop sections yüklendiğinden emin ol - geçici olarak devre dışı
    // if (shopSections.length === 0) {
    //   toast({
    //     variant: "destructive",
    //     title: "Kategoriler henüz yüklenmedi",
    //     description: "Lütfen kategoriler yüklenene kadar bekleyin..."
    //   });
    //   return;
    // }

    setTitle("");
    setUserEditedTitle(true);
    setFocusStatus("Focus başlık üretiliyor...");
    setFocusTitleLoading(true);

    try {
      const file = productImages[0].file;
      const formData = new FormData();
      formData.append("image", file);
      console.log('🏪 Focus - AI\'ye gönderilen kategoriler:', shopSections.length, 'adet');
      formData.append("categories", JSON.stringify(shopSections));
      
      // Custom prompt for focus
      const customPrompts = {
        title: `TASK: Generate a single, SEO-optimized, high-conversion Etsy product title for a physical canvas wall art print based on this image.

FOCUS KEYWORD: "${titleInput.trim()}"

REQUIREMENTS:
- Maximum 140 characters
- MUST include the focus keyword: "${titleInput.trim()}"
- Include primary keyword: "canvas wall art" or "wall decor"
- Include 2-3 relevant style descriptors (modern, minimalist, abstract, etc.)
- Include room/space keywords (living room, bedroom, office, etc.)
- Must be in English
- Focus on physical canvas prints, not digital downloads

OUTPUT FORMAT:
Return only the title, no quotes, no explanations.`
      };
      
      formData.append("customPrompts", JSON.stringify(customPrompts));

      console.log('📤 Focus için API çağrısı yapılıyor...');
      const response = await fetch("/api/ai/analyze-and-generate", {
        method: "POST",
        body: formData,
      });

      console.log('📥 Focus API yanıtı alındı:', response.status, response.ok);
      const data = await response.json();
      console.log('📋 Focus API data:', data);
      
      if (data.success === false || data.error) {
        console.error('❌ Focus API Error:', data.error);
        setFocusStatus("API Hatası!");
        toast({ 
          variant: "destructive", 
          title: "Focus AI Hatası", 
          description: data.error || "Focus başlık üretilemedi" 
        });
        return;
      }
      
      if (data.title) {
        const generatedTitle = cleanTitle(data.title.trim());
        console.log('✅ Focus başlık üretildi:', generatedTitle);
        setTitle(generatedTitle);
        setFocusStatus("Başarılı!");
        setAutoTitleUsed(true);
        
        // Etiketleri de ayarla
        if (data.tags && Array.isArray(data.tags)) {
          setTags(data.tags.slice(0, 13));
          console.log('✅ Focus etiketler güncellendi:', data.tags.length);
        }
        
        // Kategoriyi de ayarla
        if (data.suggestedCategoryId) {
          console.log('🔍 Focus - Kategori seçimi:', {
            suggestedCategoryId: data.suggestedCategoryId,
            shopSectionsLength: shopSections.length,
            currentSelectedShopSection: selectedShopSection
          });
          setSelectedShopSection(data.suggestedCategoryId.toString());
          console.log('✅ Focus kategori güncellendi:', data.suggestedCategoryId);
        }
      } else {
        console.log('❌ Focus API\'den başlık alınamadı');
        setFocusStatus("Başlık bulunamadı!");
        throw new Error("Başlık üretilemedi");
      }

    } catch (error) {
      setFocusStatus("Hata oluştu");
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Focus başlık oluşturulamadı"
      });
    } finally {
      setFocusTitleLoading(false);
    }
  };

  // Form açıldığında focus alanını temizle
  useEffect(() => {
    setTitleInput("");
  }, [isOpen]);

  // Başlık otomatik üretildiyse artık unified API kullandığımız için ayrı çağrı yapmıyoruz
  useEffect(() => {
    if (autoTitleUsed && title) {
      setAutoTitleUsed(false); // Reset flag
    }
  }, [title, autoTitleUsed]);

  // Modal açıldığında autoTitleUsed'u sıfırla
  useEffect(() => {
    if (isOpen) setAutoTitleUsed(false);
  }, [isOpen]);

  // Modal açıldığında userEditedTitle'ı sıfırla
  useEffect(() => {
    if (isOpen) setUserEditedTitle(false);
  }, [isOpen]);

  // QWE tuş kombinasyonu ile taslak kaydetme
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      setPressedKeys(prev => new Set([...prev, e.key.toLowerCase()]));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      setPressedKeys(prev => {
        const newKeys = new Set(prev);
        newKeys.delete(e.key.toLowerCase());
        return newKeys;
      });
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keyup', handleKeyUp);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen]);

  // QWE kombinasyonu kontrolü
  useEffect(() => {
    if (pressedKeys.has('q') && pressedKeys.has('w') && pressedKeys.has('e') && isOpen) {
      if (submitting) return;

      // Basit validasyon kontrolü
      if (!title || !shippingProfileId || (productImages || []).length === 0) {
        toast({
          variant: "destructive",
          title: "⚠️ Eksik Bilgiler",
          description: "QWE: Başlık, kargo profili ve en az bir resim gerekli!"
        });
        return;
      }

      console.log('QWE basıldı - taslak kaydediliyor...');
      toast({
        title: "🚀 QWE Taslak Kaydetme",
        description: "Ürün taslak olarak kaydediliyor..."
      });
      
      handleSubmit("draft");
      setPressedKeys(new Set()); // Tuşları sıfırla
    }
  }, [pressedKeys, isOpen, submitting, title, shippingProfileId, (productImages || []).length]);

  return (
    <>
      {/* Custom Toast Container - Sağ üst köşede */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
        {toastMessages.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto transform transition-all duration-300 ease-in-out
              animate-in slide-in-from-right-5 fade-in
              max-w-sm p-4 rounded-lg shadow-lg border
              ${toast.type === "success" ? "bg-green-50 border-green-200 text-green-800" : 
                toast.type === "error" ? "bg-red-50 border-red-200 text-red-800" : 
                "bg-blue-50 border-blue-200 text-blue-800"}
            `}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {toast.type === "success" && <span className="text-green-500">✅</span>}
                {toast.type === "error" && <span className="text-red-500">❌</span>}
                {toast.type === "info" && <span className="text-blue-500">ℹ️</span>}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{toast.message}</p>
                <p className="text-xs opacity-60 mt-1">
                  {new Date(toast.timestamp).toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={() => setToastMessages(prev => prev.filter(t => t.id !== toast.id))}
                className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={isOpen && !isEmbedded}
        onOpenChange={(open) => {
          console.log('🔍 Dialog onOpenChange:', open);
          if (!open) {
            // Force close all modal states
            document.body.style.pointerEvents = 'auto';
            document.body.style.overflow = 'auto';
            handleCloseModal();
          } else {
            setTitle("");
            setAutoTitleUsed(false);
            setUserEditedTitle(false);
          }
        }}
        modal={true}
      >
        <DialogTrigger asChild>
          {/* DialogTrigger content */}
        </DialogTrigger>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col bg-white">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center justify-between">
                <span>
                  {isEditMode ? `Kuyruk Ürünü Düzenle: ${initialData?.title || 'Ürün'}` : 
                   product ? `Ürünü Düzenle: ${product.title}` : "Yeni Ürün Ekle"}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">İlerleme:</span>
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${formProgress}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{formProgress}%</span>
                </div>
              </DialogTitle>
              <DialogDescription className="flex items-center justify-between">
                <span>{product ? "Bu ürünün detaylarını düzenleyin." : "Yeni bir ürün ekleyin."} • <kbd className="px-1 py-0.5 text-xs bg-gray-100 rounded">Q+W+E</kbd> ile taslak kaydet</span>
              </DialogDescription>
            </DialogHeader>

            {/* Step Indicator */}
            <div className="flex-shrink-0 px-6 py-3 border-b bg-gray-50">
              <div className="flex items-center justify-between max-w-2xl mx-auto">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex flex-col items-center ${currentStep >= step.id ? 'text-blue-600' : 'text-gray-400'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium transition-all ${
                        currentStep >= step.id 
                          ? 'bg-blue-100 text-blue-600 border-2 border-blue-500' 
                          : 'bg-gray-100 text-gray-400 border-2 border-gray-300'
                      }`}>
                        {currentStep > step.id ? '✓' : step.icon}
                      </div>
                      <div className="mt-1 text-xs font-medium">{step.name}</div>
                      <div className="text-xs text-gray-700 max-w-20 text-center">{step.description}</div>
                    </div>
                    {index < (steps || []).length - 1 && (
                      <div className={`w-16 h-0.5 mx-2 transition-all ${
                        currentStep > step.id ? 'bg-blue-500' : 'bg-gray-300'
                      }`}></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6">
              <div className="space-y-4 py-4">
                {/* Video Reminder Alert */}
                {shouldShowVideoReminder && (
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-4 animate-in slide-in-from-top-5 fade-in">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <Video className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-blue-800 mb-1">
                          🎬 Video Eklemeyi Unutmayın!
                        </h4>
                        <p className="text-sm text-blue-700 mb-3">
                          {(productImages || []).length} resminiz var ama video yok. Video eklemek ürününüzün satış şansını artırır!
                        </p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 border-blue-300 text-blue-700 hover:bg-blue-100"
                            onClick={() => document.getElementById('video-upload')?.click()}
                          >
                            <Video className="w-4 h-4 mr-1" />
                            Video Ekle
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 text-blue-600 hover:bg-blue-100"
                            onClick={() => {
                              setExpandedSections(prev => ({ ...prev, media: false }));
                            }}
                          >
                            Daha Sonra
                          </Button>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="flex-shrink-0 text-blue-400 hover:text-blue-600"
                        onClick={() => {
                          setExpandedSections(prev => ({ ...prev, media: false }));
                        }}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Resim Bölümü */}
                <ImageSection />

                <Separator />
                
                {/* Temel Bilgiler Bölümü */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Temel Bilgiler</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <Label htmlFor="title" className="block">
                          Başlık <span className="text-red-500">*</span>
                        </Label>
                        <PromptEditor 
                          promptId="title-prompt" 
                          onPromptUpdate={() => {
                            // Re-generate title with new prompt if image exists
                            if (productImages.length > 0 && !userEditedTitle) {
                              generateTitleOnly();
                            }
                          }}
                        />
                      </div>
                      <div className="flex-1 flex gap-2 items-center">
                        <Input
                          id="title"
                          value={title}
                          onChange={handleTitleChange}
                          placeholder="Ürün başlığı"
                          className="flex-1"
                          maxLength={160}
                        />
                        {/* Karakter sayacı */}
                        <span className={`text-xs ${(title || '').length > 140 ? 'text-red-500 font-medium' : 'text-gray-700'}`}>
                          {(title || '').length}/140 {(title || '').length > 140 && `(+${(title || '').length - 140})`}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={generateTitleOnly}
                          title="Başlığı Değiştir"
                          disabled={autoTitleLoading || productImages.length === 0}
                        >
                          {autoTitleLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {/* MAVİ RENK İLE LOADING MESAJI */}
                      {autoTitleLoading && (
                        <div className="text-xs text-blue-500 mt-1">Yeni başlık üretiliyor...</div>
                      )}
                      {/* Focus alanı ve buton */}
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={titleInput}
                          onChange={(e) => setTitleInput(e.target.value)}
                          placeholder="Başlık için anahtar kelimeler (Focus)"
                          className="w-64"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleFocusTitle}
                          disabled={focusTitleLoading || !titleInput.trim() || productImages.length === 0}
                        >
                          {focusTitleLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Wand2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {focusStatus && (
                        <p className="text-sm text-muted-foreground">{focusStatus}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="price" className="block mb-1">
                        Fiyat <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex items-center">
                        <span className="mr-2">$</span>
                        <Input
                          id="price"
                          type="number"
                          value={price}
                          onChange={(e) => setPrice(parseFloat(e.target.value))}
                          disabled={hasVariations}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="quantity" className="block mb-1">
                        Adet / Stok Miktarı <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="quantity"
                        type="number"
                        value={quantity}
                        disabled
                        className="w-full"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="description" className="block mb-1">
                        Açıklama <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex-1 flex gap-2 items-center">
                        <Textarea
                          id="description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Ürün açıklaması"
                          className="min-h-[150px]"
                        />
                        <div className="flex flex-col items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="border border-gray-300 hover:bg-gray-100 rounded-md"
                            title="Rastgele Açıklama İste"
                            disabled={autoDescriptionLoading}
                            onClick={() => {
                              try {
                                setAutoDescriptionLoading(true);
                                const randomDescription = generateRandomDescription();
                                setDescription(randomDescription);
                              } catch (e) {
                                toast({ variant: "destructive", title: "Açıklama oluşturulamadı" });
                              } finally {
                                setAutoDescriptionLoading(false);
                              }
                            }}
                          >
                            {autoDescriptionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                          </Button>
                          <span className="text-xs text-gray-700">Rastgele Açıklama İste</span>
                        </div>
                      </div>
                    </div>

                    {/* Kategori seçimi */}
                    <div className="col-span-2">
                      <Label htmlFor="category" className="block mb-1">Kategori *</Label>
                      <Select
                        value={taxonomyId ? taxonomyId.toString() : WALL_DECOR_TAXONOMY_ID.toString()}
                        onValueChange={(val) => setTaxonomyId(Number(val))}
                        required
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>{taxonomyId === DIGITAL_PRINTS_TAXONOMY_ID ? "Digital Prints" : "Wall Decor"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={WALL_DECOR_TAXONOMY_ID.toString()}>Wall Decor</SelectItem>
                          <SelectItem value={DIGITAL_PRINTS_TAXONOMY_ID.toString()}>Digital Prints</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Shop Section seçimi */}
                    <div className="col-span-2">
                      <Label htmlFor="shopSection">Kanvas Kategorileri</Label>
                      <Select
                        value={selectedShopSection}
                        onValueChange={handleShopSectionChange}
                        disabled={loadingShopSections || (shopSections || []).length === 0}
                      >
                        <SelectTrigger id="shopSection">
                          <SelectValue placeholder={
                            loadingShopSections 
                              ? "Kategoriler yükleniyor..." 
                              : (shopSections || []).length === 0
                              ? "Kategori bulunamadı"
                              : "Bir kategori seçin..."
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {shopSections.map(section => (
                            <SelectItem 
                              key={section.shop_section_id} 
                              value={section.shop_section_id.toString()}
                            >
                              {section.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Etiketler ve Malzemeler */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Etiketler & Malzemeler</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="block">
                          Etiketler <span className="text-gray-700 text-sm">(0-13)</span>
                        </Label>
                        <PromptEditor 
                          promptId="tags-prompt"
                          onPromptUpdate={() => {
                            // Re-generate tags with new prompt if title exists
                            if (title) {
                              // Call tags generation function here if needed
                            }
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                          className="mr-2"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="border border-gray-300 hover:bg-gray-100 rounded-md"
                          title="Yeni Etiket İste"
                          disabled={autoTagsLoading || !title}
                          onClick={async () => {
                            if (!title) return;
                            try {
                              setAutoTagsLoading(true);
                              
                              // Use the tags prompt from prompts.ts
                              const tagsPromptConfig = getPromptById('tags-prompt');
                              let prompt = tagsPromptConfig?.prompt || 'Generate 13 Etsy tags for this product title.';
                              prompt = prompt.replace('${title}', title);
                              
                              const res = await fetch("/api/ai/generate-text", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ 
                                  prompt: prompt,
                                  maxTokens: 200 
                                }),
                              });
                              const data = await res.json();
                              
                              if (data.text) {
                                // Parse comma-separated tags
                                const tagsText = data.text.trim();
                                const parsedTags = tagsText.split(',').map((tag: string) => tag.trim().toLowerCase()).filter((tag: string) => tag.length > 0);
                                
                                // Karakter sınırı kontrolü ve otomatik temizleme
                                // Özel karakterleri de temizle
                                const validTags = parsedTags
                                  .map(tag => cleanTagText(tag))
                                  .filter(tag => tag && tag.length <= 20);
                                
                                const invalidTags = parsedTags.filter(tag => !cleanTagText(tag) || cleanTagText(tag).length > 20);
                                
                                if (invalidTags.length > 0) {
                                  toast({ 
                                    variant: "default", 
                                    title: "Geçersiz Etiketler Temizlendi", 
                                    description: `${invalidTags.length} adet geçersiz etiket otomatik olarak silindi: ${invalidTags.slice(0,3).join(', ')}${invalidTags.length > 3 ? '...' : ''}` 
                                  });
                                }
                                
                                setTags(validTags.slice(0, 13));
                                
                                // Eğer geçerli etiket sayısı 13'ten azsa, yeni etiket iste
                                if (validTags.length < 13) {
                                  const neededTags = 13 - validTags.length;
                                  toast({ 
                                    variant: "default", 
                                    title: "Ek Etiket Gerekli", 
                                    description: `${neededTags} adet daha etiket eklemek için tekrar "Yeni Etiket İste" butonuna tıklayın.` 
                                  });
                                }
                              } else if (data.error) {
                                toast({ variant: "destructive", title: data.error });
                              }
                            } catch (e) {
                              toast({ variant: "destructive", title: "Etiketler oluşturulamadı" });
                            } finally {
                              setAutoTagsLoading(false);
                            }
                          }}
                        >
                          {autoTagsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TagIcon className="w-4 w-4" />}
                        </Button>
                        <span className="text-xs text-gray-700 ml-1">Yeni Etiket İste</span>
                      </div>
                      {autoTagsLoading && (
                        <div className="text-xs text-blue-500 mt-1">Başlığa göre etiketler üretiliyor...</div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2 min-h-[40px]">
                      {tags.map((tag, index) => (
                        <Badge key={index} className="px-3 py-1 flex items-center gap-1">
                          <span>{tag}</span>
                          <span className="ml-1 text-xs" style={{ color: (tag || '').length > 20 ? '#dc2626' : '#6b7280' }}>
                            ({(tag || '').length})
                          </span>
                          <X 
                            className="h-3 w-3 cursor-pointer ml-1" 
                            onClick={() => handleRemoveTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-gray-700 mt-1">
                      {(tags || []).length}/13 etiket eklendi
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Malzemeler */}
                <div>
                  <Label className="block mb-2">
                    Malzemeler
                  </Label>
                  <div className="text-sm text-gray-800 bg-gray-100 p-2 rounded border border-gray-200">
                    <p>Bu ürün için kullanılan malzemeler:</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {DEFAULT_MATERIALS.map((material, i) => (
                        <Badge key={i} variant="secondary" className="px-3 py-1">
                          {material}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Kargo ve İşlem Profilleri */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Kargo & İşlem Profilleri</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="shipping" className="block mb-1">
                        Kargo Profili <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={shippingProfileId}
                        onValueChange={setShippingProfileId}
                        disabled={loadingShippingProfiles || (shippingProfiles || []).length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={
                            loadingShippingProfiles
                              ? "Kargo profilleri yükleniyor..."
                              : (shippingProfiles || []).length === 0
                              ? "Kargo profili bulunamadı"
                              : "Kargo profili seçin"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {shippingProfiles.map((profile) => (
                            <SelectItem
                              key={profile.shipping_profile_id}
                              value={profile.shipping_profile_id.toString()}
                            >
                              {profile.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />
                
                {/* Varyasyonlar */}
                <VariationsSection />

                <Separator />

                {/* Kişiselleştirme Ayarları (Sabit ve Değiştirilemez) */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Kişiselleştirme</h3>
                  <div className="p-4 border rounded-md bg-slate-50 space-y-4">
                    {/* Kişiselleştirme Her Zaman Aktif ve Değiştirilemez */}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isPersonalizable"
                        checked={true}
                        disabled={true}
                      />
                      <label
                        htmlFor="isPersonalizable"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Bu ürün kişiselleştirilebilir (Her zaman aktif)
                      </label>
                    </div>
                    {/* Kişiselleştirme Her Zaman İsteğe Bağlı ve Değiştirilemez */}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="personalizationRequired"
                        checked={false}
                        disabled={true}
                      />
                      <label
                        htmlFor="personalizationRequired"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Kişiselleştirme zorunlu olsun (Her zaman isteğe bağlı)
                      </label>
                    </div>
                    {/* Talimat Metni Sabit ve Değiştirilemez */}
                    <div>
                      <Label htmlFor="personalizationInstructions" className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Alıcı için talimatlar (Sabit Metin)
                      </Label>
                      <Textarea
                        id="personalizationInstructions"
                        value={PERSONALIZATION_INSTRUCTIONS}
                        readOnly={true}
                        className="mt-1 bg-gray-100 cursor-not-allowed"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex justify-between mt-6">
                <div>
                  <Button variant="outline" onClick={handleCloseModal}>İptal</Button>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleSubmitToQueue} 
                    disabled={submitting}
                    className="bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
                    data-submit-button
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Kuyrukta Ekleniyor...
                      </>
                    ) : (isMounted && countdown !== null) ? (
                      <>⏰ Otomatik Submit: {countdown}s</>
                    ) : (
                      "📋 Kuyrukta Gönder"
                    )}
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={() => handleSubmit("draft")} 
                    disabled={submitting}
                    className="bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100"
                    data-direct-submit-button
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Taslak Kaydediliyor...
                      </>
                    ) : (
                      "🚀 Direkt Etsy'ye Gönder"
                    )}
                  </Button>
                  <Button 
                    onClick={() => handleSubmit("active")} 
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Yayınlanıyor...
                      </>
                    ) : (
                      "Yayınla"
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showUnsavedChangesDialog} onOpenChange={(open) => {
        console.log('🔍 AlertDialog onOpenChange:', open);
        if (!open) {
          // Force close all modal states
          document.body.style.pointerEvents = 'auto';
          document.body.style.overflow = 'auto';
        }
        setShowUnsavedChangesDialog(open);
      }}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Kaydedilmemiş değişiklikler</AlertDialogTitle>
            <AlertDialogDescription>
              Kaydedilmemiş değişiklikleriniz var. Devam ederseniz, bu değişiklikler kaybolacak.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              console.log('🔍 AlertDialog Cancel clicked');
              document.body.style.pointerEvents = 'auto';
              document.body.style.overflow = 'auto';
              setShowUnsavedChangesDialog(false);
            }}>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              console.log('🔍 AlertDialog Action clicked');
              document.body.style.pointerEvents = 'auto';
              document.body.style.overflow = 'auto';
              setShowUnsavedChangesDialog(false);
              setTimeout(() => {
                onClose();
              }, 0);
            }}>
              Değişiklikleri Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ProductFormModal;