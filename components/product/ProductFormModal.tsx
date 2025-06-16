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
import { createClientSupabase } from "@/lib/supabase";
import { descriptionPrompt, tagsPrompt, categoryPrompt, titlePrompt } from "@/lib/prompts";
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
  shippingProfiles: ShippingProfile[]
  loadingShippingProfiles: boolean
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
}: ProductFormModalProps) {
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
  const [primaryColor, setPrimaryColor] = useState(product?.primary_color || "")
  const [secondaryColor, setSecondaryColor] = useState(product?.secondary_color || "")
  const [width, setWidth] = useState(product?.width || 0)
  const [widthUnit, setWidthUnit] = useState(product?.width_unit || "cm")
  const [height, setHeight] = useState(product?.height || 0)
  const [heightUnit, setHeightUnit] = useState(product?.height_unit || "cm")
  const [taxonomyId, setTaxonomyId] = useState(product?.taxonomy_id || WALL_DECOR_TAXONOMY_ID);
  
  const [hasVariations, setHasVariations] = useState<boolean>(true);
  const [variations, setVariations] = useState(product?.variations || predefinedVariations)
  const [shopSections, setShopSections] = useState<{ shop_section_id: number; title: string }[]>([]);
  const [selectedShopSection, setSelectedShopSection] = useState<string>('');
  
  // Ürün görselleri için state
  const [productImages, setProductImages] = useState<MediaFile[]>([])
  const [videoFile, setVideoFile] = useState<MediaFile | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const router = useRouter()

  // --- BAŞLIK OTO-ÜRETİMİ STATE ---
  const [autoTitleLoading, setAutoTitleLoading] = useState(false);
  const [autoTitleUsed, setAutoTitleUsed] = useState(false);

  // Açıklama üretimi için state
  const [autoDescriptionLoading, setAutoDescriptionLoading] = useState(false);

  // Etiket üretimi için state
  const [autoTagsLoading, setAutoTagsLoading] = useState(false);

  // Kullanıcı elle kategori seçerse otomatik güncellemeyi durdurmak için state
  const [shopSectionAutoSelected, setShopSectionAutoSelected] = useState(true);

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
  }, [isOpen]);

  // Modified reset form useEffect
  useEffect(() => {
    if (isOpen) {
      setTitle(product?.title || "");
      setDescription(product?.description || "");
      setPrice(product?.price?.amount || 0);
      setQuantity(4);
      setShippingProfileId(product?.shipping_profile_id?.toString() || "");
      setTags(product?.tags || []);
      setNewTag("");
      setIsPersonalizable(true);
      setPersonalizationRequired(false);
      setPersonalizationInstructions(PERSONALIZATION_INSTRUCTIONS);
      setPrimaryColor(product?.primary_color || "");
      setSecondaryColor(product?.secondary_color || "");
      setWidth(product?.width || 0);
      setWidthUnit(product?.width_unit || "cm");
      setHeight(product?.height || 0);
      setHeightUnit(product?.height_unit || "cm");
      setTaxonomyId(product?.taxonomy_id || WALL_DECOR_TAXONOMY_ID);
      setProductImages([]);
      setVideoFile(null);

      setHasVariations(product?.variations ? product.variations.length > 0 : true);
      
      // Varyasyonları resetle - her zaman aktif olarak başlat
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

    // Cleanup previews on unmount
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

  // Material işlemleri kaldırıldı - API'de sabit değerler kullanılıyor

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

  // --- GÖRSEL YÜKLENDİKTEN VE MODAL AÇILDIKTAN SONRA BAŞLIK OLUŞTURMA ---
  useEffect(() => {
    if (isOpen && productImages.length > 0 && !title && !autoTitleUsed) {
      const generateTitle = async () => {
        setAutoTitleLoading(true);
        try {
          const formData = new FormData();
          formData.append("image", productImages[0].file);
          const res = await fetch("/api/ai/generate-etsy-title", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (data.title) {
            const generatedTitle = data.title.trim();
            setTitle(generatedTitle);
            setAutoTitleUsed(true);
          }
          if (data.colors) {
            if (data.colors.primaryColor) setPrimaryColor(data.colors.primaryColor);
            if (data.colors.secondaryColor) setSecondaryColor(data.colors.secondaryColor);
          }
        } catch (e) {
          toast({ variant: "destructive", title: "Başlık üretilemedi", description: "Görselden başlık oluşturulamadı." });
        } finally {
          setAutoTitleLoading(false);
        }
      };
      generateTitle();
    }
  }, [productImages, isOpen, title, autoTitleUsed]);

  // Shop section select değiştiğinde otomatik güncellemeyi kapat
  const handleShopSectionChange = (val: string) => {
    setSelectedShopSection(val);
    setShopSectionAutoSelected(false);
  };

  // Başlık değiştiğinde en uygun mağaza kategorisini OpenAI ile otomatik seç
  useEffect(() => {
    if (!debouncedTitle || !shopSections.length || !shopSectionAutoSelected) return;

    const fetchAICategory = async () => {
      const categoryNames = shopSections.map(s => s.title).join(', ');
      // Prompt'u lib/prompts.ts'den al ve değişkenleri yerleştir
      const prompt = categoryPrompt.prompt
        .replace("${categoryNames}", categoryNames)
        .replace("${title}", debouncedTitle);
      try {
        const res = await fetch("/api/ai/generate-etsy-title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        const aiCategory = (await res.text()).trim().toLowerCase();
        let matchedSection = shopSections.find(
          s => s.title.trim().toLowerCase() === aiCategory
        );
        // Fallback: Modern/Abstract gibi genel kategori
        if (!matchedSection) {
          const fallbackKeywords = ["modern", "abstract", "art", "general"];
          matchedSection = shopSections.find(s =>
            fallbackKeywords.some(keyword =>
              s.title.toLowerCase().includes(keyword)
            )
          );
        }
        // Hala yoksa ilk kategoriyi seç
        if (!matchedSection && shopSections.length > 0) {
          matchedSection = shopSections[0];
        }
        if (matchedSection) {
          setSelectedShopSection(matchedSection.shop_section_id.toString());
        }
      } catch (e) {
        // Hata olursa kategori değiştirme
      }
    };
    fetchAICategory();
  }, [debouncedTitle, shopSections, shopSectionAutoSelected]);

  // Job takibi
  const startJobTracking = (jobId: string, productTitle: string) => {
    let attempts = 0;
    const maxAttempts = 150; // 5 dakika (2s * 150)
    
    const interval = setInterval(async () => {
      try {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          toast({ 
            variant: "destructive",
            title: "İşlem Zaman Aşımı", 
            description: `"${productTitle}" için işlem zaman aşımına uğradı.` 
          });
          return;
        }
        
        attempts++;
        const response = await fetch(`/api/etsy/listings/job-status/${jobId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            clearInterval(interval);
            toast({ 
              variant: "destructive",
              title: "İşlem Bulunamadı", 
              description: `"${productTitle}" için işlem bulunamadı.` 
            });
            return;
          }
          throw new Error('Job status API hatası');
        }
        
        const job = await response.json();
        
        if (job.status === 'completed') {
          clearInterval(interval);
          toast({ 
            title: "✅ Ürün Hazır!", 
            description: `"${productTitle}" başarıyla Etsy'ye eklendi!` 
          });
        } else if (job.status === 'failed') {
          clearInterval(interval);
          toast({ 
            variant: "destructive",
            title: "❌ Ürün Eklenemedi", 
            description: `"${productTitle}": ${job.error || 'Bilinmeyen hata'}` 
          });
        }
        // Progress update için konsola bilgi yazdır
        else if (job.status === 'processing') {
          console.log(`Progress: ${job.progress}%`);
        }
      } catch (error) {
        console.error('Job tracking error:', error);
      }
    }, 2000); // 2 saniyede bir kontrol et
    
    // interval'ı global olarak sakla, gerekirse temizlemek için
    // window.__jobIntervals = window.__jobIntervals || {};
    // window.__jobIntervals[jobId] = interval;
  };

  // Form verilerini handle eden fonksiyon
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

    setSubmitting(true);

    try {
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
        };
        
        formData.append('listingData', JSON.stringify(listingData));
        productImages.forEach(image => formData.append('imageFiles', image.file));
        if (videoFile) formData.append('videoFile', videoFile.file);

        // Doğrudan endpoint'e gönder (asenkron yerine)
        toast({ 
          title: "Ürün yükleniyor...", 
          description: "Lütfen bekleyin, ürün Etsy'e yükleniyor." 
        });

        const response = await fetch('/api/etsy/listings/create', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Sunucu tarafında bilinmeyen bir hata oluştu.');
        }

        // Başarı mesajı göster ve modal'ı kapat
        toast({ 
          title: "İşlem Başarılı! ✅", 
          description: `Ürün "${title}" başarıyla oluşturuldu.` 
        });
        
        // Modal'ı kapat
        onClose();
        router.refresh();

    } catch (error) {
        toast({ variant: "destructive", title: 'İşlem Başarısız', description: (error as Error).message });
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

      {/* BAŞLIK VE RESİM/VIDEO SAYACI */}
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

      {/* SÜRÜKLE-BIRAK ALANI VE RESİM LİSTESİ */}
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
            <div className="flex gap-2 justify-center">
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

  // AI açıklama/etiket fetch fonksiyonunu güncelle
  async function fetchAIResult(url: string, options: RequestInit) {
    const response = await fetch(url, options);
    let data;
    try {
      data = await response.json();
    } catch (e) {
      // JSON parse hatası varsa, muhtemelen HTML döndü
      const text = await response.text();
      throw new Error(text || 'API yanıtı okunamadı');
    }
    if (!response.ok) {
      throw new Error(data.error || 'Bilinmeyen API hatası');
    }
    return data;
  }

  const [titleTimeout, setTitleTimeout] = useState<NodeJS.Timeout | null>(null);

  // Açıklama ve etiket üretimi için fetch isteklerinde model: 'gpt-3.5-turbo' parametresi ekle
  const generateDescriptionAndTags = async () => {
    if (!title) return;
    try {
      setAutoDescriptionLoading(true);
      setAutoTagsLoading(true);
      // Açıklama üret
      const descPrompt = descriptionPrompt.prompt.replace("${title}", title);
      const descRes = await fetch("/api/ai/generate-etsy-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: descPrompt, title, model: "gpt-3.5-turbo" }),
      });
      const descText = await descRes.text();
      setDescription(descText.trim());
      // Etiket üret
      const tagPrompt = tagsPrompt.prompt.replace("${title}", title);
      const tagRes = await fetch("/api/ai/generate-etsy-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: tagPrompt, title, model: "gpt-3.5-turbo" }),
      });
      const tagText = await tagRes.text();
      let tags = tagText.replace(/\n/g, "").split(",").map(t => t.trim()).filter(Boolean);
      if (tags.length > 13) tags = tags.slice(0, 13);
      setTags(tags);
    } catch (e) {
      toast({ variant: "destructive", title: "İçerik üretilemedi", description: "Başlığa göre içerik oluşturulamadı." });
    } finally {
      setAutoDescriptionLoading(false);
      setAutoTagsLoading(false);
    }
  };

  // Başlık değişikliklerini yönet
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  // Başlığın yanındaki buton için ayrı bir fonksiyon
  const generateTitleOnly = async () => {
    if (!productImages.length || !productImages[0].file) return;
    try {
      setAutoTitleLoading(true);
      const formData = new FormData();
      formData.append("image", productImages[0].file);
      const res = await fetch("/api/ai/generate-etsy-title", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Başlık oluşturulamadı");
      // API'den dönen yanıtı JSON olarak işle
      const data = await res.json();
      if (data.title) {
        setTitle(data.title.trim());
        setAutoTitleUsed(true);
      } else {
        const text = data?.text || "";
        setTitle(text.trim());
        setAutoTitleUsed(true);
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Başlık oluşturulamadı" });
    } finally {
      setAutoTitleLoading(false);
    }
  };

  const [focusTitleLoading, setFocusTitleLoading] = useState(false);

  // generateTitle fonksiyonunu focus alanı için koru
  const generateTitle = async (inputText: string) => {
    if (!inputText.trim() || productImages.length === 0) return;
    try {
      setFocusTitleLoading(true);
      const combinedPrompt = `${inputText} ${titlePrompt.prompt} bu kelimeyi dikkate alarak başlık oluştur.`;
      const res = await fetch("/api/ai/generate-etsy-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: combinedPrompt, model: "gpt-4o" }),
      });
      if (!res.ok) throw new Error("Başlık oluşturulamadı");
      const text = await res.text();
      setTitle(text.trim());
    } catch (e) {
      toast({ variant: "destructive", title: "Başlık oluşturulamadı" });
    } finally {
      setFocusTitleLoading(false);
    }
  };

  // Form açıldığında focus alanını temizle
  useEffect(() => {
    setTitleInput("");
  }, [isOpen]); // 'isOpen' formun açık/kapalı durumunu belirten state olmalı

  // Başlık otomatik üretildiyse, başlık değiştiğinde açıklama ve etiket üretimini tetikle
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

  return (
    <DndProvider backend={HTML5Backend}>
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
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {product ? `Ürünü Düzenle: ${product.title}` : "Yeni Ürün Ekle"}
            </DialogTitle>
            <DialogDescription>
              {product ? "Bu ürünün detaylarını düzenleyin." : "Yeni bir ürün ekleyin."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
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
                    <span
                      className={`ml-2 text-xs font-mono ${title.length > 140 ? 'text-red-500' : 'text-gray-400'}`}
                      title="Başlık karakter sayısı"
                      style={{ minWidth: 48, textAlign: 'right' }}
                    >
                      {title.length}/140
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
                  {/* Focus alanı ve buton için generateTitle fonksiyonu kullanılacak */}
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
                      onClick={() => {
                        if (!titleInput.trim() || productImages.length === 0) return;
                        generateTitle(titleInput);
                      }}
                      disabled={focusTitleLoading || !titleInput.trim() || productImages.length === 0}
                    >
                      {focusTitleLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Wand2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {autoTitleLoading && productImages.length > 0 && (
                    <p className="text-sm text-muted-foreground">Başlık oluşturuluyor...</p>
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
                  <div className="flex items-center gap-2">
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="min-h-[100px]"
                      placeholder="Ürününüzün detaylı açıklamasını girin"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="border border-gray-300 hover:bg-gray-100 rounded-md"
                      title="Yeni Açıklama İste"
                      disabled={autoDescriptionLoading || !title}
                      onClick={generateDescriptionAndTags}
                    >
                      {autoDescriptionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    </Button>
                    <span className="text-xs text-gray-500 ml-1">Yeni Açıklama ve Etiket İste</span>
                  </div>
                  {autoDescriptionLoading && (
                    <div className="text-xs text-blue-500 mt-1">Başlığa göre açıklama üretiliyor...</div>
                  )}
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
                      onClick={generateDescriptionAndTags}
                    >
                      {autoTagsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TagIcon className="w-4 h-4" />}
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

            {/* Malzemeler kısmı kaldırıldı - API'de sabit değerler kullanılıyor */}
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

            {/* Fiziksel Özellikler */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Fiziksel Özellikler</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryColor" className="block mb-1">
                    Ana Renk
                  </Label>
                  <Input
                    id="primaryColor"
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="Örn: Mavi"
                  />
                </div>
                
                <div>
                  <Label htmlFor="secondaryColor" className="block mb-1">
                    İkincil Renk
                  </Label>
                  <Input
                    id="secondaryColor"
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    placeholder="Örn: Beyaz"
                  />
                </div>
                
                <div className="col-span-2">
                  <Label className="block mb-2">
                    Boyutlar
                  </Label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center flex-grow">
                      <Label htmlFor="width" className="mr-2 whitespace-nowrap">Genişlik:</Label>
                      <Input
                        id="width"
                        type="number"
                        value={width || ""}
                        onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                        className="mr-2"
                      />
                      <Select value={widthUnit} onValueChange={setWidthUnit}>
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="Birim" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cm">cm</SelectItem>
                          <SelectItem value="mm">mm</SelectItem>
                          <SelectItem value="m">m</SelectItem>
                          <SelectItem value="in">inç</SelectItem>
                          <SelectItem value="ft">ft</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <span className="mx-2">×</span>
                    <div className="flex items-center flex-grow">
                      <Label htmlFor="height" className="mr-2 whitespace-nowrap">Yükseklik:</Label>
                      <Input
                        id="height"
                        type="number"
                        value={height || ""}
                        onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                        className="mr-2"
                      />
                      <Select value={heightUnit} onValueChange={setHeightUnit}>
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="Birim" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cm">cm</SelectItem>
                          <SelectItem value="mm">mm</SelectItem>
                          <SelectItem value="m">m</SelectItem>
                          <SelectItem value="in">inç</SelectItem>
                          <SelectItem value="ft">ft</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
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