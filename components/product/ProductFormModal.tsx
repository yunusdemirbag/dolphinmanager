"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
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
import { Loader2, Plus, X, Image as ImageIcon, Upload, GripVertical } from "lucide-react"
import { Product, CreateProductForm, TaxonomyNode, ShippingProfile, EtsyProcessingProfile } from "@/types/product"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useDrag, useDrop } from 'react-dnd';
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
import { useRouter } from "next/navigation"

// Sabit Art & Collectibles kategori ID - Bu Etsy'de geçerli bir kategori ID'sidir
const DIGITAL_PRINTS_TAXONOMY_ID = 68887271;  // Art & Collectibles > Prints > Digital Prints

// Default materials - API'de sabit değerler gönderildiği için burada kullanılmayacak
const DEFAULT_MATERIALS = ["Cotton Canvas", "Wood Frame", "Hanger"];

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
  onSubmit: (product: Partial<Product> & { variations?: any[] }, state: "draft" | "active") => Promise<CreateListingResponse>
  submitting: boolean
  shippingProfiles: ShippingProfile[]
  loadingShippingProfiles: boolean
}

// Sabit item type tanımla
const ItemTypes = {
  IMAGE: 'image'
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
    type: ItemTypes.IMAGE,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  
  const [, drop] = useDrop({
    accept: ItemTypes.IMAGE,
    hover: (item: { index: number }, monitor) => {
      if (!ref.current) {
        return;
      }
      
      const dragIndex = item.index;
      const hoverIndex = index;
      
      // Kendi üzerine düşürmeyi önle
      if (dragIndex === hoverIndex) {
        return;
      }
      
      // Sürüklenen elemanın ekrandaki dikdörtgenini hesapla
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      
      // Dikdörtgenin ortasını bul
      const hoverMiddleX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      
      // Fare konumunu al
      const clientOffset = monitor.getClientOffset();
      
      if (!clientOffset) {
        return;
      }
      
      // Fare konumunun hover elemanına göre pozisyonunu hesapla
      const hoverClientX = clientOffset.x - hoverBoundingRect.left;
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;
      
      // Sadece fare ortanın solunda iken ve sola hareket ediyorsa
      // veya fare ortanın sağında iken ve sağa hareket ediyorsa taşı
      const isDraggingLeft = dragIndex > hoverIndex && hoverClientX > hoverMiddleX;
      const isDraggingRight = dragIndex < hoverIndex && hoverClientX < hoverMiddleX;
      const isDraggingUp = dragIndex > hoverIndex && hoverClientY > hoverMiddleY;
      const isDraggingDown = dragIndex < hoverIndex && hoverClientY < hoverMiddleY;
      
      // Sadece mouse'un hareket ettiği yöne doğru işlem yap
      if (isDraggingLeft || isDraggingRight || isDraggingUp || isDraggingDown) {
        // Resmin yerini değiştir
        moveImage(dragIndex, hoverIndex);
        
        // item'ın index'ini güncelle
        item.index = hoverIndex;
      }
    },
  });
  
  // drag ve drop ref'lerini birleştir
  drag(drop(ref));
  
  // Prepare the image source - use proxy for Etsy static URLs
  const imageSource = image.preview.includes('etsystatic.com') 
    ? `/api/etsy/image-proxy?url=${encodeURIComponent(image.preview)}`
    : image.preview;
  
  return (
    <div
      ref={ref}
      className={`relative group rounded-lg overflow-hidden border cursor-grab active:cursor-grabbing ${
        index === 0 ? "ring-2 ring-primary border-primary" : "border-gray-200"
      }`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <img
        src={imageSource}
        alt={`Ürün resmi ${index + 1}`}
        className="w-full aspect-square object-cover"
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute top-2 right-2 p-1 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
      >
        <X className="w-4 h-4 text-gray-700" />
      </button>
      {index === 0 && (
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-primary text-white text-xs rounded">
          Ana Görsel
        </div>
      )}
      {image.uploading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
      )}
      {image.error && (
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-red-500 text-white text-xs rounded">
          Hata
        </div>
      )}
    </div>
  );
};

export function ProductFormModal({
  isOpen,
  onClose,
  product,
  onSubmit,
  submitting,
  shippingProfiles,
  loadingShippingProfiles
}: ProductFormModalProps) {
  const { toast } = useToast()
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false)
  const [title, setTitle] = useState(product?.title || "")
  const [description, setDescription] = useState(product?.description || "")
  const [price, setPrice] = useState(product?.price?.amount || 0)
  const [quantity, setQuantity] = useState(4)
  const [shippingProfileId, setShippingProfileId] = useState(
    product?.shipping_profile_id?.toString() || ""
  )

  // Additional fields to match Etsy
  const [tags, setTags] = useState(product?.tags || [])
  const [tagInput, setTagInput] = useState("")
  // Materials kısmı kaldırıldı - API'de sabit değerler gönderildiği için
  const [isPersonalizable, setIsPersonalizable] = useState<boolean>(product?.is_personalizable ?? true)
  const [personalizationRequired, setPersonalizationRequired] = useState(product?.personalization_is_required || false)
  const [personalizationInstructions, setPersonalizationInstructions] = useState(
    product?.personalization_instructions || "To help ensure a smooth delivery, would you like to provide a contact phone number for the courier? If not, simply type \"NO\"."
  )
  const [primaryColor, setPrimaryColor] = useState(product?.primary_color || "")
  const [secondaryColor, setSecondaryColor] = useState(product?.secondary_color || "")
  const [width, setWidth] = useState(product?.width || 0)
  const [widthUnit, setWidthUnit] = useState(product?.width_unit || "cm")
  const [height, setHeight] = useState(product?.height || 0)
  const [heightUnit, setHeightUnit] = useState(product?.height_unit || "cm")
  const [taxonomyId, setTaxonomyId] = useState(product?.taxonomy_id || 1027);
  
  const [hasVariations, setHasVariations] = useState<boolean>(true);
  const [variations, setVariations] = useState(product?.variations || predefinedVariations)
  const [shopSections, setShopSections] = useState<{shop_section_id: number, title: string}[]>([])
  const [selectedShopSection, setSelectedShopSection] = useState<string>("0")
  
  // Ürün görselleri için state
  const [productImages, setProductImages] = useState<{
    file: File;
    preview: string;
    uploading: boolean;
    error?: string;
  }[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // 1. videoFile state'ini genişlet
  const [videoFile, setVideoFile] = useState<{
    file: File;
    preview: string;
    uploading: boolean;
    error?: string;
  } | null>(null);

  // 2. useRef ile file input'a eriş
  const fileInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter()

  // Mağaza bölümlerini yükle
  useEffect(() => {
    async function loadShopSections() {
      try {
        const response = await fetch('/api/etsy/shop-sections');
        if (response.ok) {
          const data = await response.json();
          if (data.sections && Array.isArray(data.sections)) {
            setShopSections(data.sections);
            // Ürünün bir bölümü varsa onu seç, yoksa 0 (Home) bölümünü kullan
            if (product?.shop_section_id) {
              setSelectedShopSection(product.shop_section_id.toString());
            } else if (data.sections.length > 0 && !selectedShopSection) {
              // Eğer Home (0) bölümü varsa onu seç
              const homeSection = data.sections.find((s: {shop_section_id: number, title: string}) => s.shop_section_id === 0);
              if (homeSection) {
                setSelectedShopSection("0");
              } else if (data.sections[0]) {
                // Yoksa ilk bölümü seç
                setSelectedShopSection(data.sections[0].shop_section_id.toString());
              }
            }
          }
        }
      } catch (error) {
        console.error("Shop sections yüklenirken hata:", error);
      }
    }
    
    if (isOpen) {
      loadShopSections();
      
      // İlk kargo profilini varsayılan olarak seç
      if (shippingProfiles.length > 0 && !shippingProfileId) {
        setShippingProfileId(shippingProfiles[0].shipping_profile_id.toString());
      }
    }
  }, [isOpen, shippingProfiles, shippingProfileId, selectedShopSection, product]);

  // Modified reset form useEffect
  useEffect(() => {
    if (isOpen) {
      setTitle(product?.title || "");
      setDescription(product?.description || "");
      setPrice(product?.price?.amount || 0);
      setQuantity(4);
      setShippingProfileId(product?.shipping_profile_id?.toString() || "");
      setTags(product?.tags || []);
      setTagInput("");
      setIsPersonalizable(product?.is_personalizable ?? true);
      setPersonalizationRequired(product?.personalization_is_required ?? false);
      setPersonalizationInstructions(
        product?.personalization_instructions || "To help ensure a smooth delivery, would you like to provide a contact phone number for the courier? If not, simply type \"NO\"."
      );
      setPrimaryColor(product?.primary_color || "");
      setSecondaryColor(product?.secondary_color || "");
      setWidth(product?.width || 0);
      setWidthUnit(product?.width_unit || "cm");
      setHeight(product?.height || 0);
      setHeightUnit(product?.height_unit || "cm");
      setTaxonomyId(product?.taxonomy_id || 1027);
      setProductImages([]);
      setIsDragging(false);

      setHasVariations(product?.variations ? product.variations.length > 0 : true);
      
      // Varyasyonları resetle - her zaman aktif olarak başlat
      const initialVariations = product?.variations && product.variations.length > 0 
        ? product.variations 
        : predefinedVariations;
      setVariations(initialVariations);

      if (product?.images?.length) {
        setProductImages(product.images.map(img => ({
          file: new File([], img.url_fullxfull || ''), // Gerçek dosya değil, sadece placeholder
          preview: img.url_fullxfull || '',
          uploading: false
        })));
      }

      // Shop Section'ı sıfırla - Home (0) bölümü yerine, ürünün bir bölümü varsa onu, yoksa ilk bölümü seç
      if (product?.shop_section_id) {
        setSelectedShopSection(product.shop_section_id.toString());
      } else if (shopSections.length > 0) {
        // Home (0) bölümünü filtrele
        const filteredSections = shopSections.filter(s => s.shop_section_id !== 0);
        if (filteredSections.length > 0) {
          setSelectedShopSection(filteredSections[0].shop_section_id.toString());
        }
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

  // Form değişikliklerini kontrol et
  const hasUnsavedChanges = () => {
    if (!product) {
      return title !== "" || description !== "" || price !== 0 || quantity !== 4 || 
             shippingProfileId !== "" || tags.length > 0 || productImages.length > 0
    }
    return false
  }

  // Modal kapatma işlemi
  const handleCloseModal = () => {
    if (hasUnsavedChanges()) {
      setShowUnsavedChangesDialog(true)
    } else {
      onClose()
    }
  }

  // Tag ekleme
  const handleAddTag = () => {
    if (tagInput.trim() && tags.length < 13) {
      setTags([...tags, tagInput.trim()])
      setTagInput("")
    }
  }

  // Tag silme
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  // Material işlemleri kaldırıldı - API'de sabit değerler kullanılıyor

  // Resim yükleme işleyicileri
  const handleImageDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
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

  // Form verilerini handle eden fonksiyon
  const handleSubmit = async (state: "draft" | "active") => {
    try {
      // Personalization instructions boşsa varsayılan mesajı kullan
      const defaultPersonalization = "To help ensure a smooth delivery, would you like to provide a contact phone number for the courier? If not, simply type \"NO\".";
      const personalizationValue = personalizationInstructions && personalizationInstructions.trim().length > 0
        ? personalizationInstructions
        : defaultPersonalization;

      // Form verilerini hazırla
      const productData = {
        title,
        description,
        price: {
          amount: Math.round(price * 100), // USD cents'e çevir
          divisor: 100,
          currency_code: "USD"
        },
        quantity: 4, // Her zaman 4 olarak sabit
        shipping_profile_id: parseInt(shippingProfileId),
        tags,
        // materials field'ı kaldırıldı - API'de sabit değerler kullanılıyor
        is_personalizable: isPersonalizable,
        personalization_is_required: personalizationRequired,
        personalization_instructions: personalizationValue,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        width,
        width_unit: widthUnit,
        height,
        height_unit: heightUnit,
        variations: hasVariations ? variations.filter((v: any) => v.is_active) : undefined,
        shop_section_id: selectedShopSection ? parseInt(selectedShopSection) : undefined, // Seçili shop section'ı doğrudan kullan
        state: state,
        // taxonomy_id parametresi geçici olarak kaldırıldı
      };

      // Önce ürün oluşturma/güncelleme isteğini gönder
      const listingResponse = await onSubmit(productData, state);
      if (!listingResponse.success || !listingResponse.listing_id) {
        toast({
          variant: "destructive",
          title: "Hata",
          description: listingResponse.message || "Ürün oluşturulurken/güncellenirken bir hata oluştu.",
        });
        return;
      }
      const listing_id = listingResponse.listing_id;
      // 2. ADIM: Video varsa videoyu yükle
      if (videoFile) {
        setVideoFile(prev => prev ? { ...prev, uploading: true, error: undefined } : null);
        toast({ title: "Video Yükleniyor...", description: "Lütfen bekleyin." });
        console.log("Video yükleme başlatılıyor, file:", videoFile.file.name);
        
        const formData = new FormData();
        formData.append('video', videoFile.file);
        formData.append('name', videoFile.file.name);
        
        try {
          console.log(`Video yükleme API çağrısı yapılıyor: /api/etsy/listings/${listing_id}/video`);
          const videoResponse = await fetch(`/api/etsy/listings/${listing_id}/video`, {
            method: 'POST',
            body: formData,
          });
          
          console.log("Video API yanıt durumu:", videoResponse.status);
          
          if (!videoResponse.ok) {
            const errorData = await videoResponse.json();
            console.error("Video yükleme hatası - ham yanıt:", JSON.stringify(errorData));
            
            // Özel hata durumlarını kontrol et
            if (errorData.message === 'No Etsy store found') {
              // Mağaza bilgisini yeniden çekmeyi dene
              const storeResponse = await fetch('/api/etsy/stores');
              if (!storeResponse.ok) {
                toast({
                  title: "Mağaza Bağlantı Hatası",
                  description: "Etsy mağazanıza erişilemiyor. Lütfen sayfayı yenileyip tekrar deneyin.",
                  variant: "destructive"
                });
                return;
              }
              
              // Mağaza bilgisi varsa, video yüklemeyi tekrar dene
              const stores = await storeResponse.json();
              if (stores?.stores?.length > 0) {
                // Video yüklemeyi tekrar dene
                const retryResponse = await fetch(`/api/etsy/listings/${listing_id}/video`, {
                  method: 'POST',
                  body: formData,
                });
                
                if (retryResponse.ok) {
                  const result = await retryResponse.json();
                  setVideoFile(prev => prev ? { ...prev, uploading: false, uploaded: true } : null);
                  toast({
                    title: "Video Yüklendi",
                    description: "Video başarıyla yüklendi!",
                    variant: "default"
                  });
                  return;
                }
              }
            }
            
            // Diğer hata durumları
            setVideoFile(prev => prev ? {
              ...prev,
              uploading: false,
              error: errorData.message || 'Video yüklenirken bir hata oluştu'
            } : null);
            
            toast({
              title: "Video Yükleme Hatası",
              description: errorData.message || 'Video yüklenirken bir hata oluştu',
              variant: "destructive"
            });
            
            return;
          }

          const result = await videoResponse.json();
          console.log("Video başarıyla yüklendi:", result);
          
          setVideoFile(prev => prev ? { ...prev, uploading: false, uploaded: true } : null);
          toast({
            title: "Video Yüklendi",
            description: "Video başarıyla yüklendi!",
            variant: "default"
          });
        } catch (error) {
          console.error("Video yükleme işleminde hata:", error);
          setVideoFile(prev => prev ? {
            ...prev,
            uploading: false,
            error: 'Video yüklenirken bir hata oluştu'
          } : null);
          
          toast({
            title: "Video Yükleme Hatası",
            description: "Video yüklenirken beklenmeyen bir hata oluştu.",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: product ? "Ürün güncellendi" : "Ürün oluşturuldu",
          description: `İşlem başarıyla tamamlandı. Ürün ID: ${listing_id}`,
        });
      }
      onClose();
    } catch (error) {
      console.error('Form gönderimi sırasında hata:', error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: error instanceof Error ? error.message : "Ürün oluşturulurken bir hata oluştu.",
      });
    }
  };

  // Resim bölümü
  const ImageSection = () => (
    <div className="space-y-4">
      {/* BAŞLIK VE RESİM/VIDEO SAYACI */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Medya</h3>
        <div className="text-sm text-gray-500">
          {productImages.length}/10 resim, {videoFile ? 1 : 0}/1 video
        </div>
      </div>

      {/* VİDEO ÖNİZLEME KARTI */}
      {videoFile && (
        <div className="mt-4 space-y-2">
          <h4 className="text-md font-medium text-gray-700">Video</h4>
          <div className="relative group rounded-lg overflow-hidden border p-2 bg-slate-50">
            <video
              src={videoFile.preview}
              controls={!videoFile.uploading}
              className="w-full rounded-md max-h-64 aspect-video object-cover"
            />
            {videoFile.uploading && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="mt-2 text-sm">Video Etsy'e yükleniyor...</p>
              </div>
            )}
            {videoFile.error && (
              <div className="absolute bottom-2 left-2 right-2 px-2 py-1 bg-red-500 text-white text-xs rounded text-center">
                {videoFile.error}
              </div>
            )}
            {!videoFile.uploading && (
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(videoFile.preview);
                  setVideoFile(null);
                }}
                className="absolute top-2 right-2 z-10 p-1 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
              >
                <X className="w-4 h-4 text-gray-700" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* SÜRÜKLE-BIRAK ALANI VE RESİM LİSTESİ */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-gray-200 hover:border-primary/50"
        }`}
        onDrop={handleImageDrop}
        onDragOver={e => e.preventDefault()}
        onDragEnter={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={e => {
          e.preventDefault();
          setIsDragging(false);
        }}
      >
        {productImages.length === 0 && !videoFile ? (
          <div className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium mb-1">Medya dosyalarını buraya sürükleyin</p>
            <p className="text-sm text-gray-500 mb-4">veya</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              Bilgisayardan Seçin
            </Button>
            <p className="text-xs text-gray-500 mt-4">
              PNG, JPG, GIF veya MP4/QuickTime video • Resim başına max. 20MB
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {productImages.map((image, index) => (
              <DraggableImage
                key={`${index}-${image.preview}`}
                image={image}
                index={index}
                moveImage={moveImage}
                onRemove={handleRemoveImage}
              />
            ))}
            {productImages.length < 10 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <Upload className="w-6 h-6 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">Medya Ekle</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Modified varyasyonlar section in the UI
  const VariationsSection = () => (
    <div className="space-y-4">
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

      {hasVariations && (
        <div className="border rounded-md">
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
        </div>
      )}
    </div>
  )

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          // Form kapatılıyor
          setTitle("");
          setDescription("");
          setPrice(0);
          setQuantity(4);
          setVideoFile(null);
          setHasVariations(true);
          setVariations(predefinedVariations);
          setProductImages([]);
          setIsDragging(false);
          setSelectedShopSection("0");
        }
        onClose();
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
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ürününüzün başlığını girin (SEO için anahtar kelimeler ekleyin)"
                />
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
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[100px]"
                  placeholder="Ürününüzün detaylı açıklamasını girin"
                />
              </div>

              {/* Kategori seçimi */}
              <div className="col-span-2">
                <Label htmlFor="category" className="block mb-1">Kategori *</Label>
                <Select
                  value={taxonomyId.toString()}
                  onValueChange={(val) => setTaxonomyId(Number(val))}
                  required
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{taxonomyId === 2078 ? "Digital Prints" : "Wall Decor"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1027">Wall Decor</SelectItem>
                    <SelectItem value="2078">Digital Prints</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Shop Section seçimi */}
              <div className="col-span-2">
                <Label htmlFor="shopSection">Shop Section</Label>
                <Select
                  value={selectedShopSection}
                  onValueChange={(value) => setSelectedShopSection(value)}
                >
                  <SelectTrigger id="shopSection">
                    <SelectValue placeholder="Bir mağaza bölümü seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {shopSections
                      .filter(section => section.shop_section_id !== 0) // Home bölümünü filtrele
                      .map(section => (
                        <SelectItem key={section.shop_section_id} value={section.shop_section_id.toString()}>
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
                <div className="flex items-center mb-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Etiket ekleyin"
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
                    onClick={handleAddTag}
                    disabled={tags.length >= 13 || !tagInput.trim()}
                    variant="outline"
                    size="sm"
                  >
                    Ekle
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 min-h-[40px]">
                  {tags.map((tag, index) => (
                    <Badge key={index} className="px-3 py-1 flex items-center gap-1">
                      {tag}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => handleRemoveTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {tags.length}/13 etiket eklendi
                </p>
              </div>

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

          {/* Kişiselleştirme Ayarları */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Kişiselleştirme</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="isPersonalizable" 
                  checked={isPersonalizable}
                  onCheckedChange={(checked) => setIsPersonalizable(!!checked)}
                  defaultChecked={true}
                />
                <Label htmlFor="isPersonalizable" className="font-normal">
                  Bu ürün kişiselleştirilebilir
                </Label>
              </div>
              
              {isPersonalizable && (
                <div className="space-y-4 pl-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="personalizationRequired" 
                      checked={personalizationRequired}
                      onCheckedChange={(checked) => setPersonalizationRequired(!!checked)}
                      defaultChecked={false}
                    />
                    <Label htmlFor="personalizationRequired" className="font-normal">
                      Kişiselleştirme zorunlu olsun
                    </Label>
                  </div>
                  
                  <div>
                    <Label htmlFor="personalizationInstructions" className="mb-2 block">
                      Kişiselleştirme Talimatları
                    </Label>
                    <Textarea
                      id="personalizationInstructions"
                      value={personalizationInstructions}
                      onChange={(e) => setPersonalizationInstructions(e.target.value)}
                      placeholder="Alıcıya kişiselleştirme talimatlarınızı yazın"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Karakter sınırı: {personalizationInstructions.length}/256
                    </p>
                  </div>
                </div>
              )}
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
              variant="secondary" 
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
    </Dialog>
  )
} 