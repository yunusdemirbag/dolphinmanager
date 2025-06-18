"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { DndProvider, useDrag, useDrop } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
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
import { Loader2, Plus, X, Image as ImageIcon, Upload, GripVertical, RefreshCw, FileText, Tag as TagIcon, Image, Video, ChevronDown, Wand2, Clock } from "lucide-react"
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
import { createClientSupabase } from "@/lib/supabase";
// ✅ BASIT ÇÖZÜM - Sadece prompt config'leri import et
import { 
  titlePrompt, 
  tagPrompt
} from "@/lib/openai-yonetim";
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

// ✅ HELPER FONKSIYONLAR - Client-side FileReader ile düzeltildi
const generateTitle = async (imageFile: File, setTokenUsage?: any, setGenerationDurations?: any): Promise<string> => {
  console.log("🎯 BAŞLIK ÜRETİMİ BAŞLIYOR...");
  console.log("📁 Dosya boyutu:", Math.round(imageFile.size / 1024), "KB");
  console.log("📁 Dosya tipi:", imageFile.type);
  
  const startTime = Date.now();
  
  try {
    // FileReader ile base64'e çevir (client-side compatible)
    console.log("🔄 Resim base64'e çevriliyor (FileReader)...");
    const base64Image = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // data:image/jpeg;base64,/9j/4AAQ... formatından sadece base64 kısmını al
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageFile);
    });
    
    console.log("✅ Base64 dönüşümü tamamlandı, boyut:", Math.round(base64Image.length / 1024), "KB");
    console.log("📤 Mevcut API endpoint'ine istek gönderiliyor: /api/ai/generate-all");
    
    const response = await fetch("/api/ai/generate-all", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageBase64: base64Image,
        imageType: imageFile.type,
        prompt: titlePrompt.prompt,
        requestType: "title"
      }),
    });
    
    console.log("📥 API yanıtı alındı - Status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API HATASI:");
      console.error("Status:", response.status);
      console.error("StatusText:", response.statusText);
      console.error("Error Body:", errorText);
      
      let errorMessage = "Bilinmeyen hata";
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || "API hatası";
      } catch (e) {
        errorMessage = errorText || "API yanıt hatası";
      }
      
      throw new Error(`API Hatası (${response.status}): ${errorMessage}`);
    }
    
    const data = await response.json();
    console.log("✅ API yanıtı başarılı:", data);
    
    // Süreyi hesapla
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Token kullanım bilgilerini kaydet (eğer varsa)
    if (data.usage && setTokenUsage) {
      setTokenUsage((prev: any) => ({
        ...prev,
        title_prompt_tokens: data.usage.prompt_tokens,
        title_completion_tokens: data.usage.completion_tokens,
        title_total_tokens: data.usage.total_tokens
      }));
    }
    
    // Süreyi kaydet (eğer setGenerationDurations fonksiyonu verilmişse)
    if (setGenerationDurations) {
      setGenerationDurations((prev: any) => ({
        ...prev,
        title: duration
      }));
    }
    
    // Mevcut API'den gelen sonucu analiz et
    const generatedTitle = data.result || data.title || data.analysis?.title;
    
    if (!generatedTitle) {
      console.error("❌ API yanıtında 'title' alanı yok:", data);
      throw new Error("API yanıtında başlık bulunamadı");
    }
    
    console.log("🎉 Başlık başarıyla üretildi:", generatedTitle);
    return generatedTitle;
    
  } catch (error: any) {
    console.error("💥 BAŞLIK ÜRETİM HATASI:");
    console.error("Error type:", typeof error);
    console.error("Error message:", error?.message || "Bilinmeyen hata");
    console.error("Full error:", error);
    throw error;
  }
};

const generateTitleWithFocus = async (imageFile: File, focusKeyword: string): Promise<string> => {
  console.log("🎯 FOCUS BAŞLIK ÜRETİMİ BAŞLIYOR...");
  console.log("🔑 Focus keyword:", focusKeyword);
  
  try {
    // FileReader ile base64'e çevir
    const base64Image = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageFile);
    });
    
    // Focus prompt ile birleştir
    const focusPrompt = `Focus keyword: "${focusKeyword}"\n\n${titlePrompt.prompt}`;
    
    const response = await fetch("/api/ai/generate-all", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageBase64: base64Image,
        imageType: imageFile.type,
        prompt: focusPrompt,
        requestType: "focus-title"
      }),
    });
    
    console.log("📥 Focus API yanıtı - Status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ FOCUS API HATASI:", errorText);
      throw new Error(`Focus API Hatası (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    const generatedTitle = data.result || data.title || data.analysis?.title;
    console.log("✅ Focus başlık üretildi:", generatedTitle);
    return generatedTitle || "";
    
  } catch (error: any) {
    console.error("💥 FOCUS BAŞLIK HATASI:", error);
    throw error;
  }
};

const generateTags = async (title: string, setTokenUsage?: any, setGenerationDurations?: any, imageFile?: File): Promise<string[]> => {
  console.log("🏷️ TAG ÜRETİMİ BAŞLIYOR...");
  console.log("📝 Başlık:", title);
  
  const startTime = Date.now();
  
  try {
    const response = await fetch("/api/ai/generate-etsy-tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        prompt: tagPrompt.prompt,
      }),
    });
    
    console.log("📥 Tag API yanıtı - Status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ TAG API HATASI:", errorText);
      throw new Error(`Tag API Hatası (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    
    // Süreyi hesapla
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Token kullanım bilgilerini kaydet (eğer varsa)
    if (data.usage && setTokenUsage) {
      setTokenUsage((prev: any) => ({
        ...prev,
        tags_prompt_tokens: data.usage.prompt_tokens,
        tags_completion_tokens: data.usage.completion_tokens,
        tags_total_tokens: data.usage.total_tokens
      }));
    }
    
    // Süreyi kaydet (eğer setGenerationDurations fonksiyonu verilmişse)
    if (setGenerationDurations) {
      setGenerationDurations((prev: any) => ({
        ...prev,
        tags: duration
      }));
    }
    
    console.log("✅ Tag'ler üretildi:", data.tags);
    return data.tags || [];
    
  } catch (error: any) {
    console.error("💥 TAG ÜRETİM HATASI:", error);
    throw error;
  }
};

const selectCategory = async (title: string, categoryNames: string[], setTokenUsage?: any, setGenerationDurations?: any): Promise<string> => {
  console.log("🔖 KATEGORİ SEÇİMİ BAŞLIYOR...");
  console.log("📝 Başlık:", title);
  console.log("📋 Kategori sayısı:", categoryNames.length);
  
  const startTime = Date.now();
  
  try {
    const response = await fetch("/api/ai/select-category", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        categoryNames,
      }),
    });
    
    console.log("📥 Kategori API yanıtı - Status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ KATEGORİ API HATASI:", errorText);
      throw new Error(`Kategori API Hatası (${response.status}): ${errorText}`);
    }
    
    const selectedCategory = await response.text();
    
    // Süreyi hesapla
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Token kullanımını direkt olarak alamıyoruz çünkü API text döndürüyor
    // Ancak süreyi kaydedebiliriz
    if (setGenerationDurations) {
      setGenerationDurations((prev: any) => ({
        ...prev,
        category: duration
      }));
    }
    
    console.log("✅ Kategori seçildi:", selectedCategory);
    return selectedCategory.trim();
    
  } catch (error: any) {
    console.error("💥 KATEGORİ SEÇİM HATASI:", error);
    throw error;
  }
};

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
  shippingProfiles: ShippingProfile[]
  loadingShippingProfiles: boolean
  processingProfiles?: EtsyProcessingProfile[]
  loadingProcessingProfiles?: boolean
  showEtsyButton?: boolean
  onSubmit?: (productData: Partial<Product>, state?: "draft" | "active") => Promise<CreateListingResponse>
  submitting?: boolean
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
        <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-xs">
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
}

export function ProductFormModal({
  isOpen,
  onClose,
  product,
  shippingProfiles,
  loadingShippingProfiles,
  processingProfiles,
  loadingProcessingProfiles,
  showEtsyButton = false,
  onSubmit,
  submitting: externalSubmitting,
}: ProductFormModalProps) {
  // All useState declarations at the top
  const { toast } = useToast()
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false)
  const [title, setTitle] = useState(product?.title || "")
  const [titleInput, setTitleInput] = useState("")
  const [description, setDescription] = useState(product?.description || "")
  const [price, setPrice] = useState(product?.price?.amount || 0)
  const [quantity, setQuantity] = useState(4)
  const [shippingProfileId, setShippingProfileId] = useState(
    product?.shipping_profile_id?.toString() || ""
  )

  // İç state için submitting
  const [internalSubmitting, setInternalSubmitting] = useState(false)
  
  // Dışarıdan gelen veya içeride yönetilen submitting durumu
  const isSubmitting = externalSubmitting !== undefined ? externalSubmitting : internalSubmitting;

  // Additional fields to match Etsy
  const [tags, setTags] = useState<string[]>(product?.tags || [])
  const [newTag, setNewTag] = useState("")
  const [isPersonalizable, setIsPersonalizable] = useState(true)
  const [personalizationRequired, setPersonalizationRequired] = useState(false)
  const [personalizationInstructions, setPersonalizationInstructions] = useState(
    'Phone Number for Delivery'
  )
  const [taxonomyId, setTaxonomyId] = useState(product?.taxonomy_id || WALL_DECOR_TAXONOMY_ID);
  
  const [hasVariations, setHasVariations] = useState<boolean>(true);
  const [variations, setVariations] = useState(product?.variations || predefinedVariations)
  const [shopSections, setShopSections] = useState<{ shop_section_id: number; title: string }[]>([]);
  const [selectedShopSection, setSelectedShopSection] = useState<string>('');
  
  // Ürün görselleri için state
  const [productImages, setProductImages] = useState<MediaFile[]>([])
  const [videoFile, setVideoFile] = useState<MediaFile | null>(null)

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

  // Form progress calculation
  useEffect(() => {
    let progress = 0;
    const totalFields = 8;
    
    if (productImages.length > 0) progress += 1;
    if (title.length > 10) progress += 1;
    if (description.length > 50) progress += 1;
    if (price > 0 || (hasVariations && variations.some(v => v.price > 0))) progress += 1;
    if (tags.length > 3) progress += 1;
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
  const shouldShowVideoReminder = productImages.length >= 3 && !videoFile;

  // Validation states
  const fieldValidation = {
    media: productImages.length > 0 ? 'valid' : 'invalid',
    title: title.length > 10 ? 'valid' : title.length > 0 ? 'warning' : 'invalid',
    description: description.length > 50 ? 'valid' : description.length > 0 ? 'warning' : 'invalid',
    price: (price > 0 || (hasVariations && variations.some(v => v.price > 0))) ? 'valid' : 'invalid',
    tags: tags.length > 3 ? 'valid' : tags.length > 0 ? 'warning' : 'invalid'
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

  // Dükkan bölümlerini API'den çekmek için useEffect
  useEffect(() => {
    if (isOpen) {
      async function loadShopSections() {
        try {
          const response = await fetch('/api/etsy/shop-sections');
          const data = await response.json();
          if (response.ok && data.sections) {
            setShopSections(data.sections);
          }
        } catch (error) { 
          console.error("Dükkan bölümleri yüklenemedi:", error);
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
      setHasVariations(product?.variations ? product.variations.length > 0 : true);
      const initialVariations = product?.variations && product.variations.length > 0 
        ? product.variations 
        : predefinedVariations;
      setVariations(initialVariations);
      if (product?.images?.length) {
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
    if (isOpen && !product && shippingProfiles.length > 0) {
      setShippingProfileId(shippingProfiles[0].shipping_profile_id.toString());
    }
  }, [isOpen, product, shippingProfiles]);

  // Başlık değişimini debounce ile geciktir
  const debouncedTitle = useDebounce(title, 1000); // 1 saniye debounce

  // hasUnsavedChanges fonksiyonunu güncelle
  const hasUnsavedChanges = () => {
    return (
      title !== "" ||
      description !== "" ||
      price !== 0 ||
      quantity !== 4 ||
      shippingProfileId !== "" ||
      tags.length > 0 ||
      productImages.length > 0
    );
  };

  // Modal kapatılırken değişiklik varsa onay sor
  const handleCloseModal = () => {
    if (hasUnsavedChanges()) {
      setShowUnsavedChangesDialog(true);
    } else {
      onClose();
    }
  };

  // Tag ekleme
  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag("");
    }
  }

  // Tag silme
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  }

  // Resim yükleme işleyicileri
  const handleImageDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    const videoFiles = files.filter(f => f.type.startsWith('video/'));
    if (productImages.length + imageFiles.length > 10) {
      toast({ title: "Maksimum Resim Limiti", description: "En fazla 10 resim yükleyebilirsiniz.", variant: "destructive" });
    } else {
      const newImages = imageFiles.map(file => ({ file, preview: URL.createObjectURL(file), uploading: false }));
      setProductImages(prev => [...prev, ...newImages]);
    }
    if (videoFiles.length > 0) {
      if (videoFile) URL.revokeObjectURL(videoFile.preview);
      setVideoFile({ file: videoFiles[0], preview: URL.createObjectURL(videoFiles[0]), uploading: false });
    }
  }, [productImages.length, videoFile, toast]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    const videoFiles = files.filter(f => f.type.startsWith('video/'));
    if (productImages.length + imageFiles.length > 10) {
      toast({ title: "Maksimum Resim Limiti", description: "En fazla 10 resim yükleyebilirsiniz.", variant: "destructive" });
    } else {
      const newImages = imageFiles.map(file => ({ file, preview: URL.createObjectURL(file), uploading: false }));
      setProductImages(prev => [...prev, ...newImages]);
    }
    if (videoFiles.length > 0) {
      if (videoFile) URL.revokeObjectURL(videoFile.preview);
      setVideoFile({ file: videoFiles[0], preview: URL.createObjectURL(videoFiles[0]), uploading: false });
    }
    e.target.value = '';
  }, [productImages.length, videoFile, toast]);

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

  // productImages değiştiğinde autoTitleUsed'u sıfırla
  useEffect(() => {
    setAutoTitleUsed(false);
  }, [productImages]);

  // Yardımcı fonksiyon: Başta/sonda özel karakter/noktalama temizle
  const cleanTitle = (raw: string) => {
    // Başta ve sonda ! . * : , ? ; ' " - _ ( ) [ ] { } gibi karakterleri sil
    return raw.replace(/^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+|[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/g, '').trim();
  };

  // ✅ OPTİMİZE EDİLMİŞ - Resim yüklendiğinde başlık üret
  useEffect(() => {
    if (isOpen && productImages.length > 0 && !title && !autoTitleUsed && !userEditedTitle) {
      const generateAutoTitle = async () => {
        setAutoTitleLoading(true);
        try {
          const generatedTitle = await generateTitle(productImages[0].file);
          if (generatedTitle) {
            const cleanedTitle = cleanTitle(generatedTitle.trim());
            setTitle(cleanedTitle);
            setAutoTitleUsed(true);
          }
        } catch (e) {
          toast({ variant: "destructive", title: "Başlık üretilemedi", description: "Görselden başlık oluşturulamadı." });
        } finally {
          setAutoTitleLoading(false);
        }
      };
      generateAutoTitle();
    }
  }, [productImages, isOpen, title, autoTitleUsed, userEditedTitle]);

  // Shop section select değiştiğinde otomatik güncellemeyi kapat
  const handleShopSectionChange = (val: string) => {
    setSelectedShopSection(val);
    setShopSectionAutoSelected(false); // Manuel seçim yapıldığında otomatiği kapat
    console.log('Manuel kategori seçimi:', val);
  };

  // ✅ OPTİMİZE EDİLMİŞ - Başlık değiştiğinde en uygun mağaza kategorisini otomatik seç
  useEffect(() => {
    if (!title || !shopSections.length || !shopSectionAutoSelected) return;
    
    const timer = setTimeout(async () => {
      try {
        console.log('Otomatik kategori seçimi başlatılıyor:', title);
        const categoryNames = shopSections.map(s => s.title);
        
        const selectedCategory = await selectCategory(title, categoryNames, productImages[0]?.file);
        console.log('AI kategori yanıtı:', selectedCategory);
        
        // Tam eşleşme ara
        let matchedSection = shopSections.find(
          s => s.title.trim().toLowerCase() === selectedCategory.toLowerCase()
        );
        
        // Kısmi eşleşme ara (fallback)
        if (!matchedSection) {
          matchedSection = shopSections.find(s =>
            s.title.toLowerCase().includes(selectedCategory.toLowerCase()) ||
            selectedCategory.toLowerCase().includes(s.title.toLowerCase())
          );
        }
        
        // Varsayılan kategoriler için fallback
        if (!matchedSection) {
          const fallbackKeywords = ["modern", "abstract", "art", "animal"];
          matchedSection = shopSections.find(s =>
            fallbackKeywords.some(keyword =>
              s.title.toLowerCase().includes(keyword)
            )
          );
        }
        
        // Son çare: ilk kategoriyi seç
        if (!matchedSection && shopSections.length > 0) {
          matchedSection = shopSections[0];
        }
        
        if (matchedSection) {
          console.log('Kategori seçildi:', matchedSection.title);
          setSelectedShopSection(matchedSection.shop_section_id.toString());
        }
      } catch (error) {
        console.error('Kategori seçimi hatası:', error);
      }
    }, 1000); // 1 saniye debounce
    
    return () => clearTimeout(timer);
  }, [title, shopSections, shopSectionAutoSelected]);

  // Form açıldığında otomatik seçimi aktif et
  useEffect(() => {
    if (isOpen) {
      setShopSectionAutoSelected(true);
      console.log('Form açıldı, otomatik kategori seçimi aktif');
    }
  }, [isOpen]);

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
      return;
    }

    // 2. Diğer Validasyonlar
    if (!title || !shippingProfileId || productImages.length === 0) {
      toast({ variant: "destructive", description: "Başlık, Kargo Profili ve en az bir Resim zorunludur." });
      return;
    }

    // Dışarıdan gelen onSubmit fonksiyonu varsa onu kullan
    if (onSubmit) {
      try {
        // Başlangıç toast mesajı
        toast({ 
          title: "🚀 Ürün yükleniyor...", 
          description: "Lütfen bekleyin, ürün Etsy'e yükleniyor." 
        });
        
        const formData: Partial<Product> = {
          title,
          description,
          price: {
            amount: Number(price) * 100,
            divisor: 100,
            currency_code: "USD"
          },
          shipping_profile_id: Number(shippingProfileId),
          tags,
          has_variations: hasVariations,
          variations: hasVariations ? variations.filter((v: any) => v.is_active) : [],
          shop_section_id: Number(selectedShopSection) || undefined,
          
          // --- Kişiselleştirme Ayarları (Sabit ve EKSİKSİZ) ---
          is_personalizable: isPersonalizable,
          personalization_is_required: personalizationRequired,
          personalization_instructions: personalizationInstructions,
          
          // --- Etsy'nin İstediği Diğer Zorunlu Alanlar ---
          quantity: quantity || 4,
          taxonomy_id: taxonomyId,
          
          // Görseller
          images: productImages.map(img => ({ 
            url: img.preview,
            file: img.file 
          })),
          video_url: videoFile ? URL.createObjectURL(videoFile.file) : undefined,
        };
        
        const result = await onSubmit(formData, state);
        
        if (result.success) {
          toast({
            title: "✅ Başarılı",
            description: "Ürün başarıyla oluşturuldu",
          });
          
          // Başarılı işlem sonrası modalı kapat
          onClose();
        } else {
          throw new Error(result.message || "Ürün oluşturulamadı");
        }
      } catch (error: any) {
        console.error('Ürün oluşturma hatası:', error);
        toast({ 
          variant: "destructive", 
          title: "❌ Hata Oluştu", 
          description: error.message || "Ürün oluşturulurken bir hata oluştu." 
        });
      }
      return;
    }
    
    // Dışarıdan gelen onSubmit yoksa iç fonksiyonu kullan
    setInternalSubmitting(true);
    
    // İşlem başlangıç zamanı
    const startTime = Date.now();

    try {
      // Başlangıç toast mesajı
      toast({ 
        title: "🚀 Ürün yükleniyor...", 
        description: "Lütfen bekleyin, ürün Etsy'e yükleniyor." 
      });
      
      // Önce Etsy mağazalarını senkronize et
      try {
        console.log('Etsy mağazaları senkronize ediliyor...');
        const storesResponse = await fetch('/api/etsy/stores', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!storesResponse.ok) {
          console.warn('⚠️ Etsy mağazaları senkronize edilemedi:', await storesResponse.text());
        } else {
          const storesData = await storesResponse.json();
          console.log(`✅ ${storesData.count} Etsy mağazası başarıyla senkronize edildi`);
        }
      } catch (storeError) {
        console.warn('⚠️ Etsy mağaza senkronizasyonu hatası:', storeError);
        // Hatayı göster ama işleme devam et
      }
      
      const formData = new FormData();

      const listingData = {
        // Formdan gelen dinamik değerler
        title,
        description,
        price,
        shipping_profile_id: Number(shippingProfileId),
        tags,
        has_variations: hasVariations,
        variations: hasVariations ? variations.filter((v: any) => v.is_active) : [],
        state: state,
        shop_section_id: Number(selectedShopSection) || undefined,
        category: selectedShopSection ? shopSections.find(s => s.shop_section_id.toString() === selectedShopSection)?.title : undefined,
        
        // --- Kişiselleştirme Ayarları (Sabit ve EKSİKSİZ) ---
        is_personalizable: isPersonalizable,
        personalization_is_required: personalizationRequired,
        personalization_instructions: personalizationInstructions,
        personalization_char_count_max: 256, // <-- Etsy için kritik alan

        // --- Etsy'nin İstediği Diğer Zorunlu Alanlar ---
        quantity: quantity || 4,
        taxonomy_id: taxonomyId,
        who_made: "i_did",
        when_made: "made_to_order",
        is_supply: false,
        
        // Token kullanım bilgilerini ekle
        tokenUsage: tokenUsage,
        
        // Süre bilgilerini ekle
        generationDurations: generationDurations
      };

      formData.append('listingData', JSON.stringify(listingData));
      productImages.forEach(image => formData.append('imageFiles', image.file));
      if (videoFile) formData.append('videoFile', videoFile.file);

      // Toplam işlem süresini hesapla
      const totalUploadDuration = Date.now() - startTime;
      
      // Toplam süreyi de ekle
      const updatedListingData = {
        ...listingData,
        totalUploadDuration
      };
      
      // Güncellenen veriyi formData'ya ekle
      formData.set('listingData', JSON.stringify(updatedListingData));
      
      const response = await fetch('/api/etsy/listings/create', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();

      if (result.success) {
        toast({
          title: "✅ Başarılı",
          description: "Ürün başarıyla oluşturuldu",
        });
        
        // Başarılı işlem sonrası modalı kapat
        onClose();
      } else {
        throw new Error(result.error || "Ürün oluşturulamadı");
      }

    } catch (error: any) {
      console.error('Ürün oluşturma hatası:', error);
      
      // Etsy bağlantı hatası için özel mesaj
      if (error.message && error.message.includes('Etsy')) {
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
      setInternalSubmitting(false);
    }
  };

  // Ürünü kuyruğa ekleyen fonksiyon
  const handleQueueSubmit = async (state: "draft" | "active") => {
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
      return;
    }

    // 2. Diğer Validasyonlar
    if (!title || !shippingProfileId || productImages.length === 0) {
      toast({ variant: "destructive", description: "Başlık, Kargo Profili ve en az bir Resim zorunludur." });
      return;
    }

    setInternalSubmitting(true);
    
    try {
      // Başlangıç toast mesajı
      toast({ 
        title: "🚀 Ürün kuyruğa ekleniyor...", 
        description: "Lütfen bekleyin, ürün kuyruğa ekleniyor." 
      });
      
      const formData = new FormData();

      const listingData = {
        // Formdan gelen dinamik değerler
        title,
        description,
        price,
        shipping_profile_id: Number(shippingProfileId),
        tags,
        has_variations: hasVariations,
        variations: hasVariations ? variations.filter((v: any) => v.is_active) : [],
        state: state,
        shop_section_id: Number(selectedShopSection) || undefined,
        category: selectedShopSection ? shopSections.find(s => s.shop_section_id.toString() === selectedShopSection)?.title : undefined,
        
        // --- Kişiselleştirme Ayarları (Sabit ve EKSİKSİZ) ---
        is_personalizable: isPersonalizable,
        personalization_is_required: personalizationRequired,
        personalization_instructions: personalizationInstructions,
        personalization_char_count_max: 256, // <-- Etsy için kritik alan

        // --- Etsy'nin İstediği Diğer Zorunlu Alanlar ---
        quantity: quantity || 4,
        taxonomy_id: taxonomyId,
        who_made: "i_did",
        when_made: "made_to_order",
        is_supply: false,
        
        // Token kullanım bilgilerini ekle
        tokenUsage: tokenUsage,
        
        // Süre bilgilerini ekle
        generationDurations: generationDurations
      };

      formData.append('listingData', JSON.stringify(listingData));
      productImages.forEach(image => formData.append('imageFiles', image.file));
      if (videoFile) formData.append('videoFiles', videoFile.file);
      
      // Kuyruğa eklemek için API çağrısı yap
      const response = await fetch('/api/etsy/listings/queue', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();

      if (result.success) {
        toast({
          title: "✅ Başarılı",
          description: "Ürün başarıyla kuyruğa eklendi",
        });
        
        // Başarılı işlem sonrası modalı kapat
        onClose();
      } else {
        throw new Error(result.error || "Ürün kuyruğa eklenemedi");
      }

    } catch (error: any) {
      console.error('Ürün kuyruğa ekleme hatası:', error);
      
      toast({ 
        variant: "destructive", 
        title: "❌ Hata Oluştu", 
        description: error.message || "Ürün kuyruğa eklenirken bir hata oluştu." 
      });
    } finally {
      setInternalSubmitting(false);
    }
  };

  // ✅ OPTİMİZE EDİLMİŞ - Başlığın yanındaki buton için ayrı bir fonksiyon
  const generateTitleOnly = async () => {
    if (!productImages[0]?.file) {
      toast({
        title: "Resim gerekli",
        description: "Başlık üretmek için bir resim yüklemelisiniz",
        variant: "destructive",
      });
      return;
    }
    
    setAutoTitleLoading(true);
    
    try {
      const generatedTitle = await generateTitle(productImages[0].file, setTokenUsage, setGenerationDurations);
      if (generatedTitle) {
        setTitle(cleanTitle(generatedTitle.trim()));
        setAutoTitleUsed(true);
      } else {
        throw new Error("Başlık üretilemedi");
      }
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Başlık oluşturulamadı",
        description: error.message
      });
    } finally {
      setAutoTitleLoading(false);
    }
  };

  // ✅ OPTİMİZE EDİLMİŞ - Focus başlık üretici fonksiyon
  const handleFocusTitle = async () => {
    if (!titleInput.trim() || productImages.length === 0 || !productImages[0].file) {
      toast({
        variant: "destructive",
        title: "Eksik Bilgi", 
        description: "Lütfen focus kelimesi girin ve en az bir resim yükleyin."
      });
      return;
    }

    setTitle("");
    setUserEditedTitle(true);
    setFocusStatus("Focus başlık üretiliyor...");
    setFocusTitleLoading(true);

    try {
      const generatedTitle = await generateTitleWithFocus(productImages[0].file, titleInput.trim());
      
      if (generatedTitle) {
        setTitle(cleanTitle(generatedTitle.trim()));
        setFocusStatus("Başarılı!");
        setAutoTitleUsed(true);
      } else {
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

  // ✅ OPTİMİZE EDİLMİŞ - Başlık otomatik üretildiyse, açıklama ve etiket üretimini tetikle
  useEffect(() => {
    if (autoTitleUsed && title) {
      generateDescriptionAndTags();
      setAutoTitleUsed(false); // Sadece bir kez tetiklensin
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

  // ✅ OPTİMİZE EDİLMİŞ - Açıklama ve etiket üretme fonksiyonu
  const generateDescriptionAndTags = async () => {
    if (!title) {
      toast({
        title: "Başlık gerekli",
        description: "Etiket üretmek için önce bir başlık girin",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setAutoTagsLoading(true);
      
      // Etiket üret - YENİ HELPER FONKSIYON
      const generatedTags = await generateTags(title, setTokenUsage, setGenerationDurations, productImages[0]?.file);
      if (generatedTags && Array.isArray(generatedTags)) {
        setTags(generatedTags.slice(0, 13));
      }
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "İçerik üretilemedi", 
        description: error.message || "Başlığa göre içerik oluşturulamadı." 
      });
    } finally {
      setAutoTagsLoading(false);
    }
  };

  // Başlık değişikliğini kontrol eden fonksiyonu güncelle
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newTitle = e.target.value;
    newTitle = cleanTitle(newTitle);
    setTitle(newTitle);
  };

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
      if (internalSubmitting) return;

      // Basit validasyon kontrolü
      if (!title || !shippingProfileId || productImages.length === 0) {
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
  }, [pressedKeys, isOpen, internalSubmitting, title, shippingProfileId, productImages.length]);

  // 123 kısa yolu - Kuyrukla ürün ekle
  useEffect(() => {
    if (pressedKeys.has('1') && pressedKeys.has('2') && pressedKeys.has('3') && isOpen) {
      if (isSubmitting) return;

      // Basit validasyon kontrolü
      if (!title || !shippingProfileId || productImages.length === 0) {
        toast({ variant: "destructive", description: "Başlık, Kargo Profili ve en az bir Resim zorunludur." });
        return;
      }

      // Kuyrukla ürün ekle
      handleQueueSubmit("draft");
      setPressedKeys(new Set()); // Tuşları sıfırla
    }
  }, [pressedKeys, isOpen, isSubmitting, title, shippingProfileId, productImages.length]);

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
            files.forEach(file => {
              if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const newImage = {
                    file,
                    preview: reader.result as string,
                    uploading: false
                  };
                  setProductImages(prev => [...prev, newImage]);
                };
                reader.readAsDataURL(file);
              }
            });
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
        <h3 className="text-base font-medium text-gray-700">Medya Dosyaları</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center text-xs text-gray-500">
            <Image className="w-3.5 h-3.5 mr-1 text-gray-400" />
            <span>{productImages.length}/10</span>
          </div>
          {videoFile ? (
            <div className="flex items-center text-xs text-gray-500">
              <Video className="w-3.5 h-3.5 mr-1 text-gray-400" />
              <span>1/1</span>
            </div>
          ) : (
            <div className="flex items-center text-xs text-gray-400">
              <Video className="w-3.5 h-3.5 mr-1 opacity-50" />
              <span>0/1</span>
            </div>
          )}
        </div>
      </div>

      {/* SÜRÜKLE-BIRAK ALANI */}
      <div
        className={`border rounded-lg transition-all ${
          productImages.length === 0 && !videoFile 
            ? "border-dashed border-gray-300 bg-gray-50/50 hover:border-primary/40 hover:bg-gray-50" 
            : "border-gray-100 shadow-sm"
        }`}
        onDrop={handleImageDrop}
        onDragOver={e => e.preventDefault()}
        onDragEnter={e => e.preventDefault()}
        onDragLeave={e => e.preventDefault()}
      >
        {productImages.length === 0 && !videoFile ? (
          <div className="text-center py-8 px-4">
            <div className="mx-auto w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Upload className="w-5 h-5 text-gray-500" />
            </div>
            <p className="text-sm font-medium text-gray-700">Dosyaları buraya sürükleyin</p>
            <p className="text-xs text-gray-500 mb-3">veya</p>
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
            {productImages.length < 10 && (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => document.getElementById('image-upload')?.click()}
                  className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-lg p-3 h-full min-h-[100px] hover:bg-gray-50 hover:border-primary/40 transition-colors"
                >
                  <Image className="w-5 h-5 text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500">Resim</span>
                </button>
                {!videoFile && (
                  <button
                    type="button"
                    onClick={() => document.getElementById('video-upload')?.click()}
                    className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-lg p-3 hover:bg-gray-50 hover:border-primary/40 transition-colors"
                  >
                    <Video className="w-5 h-5 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500">Video</span>
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

  // Token kullanım bilgilerini ve süreleri tutacak state'leri ekle
  const [tokenUsage, setTokenUsage] = useState<{
    title_prompt_tokens?: number;
    title_completion_tokens?: number;
    title_total_tokens?: number;
    tags_prompt_tokens?: number;
    tags_completion_tokens?: number;
    tags_total_tokens?: number;
    description_prompt_tokens?: number;
    description_completion_tokens?: number;
    description_total_tokens?: number;
    category_prompt_tokens?: number;
    category_completion_tokens?: number;
    category_total_tokens?: number;
  }>({});

  const [generationDurations, setGenerationDurations] = useState<{
    title?: number;
    tags?: number;
    description?: number;
    category?: number;
  }>({});

  // Kuyruk olarak ekle fonksiyonu
  const addToQueue = async (data: any) => {
    setIsSubmitting(true);
    try {
      // Ürünü kuyruk sistemine ekle
      const response = await fetch('/api/etsy/listings/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Ürün kuyruğa eklenirken bir hata oluştu');
      }

      toast({
        title: 'Ürün kuyruğa eklendi',
        description: 'Ürün kuyruk sistemine eklendi. 2 dakika içinde Etsy\'ye yüklenecek.',
        variant: 'success',
      });

      // Formu kapat
      onClose();
    } catch (error) {
      console.error('Ürün kuyruğa eklenirken hata:', error);
      toast({
        title: 'Hata',
        description: 'Ürün kuyruğa eklenirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
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
                className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={isOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            handleCloseModal();
          } else {
            setTitle("");
            setAutoTitleUsed(false);
          }
        }}
      >
        <DialogTrigger asChild>
          {/* DialogTrigger content */}
        </DialogTrigger>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <span>{product ? `Ürünü Düzenle: ${product.title}` : "Yeni Ürün Ekle"}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">İlerleme:</span>
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
                    <div className="text-xs text-gray-500 max-w-20 text-center">{step.description}</div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-2 transition-all ${
                      currentStep > step.id ? 'bg-blue-500' : 'bg-gray-300'
                    }`}></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6">
            {/* Resim Bölümü */}
            <ImageSection />

            <Separator />
            
            {/* Temel Bilgiler Bölümü */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Temel Bilgiler</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="title" className="block mb-1">
                    Başlık <span className="text-red-500">*</span>
                  </Label>
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
                    <span className={`text-xs ${title.length > 140 ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                      {title.length}/140 {title.length > 140 && `(+${title.length - 140})`}
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
                      <span className="text-xs text-gray-500">Rastgele Açıklama İste</span>
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
                    disabled={shopSections.length === 0}
                  >
                    <SelectTrigger id="shopSection">
                      <SelectValue placeholder="Bir kategori seçin..." />
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
                  <Label className="block mb-2">
                    Etiketler <span className="text-gray-500 text-sm">(0-13)</span>
                  </Label>
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
                          const generatedTags = await generateTags(title, productImages[0]?.file);
                          if (generatedTags && Array.isArray(generatedTags)) {
                            setTags(generatedTags);
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
                    <span className="text-xs text-gray-500 ml-1">Yeni Etiket İste</span>
                  </div>
                  {autoTagsLoading && (
                    <div className="text-xs text-blue-500 mt-1">Başlığa göre etiketler üretiliyor...</div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mt-2 min-h-[40px]">
                  {tags.map((tag, index) => (
                    <Badge key={index} className="px-3 py-1 flex items-center gap-1">
                      <span>{tag}</span>
                      <span className="ml-1 text-xs" style={{ color: tag.length > 20 ? '#dc2626' : '#6b7280' }}>
                        ({tag.length})
                      </span>
                      <X 
                        className="h-3 w-3 cursor-pointer ml-1" 
                        onClick={() => handleRemoveTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {tags.length}/13 etiket eklendi
                </p>
              </div>
            </div>

            <Separator />

            {/* Malzemeler */}
            <div>
              <Label className="block mb-2">
                Malzemeler
              </Label>
              <div className="text-sm text-gray-600 bg-gray-100 p-2 rounded border border-gray-200">
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
                    disabled={loadingShippingProfiles || shippingProfiles.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        loadingShippingProfiles
                          ? "Kargo profilleri yükleniyor..."
                          : shippingProfiles.length === 0
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
              {showEtsyButton ? (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => handleSubmit("draft")} 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Taslak Ekleniyor...
                      </>
                    ) : (
                      <>Taslak Olarak Ekle</>
                    )}
                  </Button>
                  <Button 
                    onClick={() => handleSubmit("active")} 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Yükleniyor...
                      </>
                    ) : (
                      <>Etsy'ye Yükle</>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="secondary" 
                    onClick={() => handleQueueSubmit("draft")} 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Kuyruğa Ekleniyor...
                      </>
                    ) : (
                      <>
                        <Clock className="mr-2 h-4 w-4" />
                        Kuyruk Olarak Ekle
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={() => handleSubmit("draft")} 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Ekleniyor...
                      </>
                    ) : (
                      <>Ürün Ekle</>
                    )}
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kaydedilmemiş değişiklikler</AlertDialogTitle>
            <AlertDialogDescription>
              Kaydedilmemiş değişiklikleriniz var. Devam ederseniz, bu değişiklikler kaybolacak.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowUnsavedChangesDialog(false)
              onClose()
            }}>
              Değişiklikleri Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndProvider>
  );
}