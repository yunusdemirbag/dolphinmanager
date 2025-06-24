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
import { createClientSupabase } from "@/lib/supabase";
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
}

export function ProductFormModal({
  isOpen,
  onClose,
  product,
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
  
  // Shipping profiles and shop sections data fetching
  const [shippingProfiles, setShippingProfiles] = useState<ShippingProfile[]>([]);
  const [loadingShippingProfiles, setLoadingShippingProfiles] = useState(false);
  const [loadingShopSections, setLoadingShopSections] = useState(false);
  
  // Ürün görselleri için state
  const [productImages, setProductImages] = useState<MediaFile[]>([])
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

  // Dükkan bölümlerini API'den çekmek için useEffect
  useEffect(() => {
    if (isOpen) {
      async function loadShopSections() {
        try {
          // This is redundant since fetchStoreData already loads shop sections
          // Just return early to avoid duplicate API calls
          return;
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
      setHasVariations(product?.variations ? (product.variations || []).length > 0 : true);
      const initialVariations = product?.variations && (product.variations || []).length > 0 
        ? (product.variations || [])
        : predefinedVariations;
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
        const shopId = storeData.store?.shop_id;
        
        if (!shopId) {
          console.error('No shop ID found', { storeData, shopId });
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
    if ((productImages || []).length + (imageFiles || []).length > 10) {
      toast({ title: "Maksimum Resim Limiti", description: "En fazla 10 resim yükleyebilirsiniz.", variant: "destructive" });
    } else {
      const newImages = imageFiles.map(file => ({ file, preview: URL.createObjectURL(file), uploading: false }));
      setProductImages(prev => [...prev, ...newImages]);
    }
    if ((videoFiles || []).length > 0) {
      if (videoFile) URL.revokeObjectURL(videoFile.preview);
      setVideoFile({ file: videoFiles[0], preview: URL.createObjectURL(videoFiles[0]), uploading: false });
    }
  }, [(productImages || []).length, videoFile, toast]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    const videoFiles = files.filter(f => f.type.startsWith('video/'));
    if ((productImages || []).length + (imageFiles || []).length > 10) {
      toast({ title: "Maksimum Resim Limiti", description: "En fazla 10 resim yükleyebilirsiniz.", variant: "destructive" });
    } else {
      const newImages = imageFiles.map(file => ({ file, preview: URL.createObjectURL(file), uploading: false }));
      setProductImages(prev => [...prev, ...newImages]);
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

  // productImages değiştiğinde autoTitleUsed'u sıfırla
  useEffect(() => {
    setAutoTitleUsed(false);
  }, [productImages]);

  // Yardımcı fonksiyon: Başta/sonda özel karakter/noktalama temizle
  const cleanTitle = (raw: string) => {
    // Başta ve sonda ! . * : , ? ; ' " - _ ( ) [ ] { } gibi karakterleri sil
    return raw.replace(/^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+|[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/g, '').trim();
  };

  // Resim yüklendiğinde başlık üret
  useEffect(() => {
    if (isOpen && (productImages || []).length > 0 && !title && !autoTitleUsed && !userEditedTitle) {
      console.log('🤖 Otomatik başlık üretimi başlatılıyor...', {
        isOpen,
        imageCount: (productImages || []).length,
        title,
        autoTitleUsed,
        userEditedTitle
      });
      
      const generateTitle = async () => {
        setAutoTitleLoading(true);
        try {
          const formData = new FormData();
          formData.append("image", productImages[0].file);
          formData.append("categories", JSON.stringify(shopSections));
          formData.append("customPrompts", JSON.stringify({}));
          
          console.log('📤 Unified AI analizi için API çağrısı yapılıyor...');
          const res = await fetch("/api/ai/analyze-and-generate", {
            method: "POST",
            body: formData,
          });
          
          const data = await res.json();
          console.log('📥 Unified AI yanıtı:', data);
          
          if (data.success === false || data.error) {
            console.error('❌ API Error:', data.error);
            console.error('❌ Debug Info:', data.debugInfo);
            toast({ 
              variant: "destructive", 
              title: "AI Analiz Hatası", 
              description: data.error || "Başlık üretilemedi - API hatası" 
            });
            return;
          }
          
          if (data.title) {
            const generatedTitle = cleanTitle(data.title.trim());
            console.log('✅ Başlık üretildi:', generatedTitle);
            setTitle(generatedTitle);
            setAutoTitleUsed(true);
            
            // Etiketleri de ayarla
            if (data.tags && Array.isArray(data.tags)) {
              setTags(data.tags.slice(0, 13));
            }
            
            // Kategoriyi de ayarla
            if (data.suggestedCategoryId) {
              setSelectedShopSection(data.suggestedCategoryId.toString());
            }
          } else {
            console.log('❌ API\'den başlık alınamadı');
            toast({ 
              variant: "destructive", 
              title: "Başlık Bulunamadı", 
              description: "AI resmi analiz edemedi veya başlık üretemedi" 
            });
          }
        } catch (e) {
          console.error('❌ Başlık üretimi hatası:', e);
          toast({ variant: "destructive", title: "Başlık üretilemedi", description: "Görselden başlık oluşturulamadı." });
        } finally {
          setAutoTitleLoading(false);
        }
      };
      generateTitle();
    }
  }, [productImages, isOpen, title, autoTitleUsed, userEditedTitle]);

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
  }, [title, shopSections, shopSectionAutoSelected, selectedShopSection]); // Tüm dependency'leri ekle

  // Form açıldığında otomatik seçimi aktif et
  useEffect(() => {
    if (isOpen) {
      setShopSectionAutoSelected(true);
      console.log('Form açıldı, otomatik kategori seçimi aktif');
    }
  }, [isOpen]);

  // KUYRUK SİSTEMİ İÇİN YENİ FONKSİYON
  const handleSubmitToQueue = async () => {
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
      setSubmitting(false);
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
        state: "draft", // Kuyrukta her zaman draft olarak başlar
        shop_section_id: Number(selectedShopSection) || undefined,
        
        // --- Kişiselleştirme Ayarları (Sabit ve EKSİKSİZ) ---
        is_personalizable: true,
        personalization_is_required: false,
        personalization_instructions: PERSONALIZATION_INSTRUCTIONS,
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
      
      // Video'yu Supabase Storage'a yükle
      let videoUrl: string | null = null;
      if (videoFile?.file) {
        console.log('🎥 Video Supabase Storage\'a yükleniyor:', videoFile.file.name, (videoFile.file.size / 1024 / 1024).toFixed(2), 'MB');
        
        try {
          // Videoya benzersiz bir isim ver (Gemini önerisi)
          const fileName = `${Date.now()}-${videoFile.file.name}`;
          const filePath = fileName; // Sadece dosya adını kullan (Supabase otomatik public ekler)

          console.log(`🔄 Video yükleniyor: ${fileName} (${(videoFile.file.size / 1024 / 1024).toFixed(2)} MB)`);

          // Supabase Storage'a yükle (Gemini'nin önerdiği exact kod)
          const { data: uploadData, error: uploadError } = await createClientSupabase().storage
            .from('videos') // Policy oluşturduğunuz bucket adı
            .upload(filePath, videoFile.file, {
              cacheControl: '3600',
              upsert: false, // Dosya varsa hata ver (üzerine yazma)
            });

          // Yükleme hatası kontrolü (Gemini önerisi)
          if (uploadError) {
            console.error('❌ Upload error:', uploadError);
            throw new Error(`Video yüklenemedi: ${uploadError.message}`);
          }

          // Yüklenen videonun genel URL'sini al (Gemini'nin exact kodu)
          const { data: urlData } = createClientSupabase().storage
            .from('videos')
            .getPublicUrl(filePath);

          videoUrl = urlData.publicUrl;
          console.log(`✅ Video başarıyla yüklendi! URL: ${videoUrl}`);

          // Video yükleme başarılı bildirimini göster
          toast({
            title: "Video Yüklendi",
            description: `${videoFile.file.name} başarıyla Supabase Storage'a yüklendi`,
          });

        } catch (error) {
          console.error('❌ Supabase video yükleme hatası:', error);
          toast({
            variant: "destructive",
            title: "Video Yükleme Hatası",
            description: error instanceof Error ? error.message : 'Video yüklenirken beklenmeyen bir hata oluştu'
          });
          throw error; // Hatayı yukarı fırlat ki form submission durdursun
        }
      }

      // Base64 verileri ayrı olarak FormData'ya ekle (JSON size'ı küçültmek için)
      console.log('🔍 listingData before stringify:', {
        keys: Object.keys(listingData),
        title: listingData.title,
        imagesLength: (imageDataArray || []).length,
        videoUrl: videoUrl
      });
      
      // Resimleri doğrudan File obje olarak gönder (Base64 yerine)
      productImages.forEach((image, index) => {
        if (image.file) {
          formData.append(`imageFile_${index}`, image.file);
        }
      });
      
      // listingData'ya video URL'sini ekle
      const cleanListingData = { ...listingData };
      delete cleanListingData.images;
      delete cleanListingData.video;
      
      // Video URL'sini ekle
      if (videoUrl) {
        cleanListingData.videoUrl = videoUrl;
      }
      
      const jsonString = JSON.stringify(cleanListingData);
      console.log('📝 Clean JSON string length:', jsonString.length);
      console.log('📝 Images count:', (imageDataArray || []).length);
      console.log('📝 Video URL:', videoUrl);
      
      formData.append('listingData', jsonString);

      // KUYRUK API'sine gönder (Gemini önerisi: JSON + FormData hybrid)
      console.log('🌐 API çağrısı başlıyor: /api/etsy/listings/queue');
      console.log('📦 Gönderilecek veri:', {
        images: (imageDataArray || []).length,
        videoUrl: videoUrl ? '✅ Supabase URL' : '❌ Yok',
        title: listingData.title,
        method: 'FormData + JSON hybrid'
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error('⏰ API call timeout - 60 seconds');
      }, 60000); // 60 second timeout
      
      console.log('📡 Fetch başlatılıyor...');
      const response = await fetch('/api/etsy/listings/queue', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      console.log('🔄 Response alındı! Status:', response.status, response.statusText);

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

      // Başarı mesajı göster ve modal'ı kapat
      toast({ 
        title: "✅ Kuyruk Başarılı!", 
        description: `"${title}" ürünü ${duration} saniyede kuyrukta eklendi. Kuyruktaki ürün #${result.queue_id}` 
      });

      // Modal'ı kapat
      onClose();
      router.refresh();

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
        title: "🚀 Ürün yükleniyor...", 
        description: "Lütfen bekleyin, ürün Etsy'e yükleniyor." 
      });
      
      const formData = new FormData();

      const listingData: any = {
        // Formdan gelen dinamik değerler
        title,
        description,
        price,
        shipping_profile_id: Number(shippingProfileId),
        tags,
        has_variations: hasVariations,
        variations: hasVariations ? variations.filter((v: any) => v.is_active) : [],
        state: state, // Buton tarafından belirlenen durum (draft veya active)
        shop_section_id: Number(selectedShopSection) || undefined,
        
        // --- Kişiselleştirme Ayarları (Sabit ve EKSİKSİZ) ---
        is_personalizable: true,
        personalization_is_required: false,
        personalization_instructions: PERSONALIZATION_INSTRUCTIONS,
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

      const response = await fetch('/api/etsy/listings/create', {
        method: 'POST',
        body: formData,
      });

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

      // Başarı mesajı göster ve modal'ı kapat
      const stateText = state === 'draft' ? 'taslak olarak' : 'aktif olarak';
      toast({ 
        title: "✅ Etsy'e Yüklendi!", 
        description: `"${title}" ürünü ${duration} saniyede Etsy'e ${stateText} yüklendi!` 
      });

      // Modal'ı kapat
      onClose();
      router.refresh();

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
        <h3 className="text-base font-medium text-gray-900">Medya Dosyaları</h3>
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

    setAutoTitleLoading(true);
    setTitle("");
    setUserEditedTitle(true);

    try {
      const file = productImages[0].file;
      const formData = new FormData();
      formData.append("image", file);
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

    setTitle("");
    setUserEditedTitle(true);
    setFocusStatus("Focus başlık üretiliyor...");
    setFocusTitleLoading(true);

    try {
      const file = productImages[0].file;
      const formData = new FormData();
      formData.append("image", file);
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
          <DndProvider backend={HTML5Backend}>
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center justify-between">
                <span>{product ? `Ürünü Düzenle: ${product.title}` : "Yeni Ürün Ekle"}</span>
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
                                setTags(parsedTags.slice(0, 13));
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
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Kuyrukta Ekleniyor...
                      </>
                    ) : (
                      "📋 Kuyrukta Gönder"
                    )}
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={() => handleSubmit("draft")} 
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Taslak Kaydediliyor...
                      </>
                    ) : (
                      "Taslak Olarak Kaydet"
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
          </DndProvider>
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
    </>
  );
}

export default ProductFormModal;