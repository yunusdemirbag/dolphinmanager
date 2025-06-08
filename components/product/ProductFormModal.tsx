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
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
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

// Sabit Art & Collectibles kategori ID - Bu Etsy'de geçerli bir kategori ID'sidir
const DIGITAL_PRINTS_TAXONOMY_ID = 4;  // Digital Prints kategorisi

// Default materials
const DEFAULT_MATERIALS = ["Polycotton canvas", "Pigmented ink", "Wooden stretcher", "Frame", "Staples"];

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
  const [quantity, setQuantity] = useState(product?.quantity || 4)
  const [shippingProfileId, setShippingProfileId] = useState(
    product?.shipping_profile_id?.toString() || ""
  )

  // Additional fields to match Etsy
  const [tags, setTags] = useState(product?.tags || [])
  const [tagInput, setTagInput] = useState("")
  const [materials, setMaterials] = useState(product?.materials || DEFAULT_MATERIALS)
  const [materialInput, setMaterialInput] = useState("")
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
  const [taxonomyId, setTaxonomyId] = useState(product?.taxonomy_id || DIGITAL_PRINTS_TAXONOMY_ID)
  
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
      setQuantity(product?.quantity || 4);
      setShippingProfileId(product?.shipping_profile_id?.toString() || "");
      setTags(product?.tags || []);
      setTagInput("");
      setMaterials(product?.materials || DEFAULT_MATERIALS);
      setMaterialInput("");
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
      setTaxonomyId(product?.taxonomy_id || DIGITAL_PRINTS_TAXONOMY_ID);
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

      // Shop Section'ı sıfırla
      setSelectedShopSection("0");
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
             shippingProfileId !== "" || tags.length > 0 || materials.length > 0 || productImages.length > 0
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

  // Material ekleme
  const handleAddMaterial = () => {
    if (materialInput.trim() && materials.length < 5) {
      setMaterials([...materials, materialInput.trim()])
      setMaterialInput("")
    }
  }

  // Material silme
  const handleRemoveMaterial = (material: string) => {
    setMaterials(materials.filter(m => m !== material))
  }

  // Resim yükleme işleyicileri
  const handleImageDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    let files: File[] = [];
    if (e.dataTransfer.items) {
      // Modern browser
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        if (e.dataTransfer.items[i].kind === 'file') {
          const file = e.dataTransfer.items[i].getAsFile();
          if (file) files.push(file);
        }
      }
    } else {
      // Fallback
      files = Array.from(e.dataTransfer.files);
    }

    files = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      return validTypes.includes(file.type);
    });

    if (productImages.length + files.length > 10) {
      toast({
        title: "Maksimum Limit",
        description: "En fazla 10 resim yükleyebilirsiniz.",
        variant: "destructive"
      });
      return;
    }

    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: false
    }));

    setProductImages(prev => [...prev, ...newImages]);
  }, [productImages.length, toast]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const files = Array.from(e.target.files).filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      return validTypes.includes(file.type);
    });

    if (productImages.length + files.length > 10) {
      toast({
        title: "Maksimum Limit",
        description: "En fazla 10 resim yükleyebilirsiniz.",
        variant: "destructive"
      });
      return;
    }

    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: false
    }));

    setProductImages(prev => [...prev, ...newImages]);
    e.target.value = ''; // Input'u sıfırla
  }, [productImages.length, toast]);

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

  const handleSubmit = async (state: "draft" | "active") => {
    try {
      // Form verilerini hazırla
      const productData = {
        title,
        description,
        price: {
          amount: Math.round(price * 100), // USD cents'e çevir
          divisor: 100,
          currency_code: "USD"
        },
        quantity,
        shipping_profile_id: parseInt(shippingProfileId),
        tags,
        materials,
        is_personalizable: isPersonalizable,
        personalization_is_required: personalizationRequired,
        personalization_instructions: personalizationInstructions,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        width,
        width_unit: widthUnit,
        height,
        height_unit: heightUnit,
        taxonomy_id: taxonomyId,
        variations: hasVariations ? variations.filter((v: any) => v.is_active) : undefined,
        shop_section_id: parseInt(selectedShopSection || "0"), // Varsayılan olarak 0 (Home) bölümünü kullan
        state: state,
      };

      // Ürünü oluştur
      const response = await onSubmit(productData, state);
      console.log("[PRODUCT_FORM] Listing created:", response);

      // listing_id'yi doğru şekilde al
      const listingId = response.listing?.listing_id || response.listing_id;
      if (!listingId) {
        throw new Error("Ürün oluşturuldu ancak ID alınamadı. Lütfen sayfayı yenileyip tekrar deneyin.");
      }

      // Başarılı ürün oluşturma bildirimi
      toast({
        title: state === "draft" ? "Ürün Taslak Olarak Kaydedildi" : "Ürün Başarıyla Yayınlandı",
        description: `"${title}" ${state === "draft" ? "taslak olarak kaydedildi" : "başarıyla yayınlandı"}. ${productImages.length > 0 ? "Resimler yükleniyor..." : ""}`,
        variant: "success",
        duration: 3000,
      });

      // Resimleri yükle
      if (productImages.length > 0) {
        console.log(`[PRODUCT_FORM] Uploading ${productImages.length} images for listing ${listingId}`);

        for (let i = 0; i < productImages.length; i++) {
          try {
            // Resim durumunu güncelle
            setProductImages(prev => {
              const newImages = [...prev];
              newImages[i] = { ...newImages[i], uploading: true, error: undefined };
              return newImages;
            });

            // İlerleme göster
            toast({
              title: "Resim Yükleniyor",
              description: `Resim ${i + 1}/${productImages.length} yükleniyor...`,
              variant: "default",
              duration: 2000,
            });

            // Resimler arasında bekle
            if (i > 0) {
              console.log(`[PRODUCT_FORM] Waiting before uploading next image...`);
              await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Form verilerini hazırla
            const formData = new FormData();
            formData.append('image', productImages[i].file);
            formData.append('rank', (i + 1).toString());

            // Resmi yükle - CORS sorunları için retry mekanizması
            console.log(`[PRODUCT_FORM] Uploading image ${i + 1}/${productImages.length}`);
            
            // Upload with retry mechanism
            let uploadResponse = null;
            let retryCount = 0;
            const MAX_RETRIES = 3;
            
            while (retryCount < MAX_RETRIES && !uploadResponse) {
              try {
                if (retryCount > 0) {
                  console.log(`[PRODUCT_FORM] Retry attempt ${retryCount} for image ${i + 1}`);
                  // Exponential backoff for retries
                  await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
                  
                  toast({
                    title: "Yükleme Yeniden Deneniyor",
                    description: `Resim ${i + 1} için yükleme yeniden deneniyor (${retryCount}/${MAX_RETRIES})...`,
                    variant: "default",
                    duration: 2000,
                  });
                }
                
                // Add a timestamp parameter to avoid caching
                uploadResponse = await fetch(`/api/etsy/listings/${listingId}/images?t=${Date.now()}`, {
                  method: 'POST',
                  body: formData,
                  credentials: 'same-origin',
                  cache: 'no-store'
                });
                
              } catch (error) {
                console.error(`[PRODUCT_FORM] Network error on attempt ${retryCount + 1}:`, error);
                retryCount++;
                
                if (retryCount >= MAX_RETRIES) {
                  throw new Error(`Network error after ${MAX_RETRIES} attempts: ${error instanceof Error ? error.message : String(error)}`);
                }
              }
            }

            if (!uploadResponse || !uploadResponse.ok) {
              const errorText = uploadResponse ? await uploadResponse.text() : "No response";
              throw new Error(`Upload failed: ${uploadResponse?.status || 'No response'} - ${errorText}`);
            }

            const uploadData = await uploadResponse.json();
            
            if (!uploadData.success) {
              throw new Error(uploadData.error || "Upload failed");
            }

            // Resim durumunu başarılı olarak güncelle
            setProductImages(prev => {
              const newImages = [...prev];
              newImages[i] = { ...newImages[i], uploading: false, error: undefined };
              return newImages;
            });

          } catch (error) {
            console.error(`[PRODUCT_FORM] Error uploading image ${i + 1}:`, error);
            setProductImages(prev => {
              const newImages = [...prev];
              newImages[i] = { ...newImages[i], uploading: false, error: error instanceof Error ? error.message : 'Upload failed' };
              return newImages;
            });
            
            toast({
              title: "Resim Yükleme Hatası",
              description: `Resim ${i + 1} yüklenirken hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
              variant: "destructive",
              duration: 5000,
            });
            
            // Continue with next image rather than stopping entirely
            continue;
          }
        }
      }

      // Check if any images failed
      const failedImages = productImages.filter(img => img.error);
      
      // Tüm işlemler tamamlandı bildirimi
      toast({
        title: "İşlem Tamamlandı",
        description: `"${title}" ürünü ${failedImages.length > 0 
          ? `eklendi, fakat ${failedImages.length} resim yüklenemedi` 
          : `ve ${productImages.length} resim başarıyla eklendi`}`,
        variant: failedImages.length > 0 ? "default" : "success",
        duration: 5000,
      });

      // Formu kapat
      onClose();

    } catch (error) {
      console.error("[PRODUCT_FORM] Error:", error);
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Bir hata oluştu",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  // Resim bölümü
  const ImageSection = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Ürün Görselleri</h3>
        <div className="text-sm text-gray-500">
          {productImages.length}/10 resim
        </div>
      </div>

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
        {productImages.length === 0 ? (
          <div className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium mb-1">Resimleri buraya sürükleyin</p>
            <p className="text-sm text-gray-500 mb-4">veya</p>
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              id="image-upload"
              onChange={(e) => e.target.files && handleImageSelect(e)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('image-upload')?.click()}
            >
              Bilgisayardan Seçin
            </Button>
            <p className="text-xs text-gray-500 mt-4">
              PNG, JPG veya GIF • Resim başına max. 20MB
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
                onClick={() => document.getElementById('image-upload')?.click()}
                className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <Upload className="w-6 h-6 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">Resim Ekle</span>
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
    <>
      <Dialog open={isOpen} onOpenChange={() => handleCloseModal()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {product ? `Ürünü Düzenle: ${product.title}` : "Yeni Ürün Ekle"}
            </DialogTitle>
            <DialogDescription>
              {product ? "Bu ürünün detaylarını düzenleyin." : "Yeni bir ürün ekleyin."}
            </DialogDescription>
          </DialogHeader>

          <DndProvider backend={HTML5Backend}>
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
                      onChange={(e) => setQuantity(parseInt(e.target.value))}
                      min="1"
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
                    <Label htmlFor="taxonomy" className="block mb-1">
                      Kategori <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={taxonomyId.toString()}
                      onValueChange={(value) => setTaxonomyId(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Kategori seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={DIGITAL_PRINTS_TAXONOMY_ID.toString()}>Digital Prints</SelectItem>
                        <SelectItem value="2">Art & Collectibles</SelectItem>
                        <SelectItem value="3">Home & Living</SelectItem>
                        <SelectItem value="4">Home Decor</SelectItem>
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
                        {shopSections.map(section => (
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

                  <div>
                    <Label className="block mb-2">
                      Malzemeler <span className="text-gray-500 text-sm">(0-5)</span>
                    </Label>
                    <div className="flex items-center mb-2">
                      <Input
                        value={materialInput}
                        onChange={(e) => setMaterialInput(e.target.value)}
                        placeholder="Malzeme ekleyin"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddMaterial();
                          }
                        }}
                        className="mr-2"
                      />
                      <Button 
                        type="button" 
                        onClick={handleAddMaterial}
                        disabled={materials.length >= 5 || !materialInput.trim()}
                        variant="outline"
                        size="sm"
                      >
                        Ekle
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2 min-h-[40px]">
                      {materials.map((material, index) => (
                        <Badge key={index} className="px-3 py-1 flex items-center gap-1">
                          {material}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => handleRemoveMaterial(material)}
                          />
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {materials.length}/5 malzeme eklendi
                    </p>
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
          </DndProvider>

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
    </>
  )
} 