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
import { Loader2, Plus, X, Image as ImageIcon, Upload, GripVertical, Layers, Save, ImagePlus } from "lucide-react"
import { Product, CreateProductForm, TaxonomyNode, ShippingProfile, EtsyProcessingProfile, ProductVariation, ProductVariationOption, ProductInventory, ProductInventoryItem, DEFAULT_SIZE_OPTIONS, DEFAULT_FRAME_OPTIONS } from "@/types/product"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import Image from "next/image"

// İki diziyi karşılaştıran yardımcı fonksiyon
const arraysEqual = (a: any[], b: any[]): boolean => {
  if (a === b) return true;
  if (a.length !== b.length) return false;

  const sortedA = [...a].sort();
  const sortedB = [...b].sort();

  return sortedA.every((val, idx) => {
    if (typeof val === "object" && val !== null) {
      return JSON.stringify(val) === JSON.stringify(sortedB[idx]);
    }
    return val === sortedB[idx];
  });
};

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

interface ProductImage {
  file?: File;
  preview: string;
  uploading: boolean;
  error?: string;
}

interface DraggableImageProps {
  image: ProductImage;
  index: number;
  moveImage: (dragIndex: number, hoverIndex: number) => void;
  onRemove: (index: number) => void;
}

// Basit sürüklenebilir görsel bileşeni
const DraggableImage = ({ image, index, moveImage, onRemove }: DraggableImageProps) => {
  // HTML5 sürükleme API'si ile basit sürükle-bırak
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('image-index', index.toString());
    // Sürükleme sırasında gösterilecek bir önizleme ayarla
    if (e.dataTransfer.setDragImage && ref.current) {
      e.dataTransfer.setDragImage(ref.current, 75, 75);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Bırakmayı etkinleştirmek için gerekli
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const draggedIndex = Number(e.dataTransfer.getData('image-index'));
    
    // Geçerli bir sürükleme olduğunu kontrol et
    if (!isNaN(draggedIndex) && draggedIndex !== index) {
      moveImage(draggedIndex, index);
    }
  };

  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative group rounded-lg overflow-hidden"
      style={{ width: "150px", height: "150px", cursor: 'move' }}
    >
      {/* Görsel eklenirken sabit CORS sorunlarını önlemek için crossOrigin="anonymous" ekle */}
      <img
        src={image.preview}
        alt="Product preview"
        className="w-full h-full object-cover pointer-events-none"
        crossOrigin="anonymous"
        loading="lazy"
        draggable={false}
        onError={(e) => {
          // Resim yüklenirken hata oluşursa
          const target = e.target as HTMLImageElement;
          // Yedek görsel URL'si veya boş bir div göster
          target.onerror = null; // Sonsuz döngüyü önle
          target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Crect width='150' height='150' fill='%23f0f0f0'/%3E%3Ctext x='75' y='75' font-family='Arial' font-size='12' text-anchor='middle' alignment-baseline='middle' fill='%23999'%3EResim yüklenemedi%3C/text%3E%3C/svg%3E";
        }}
      />
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <GripVertical className="text-white w-6 h-6 cursor-move" />
      </div>
      <button
        onClick={() => onRemove(index)}
        className="absolute top-2 right-2 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4 text-white" />
      </button>
      {image.uploading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
      )}
      {image.error && (
        <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-xs p-1">
          {image.error}
        </div>
      )}
    </div>
  );
};

// Standart fiyat bilgisi
const DEFAULT_PRICES = {
  // Size => Frame => Price (USD)
  "8\"x12\" - 20x30 cm": {
    "Roll": 80,
    "Standard Canvas": 120,
    "White Frame": 190,
    "Gold Frame": 190,
    "Silver Frame": 190,
    "Black Frame": 190
  },
  "14\"x20\" - 35x50cm": {
    "Roll": 90,
    "Standard Canvas": 130,
    "White Frame": 230,
    "Gold Frame": 230,
    "Silver Frame": 230,
    "Black Frame": 230
  },
  "16\"x24\" - 40x60cm": {
    "Roll": 100,
    "Standard Canvas": 164,
    "White Frame": 280,
    "Gold Frame": 280,
    "Silver Frame": 280,
    "Black Frame": 280
  },
  "20\"x28\" - 50x70cm": {
    "Roll": 150,
    "Standard Canvas": 250,
    "White Frame": 380,
    "Gold Frame": 380,
    "Silver Frame": 380,
    "Black Frame": 380
  },
  "24\"x36\" - 60x90cm": {
    "Roll": 166,
    "Standard Canvas": 290,
    "White Frame": 574,
    "Gold Frame": 574,
    "Silver Frame": 574,
    "Black Frame": 574
  },
  "28\"x40\" - 70x100cm": {
    "Roll": 220,
    "Standard Canvas": 420,
    "White Frame": 780,
    "Gold Frame": 780,
    "Silver Frame": 780,
    "Black Frame": 780
  },
  "32\"x48\" - 80x120cm": {
    "Roll": 260,
    "Standard Canvas": 540,
    "White Frame": 1140,
    "Gold Frame": 1140,
    "Silver Frame": 1140,
    "Black Frame": 1140
  },
  "36\"x51\" - 90x130cm": {
    "Roll": 320,
    "Standard Canvas": 980,
    "White Frame": 1440,
    "Gold Frame": 1440,
    "Silver Frame": 1440,
    "Black Frame": 1440
  }
};

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (product: Partial<Product>, state: "draft" | "active") => Promise<CreateListingResponse>;
  initialData?: Partial<Product>;
  modalTitle?: string;
  submitButtonText?: string;
  isSubmitting?: boolean;
  shippingProfiles: ShippingProfile[];
  processingProfiles: EtsyProcessingProfile[];
  loadingShippingProfiles: boolean;
  loadingProcessingProfiles: boolean;
}

export function ProductFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  modalTitle,
  submitButtonText,
  isSubmitting,
  shippingProfiles,
  processingProfiles,
  loadingShippingProfiles,
  loadingProcessingProfiles
}: ProductFormModalProps) {
  const { toast } = useToast()
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false)
  const [title, setTitle] = useState(initialData?.title || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [price, setPrice] = useState(() => {
    if (!initialData?.price) return 0;
    const { amount = 0, divisor = 1 } = initialData.price;
    return amount / divisor;
  })
  const [quantity, setQuantity] = useState(initialData?.quantity || 1)
  const [shippingProfileId, setShippingProfileId] = useState<string>(
    initialData?.shipping_profile_id?.toString() || ""
  )
  const [processingProfileId, setProcessingProfileId] = useState<string>(
    initialData?.processing_profile_id?.toString() || ""
  )

  // Additional fields to match Etsy
  const [tags, setTags] = useState<string[]>(initialData?.tags || [])
  const [tagInput, setTagInput] = useState("")
  const [materials, setMaterials] = useState<string[]>(initialData?.materials || [])
  const [materialInput, setMaterialInput] = useState("")
  const [isPersonalizable, setIsPersonalizable] = useState(initialData?.is_personalizable || false)
  const [personalizationRequired, setPersonalizationRequired] = useState(initialData?.personalization_is_required || false)
  const [personalizationInstructions, setPersonalizationInstructions] = useState(initialData?.personalization_instructions || "")
  const [primaryColor, setPrimaryColor] = useState(initialData?.primary_color || "")
  const [secondaryColor, setSecondaryColor] = useState(initialData?.secondary_color || "")
  const [width, setWidth] = useState(initialData?.width || 0)
  const [widthUnit, setWidthUnit] = useState(initialData?.width_unit || "cm")
  const [height, setHeight] = useState(initialData?.height || 0)
  const [heightUnit, setHeightUnit] = useState(initialData?.height_unit || "cm")
  const [taxonomyId, setTaxonomyId] = useState(initialData?.taxonomy_id || 0)
  
  // Varyasyon state'leri
  const [hasVariations, setHasVariations] = useState(initialData?.has_variations || false)
  const [variations, setVariations] = useState<ProductVariation[]>(initialData?.variations || [])
  const [inventory, setInventory] = useState<ProductInventory>(initialData?.inventory || {
    products: [],
    price_varies: true,
    quantity_varies: true
  })
  
  // Resim yükleme state'leri
  const [productImages, setProductImages] = useState<ProductImage[]>([])
  const [isDragging, setIsDragging] = useState(false)

  // Effect hooks
  useEffect(() => {
    if (!initialData) return;
    if (!('price' in initialData)) return;
    const productPrice = initialData['price'] as { amount: number; divisor: number } | null;
    if (!productPrice) return;
    const { amount = 0, divisor = 1 } = productPrice;
    if (typeof amount !== 'number') return;
    if (typeof divisor !== 'number') return;

    setPrice(amount / divisor);
  }, [initialData]);

  // Form reset
  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || "");
      setDescription(initialData?.description || "");
      setPrice(
        initialData?.price?.amount && initialData?.price?.divisor
          ? initialData.price.amount / initialData.price.divisor
          : 0
      );
      setQuantity(initialData?.quantity || 1);
      setShippingProfileId(initialData?.shipping_profile_id?.toString() || "");
      setProcessingProfileId(initialData?.processing_profile_id?.toString() || "");
      setTags(initialData?.tags || []);
      setTagInput("");
      setMaterials(initialData?.materials || []);
      setMaterialInput("");
      setIsPersonalizable(initialData?.is_personalizable || false);
      setPersonalizationRequired(initialData?.personalization_is_required || false);
      setPersonalizationInstructions(initialData?.personalization_instructions || "");
      setPrimaryColor(initialData?.primary_color || "");
      setSecondaryColor(initialData?.secondary_color || "");
      setWidth(initialData?.width || 0);
      setWidthUnit(initialData?.width_unit || "cm");
      setHeight(initialData?.height || 0);
      setHeightUnit(initialData?.height_unit || "cm");
      setTaxonomyId(initialData?.taxonomy_id || 0);
      setProductImages([]);
      setHasVariations(initialData?.has_variations || false);
      setVariations(initialData?.variations || []);
      setInventory(initialData?.inventory || {
        products: [],
        price_varies: true,
        quantity_varies: true
      });
    }
  }, [isOpen, initialData]);

  // Etsy görsellerini yerel proxy üzerinden yükle
  const getProxiedImageUrl = (url: string) => {
    if (!url) return url;
    // Eğer bu bir Etsy görseli ise ve CORS sorunu yaşanabilirse, proxy kullan
    if (url.includes('etsystatic.com')) {
      return `/api/etsy/image-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  // Görsel önizlemelerini proxy ile hazırla
  const prepareImages = useCallback(async (initialImages: any[] | undefined) => {
    if (!initialImages || !initialImages.length) return;
    
    try {
      const newImages = await Promise.all(initialImages.map(async (img) => {
        // Eğer bu bir uzak görsel URL'si ise
        if (typeof img === 'string' || (typeof img === 'object' && img.url)) {
          const imgUrl = typeof img === 'string' ? img : img.url;
          const proxyUrl = getProxiedImageUrl(imgUrl);
          
          return {
            file: undefined, // File yok, sadece önizleme
            preview: proxyUrl,
            uploading: false
          };
        }
        
        return null;
      }));
      
      // null değerleri filtrele
      const validImages = newImages.filter(img => img !== null) as ProductImage[];
      
      if (validImages.length > 0) {
        setProductImages(validImages);
      }
    } catch (error) {
      console.error("Resim hazırlama hatası:", error);
    }
  }, []);

  // Resim önizlemelerini yükle
  useEffect(() => {
    if (isOpen && initialData?.images) {
      prepareImages(initialData.images);
    }
  }, [isOpen, initialData?.images, prepareImages]);

  // Resimleri sürükleyip bırakma işleyicisi
  const handleMoveImage = useCallback((dragIndex: number, hoverIndex: number) => {
    setProductImages(prevImages => {
      const newImages = [...prevImages];
      const draggedImage = newImages[dragIndex];
      
      // Sürüklenen öğeyi kaldır
      newImages.splice(dragIndex, 1);
      // Hedef konuma ekle
      newImages.splice(hoverIndex, 0, draggedImage);
      
      return newImages;
    });
  }, []);

  // Form değişikliklerini kontrol et
  const hasUnsavedChanges = () => {
    if (!initialData) return false;

    return (
      title !== initialData.title ||
      description !== initialData.description ||
      price !== initialData.price?.amount ? initialData.price.amount / initialData.price.divisor : 0 ||
      quantity !== initialData.quantity ||
      shippingProfileId !== initialData.shipping_profile_id?.toString() ||
      processingProfileId !== initialData.processing_profile_id?.toString() ||
      !arraysEqual(tags, initialData.tags || []) ||
      !arraysEqual(materials, initialData.materials || []) ||
      isPersonalizable !== initialData.is_personalizable ||
      personalizationRequired !== initialData.personalization_is_required ||
      personalizationInstructions !== initialData.personalization_instructions ||
      primaryColor !== initialData.primary_color ||
      secondaryColor !== initialData.secondary_color ||
      width !== initialData.width ||
      widthUnit !== initialData.width_unit ||
      height !== initialData.height ||
      heightUnit !== initialData.height_unit ||
      taxonomyId !== initialData.taxonomy_id ||
      hasVariations !== initialData.has_variations ||
      !arraysEqual(variations, initialData.variations || [])
    );
  };

  // Modal'ı kapatma işlemi
  const handleClose = () => {
    if (hasUnsavedChanges()) {
      setShowUnsavedChangesDialog(true);
    } else {
      onClose();
    }
  };

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

  // Etiket ve materyal ekleme işlemleri
  const handleTagAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (tags.length >= 13) {
        toast({
          title: "Hata",
          description: "En fazla 13 etiket ekleyebilirsiniz.",
          variant: "destructive",
        });
        return;
      }
      if (tags.includes(tagInput.trim())) {
        toast({
          title: "Hata",
          description: "Bu etiket zaten eklenmiş.",
          variant: "destructive",
        });
        return;
      }
      setTags(prev => [...prev, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleTagRemove = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const handleMaterialAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && materialInput.trim()) {
      e.preventDefault();
      if (materials.length >= 13) {
        toast({
          title: "Hata",
          description: "En fazla 13 materyal ekleyebilirsiniz.",
          variant: "destructive",
        });
        return;
      }
      if (materials.includes(materialInput.trim())) {
        toast({
          title: "Hata",
          description: "Bu materyal zaten eklenmiş.",
          variant: "destructive",
        });
        return;
      }
      setMaterials(prev => [...prev, materialInput.trim()]);
      setMaterialInput("");
    }
  };

  const handleMaterialRemove = (material: string) => {
    setMaterials(prev => prev.filter(m => m !== material));
  };

  // Resim sürükleme işleyicileri
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    // Dosya sürükle-bırak
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const imageFiles = files.filter(file => file.type.startsWith('image/'));
      
      const newImages = imageFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        uploading: false
      }));
      
      setProductImages(prev => [...prev, ...newImages]);
      return;
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const imageFiles = files.filter(file => file.type.startsWith('image/'));
      
      // Her bir resim için preview URL oluştur
      const newImages = imageFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        uploading: false
      }));
      
      setProductImages(prev => [...prev, ...newImages]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setProductImages(prev => {
      const newImages = [...prev];
      const url = newImages[index].preview;
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
      newImages.splice(index, 1);
      return newImages;
    });
  };

  // Varyasyon değişikliklerini yönet
  const handleVariationChange = (
    index: number,
    field: keyof ProductVariation,
    value: string[] | number | string | { value: string; disabled?: boolean }[]
  ) => {
    setVariations(prev => {
      const newVariations = [...prev];
      const variation = newVariations[index];

      switch (field) {
        case "values":
          if (Array.isArray(value) && value.every(v => typeof v === "string")) {
            variation.values = value;
            if (!variation.options) {
              variation.options = [];
            }
            variation.options = value.map(v => ({ value: v }));
          }
          break;
        case "options":
          if (Array.isArray(value) && value.every(v => typeof v === "object" && "value" in v)) {
            variation.options = value;
            variation.values = value.map(v => v.value);
          }
          break;
        case "property_id":
          if (typeof value === "number") {
            variation.property_id = value;
          }
          break;
        case "property_name":
          if (typeof value === "string") {
            variation.property_name = value;
          }
          break;
      }

      return newVariations;
    });

    // Varyasyon matrisi güncelle
    if (field === "values") {
      const updatedInventory = generateVariationMatrix(variations);
      setInventory(updatedInventory);
    }
  };

  // Varyasyon özellik değişikliklerini yönet
  const handleVariationPropertyChange = (
    variationIndex: number,
    optionIndex: number,
    field: "value" | "disabled",
    value: string | boolean
  ) => {
    setVariations(prev => {
      const newVariations = [...prev];
      const variation = newVariations[variationIndex];
      const option = variation.options[optionIndex];

      if (field === "value") {
        option.value = value as string;
        // values alanını da güncelle
        variation.values = variation.options.map(o => o.value);
      } else {
        option.disabled = value as boolean;
      }

      return newVariations;
    });

    // Varyasyon matrisi güncelle
    const updatedInventory = generateVariationMatrix(variations);
    setInventory(updatedInventory);
  };

  // Varyasyon matrisi oluşturma fonksiyonu
  const generateVariationMatrix = (variations: ProductVariation[]): ProductInventory => {
    // Eğer varyasyon yoksa boş matris döndür
    if (!variations.length) {
      return {
        products: [],
        price_varies: false,
        quantity_varies: false
      };
    }

    // Tüm varyasyon kombinasyonlarını oluştur
    const combinations = variations.reduce<string[][]>(
      (acc, variation) => {
        if (!acc.length) {
          return variation.values.map(value => [value]);
        }
        return acc.flatMap(combo => 
          variation.values.map(value => [...combo, value])
        );
      },
      []
    );

    // Her kombinasyon için bir ürün oluştur
    const products = combinations.map(combination => {
      // Otomatik fiyat atama
      let price = 0;
      if (combination.length === 2) {
        const [size, frame] = combination;
        // Linter hatasını önlemek için as const ile type assertion
        const sizeKey = size as keyof typeof DEFAULT_PRICES;
        const frameKey = frame as keyof (typeof DEFAULT_PRICES)[typeof sizeKey];
        if (
          DEFAULT_PRICES[sizeKey] &&
          DEFAULT_PRICES[sizeKey][frameKey]
        ) {
          price = DEFAULT_PRICES[sizeKey][frameKey];
        }
      }

      // Belirli kombinasyonlar için varsayılan olarak devre dışı bırak
      let isEnabled = true;
      if (combination.length === 2) {
        const [size, frame] = combination;
        // 8"x12" - 20x30 cm boyutundaki belirli çerçeve tiplerini devre dışı bırak
        if (size === "8\"x12\" - 20x30 cm" && 
            (frame === "Standard Canvas" || 
             frame === "White Frame" || 
             frame === "Gold Frame" || 
             frame === "Silver Frame" ||
             frame === "Black Frame")) {
          isEnabled = false;
        }
      }

      return {
        property_values: combination.map((value, index) => ({
          property_id: variations[index].property_id,
          property_name: variations[index].property_name,
          value: value
        })),
        price: {
          amount: price * 100,
          divisor: 100,
          currency_code: "USD"
        },
        quantity: 1,
        is_enabled: isEnabled
      };
    });

    return {
      products,
      price_varies: true,
      quantity_varies: true
    };
  };

  // Fiyat değişikliği işleyicisi
  const handlePriceChange = (index: number, price: number) => {
    if (!inventory) return;
    
    const newInventory = {
      ...inventory,
      products: [...inventory.products],
      price_varies: true,
      quantity_varies: false
    };
    
    newInventory.products[index] = {
      ...newInventory.products[index],
      price: {
        amount: Math.round(price * 100),
        divisor: 100,
        currency_code: "USD"
      }
    };
    
    setInventory(newInventory);
  };

  // Görünürlük değişikliği işleyicisi
  const handleVisibilityChange = (index: number, isEnabled: boolean) => {
    if (!inventory) return;
    
    const newInventory = {
      ...inventory,
      products: [...inventory.products],
      price_varies: true,
      quantity_varies: false
    };
    
    newInventory.products[index] = {
      ...newInventory.products[index],
      is_enabled: isEnabled
    };
    
    setInventory(newInventory);
  };

  // Otomatik olarak standart varyasyonları oluşturan fonksiyon
  const setupStandardVariations = () => {
    // Boyut varyasyonu
    const sizeVariation: ProductVariation = {
      property_id: 200,
      property_name: "Size",
      values: [
        "8\"x12\" - 20x30 cm",
        "14\"x20\" - 35x50cm",
        "16\"x24\" - 40x60cm",
        "20\"x28\" - 50x70cm",
        "24\"x36\" - 60x90cm",
        "28\"x40\" - 70x100cm",
        "32\"x48\" - 80x120cm",
        "36\"x51\" - 90x130cm"
      ],
      options: [
        { value: "8\"x12\" - 20x30 cm" },
        { value: "14\"x20\" - 35x50cm" },
        { value: "16\"x24\" - 40x60cm" },
        { value: "20\"x28\" - 50x70cm" },
        { value: "24\"x36\" - 60x90cm" },
        { value: "28\"x40\" - 70x100cm" },
        { value: "32\"x48\" - 80x120cm" },
        { value: "36\"x51\" - 90x130cm" }
      ]
    };

    // Desen varyasyonu
    const patternVariation: ProductVariation = {
      property_id: 502,
      property_name: "Pattern",
      values: [
        "Roll",
        "Standard Canvas",
        "White Frame",
        "Gold Frame",
        "Silver Frame",
        "Black Frame"
      ],
      options: [
        { value: "Roll" },
        { value: "Standard Canvas" },
        { value: "White Frame" },
        { value: "Gold Frame" },
        { value: "Silver Frame" },
        { value: "Black Frame" }
      ]
    };

    // Varyasyonları set et
    setVariations([sizeVariation, patternVariation]);

    // Varyasyon matrisi oluştur
    const matrix = generateVariationMatrix([sizeVariation, patternVariation]);
    setInventory(matrix);
    setHasVariations(true);
  };

  // Varyasyon tablosunu render et
  const renderVariationTable = () => {
    if (!inventory?.products?.length) return null;

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2">Size</th>
              <th className="px-4 py-2">Pattern</th>
              <th className="px-4 py-2">Price</th>
              <th className="px-4 py-2">Visible</th>
            </tr>
          </thead>
          <tbody>
            {inventory.products.map((product, index) => {
              const size = product.property_values.find(pv => pv.property_id === 200)?.value;
              const pattern = product.property_values.find(pv => pv.property_id === 502)?.value;
              
              return (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2">{size}</td>
                  <td className="px-4 py-2">{pattern}</td>
                  <td className="px-4 py-2">
                    <Input
                      type="number"
                      value={product.price.amount / product.price.divisor}
                      onChange={(e) => handlePriceChange(index, parseFloat(e.target.value))}
                      className="w-24"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Switch
                      checked={product.is_enabled}
                      onCheckedChange={(checked) => handleVisibilityChange(index, checked)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Envanter değişikliklerini yönet
  const handleInventoryChange = (index: number, field: keyof ProductInventoryItem, value: any) => {
    setInventory(prev => {
      const newInventory = { ...prev };
      const product = newInventory.products[index];

      if (field === "price") {
        product.price = {
          ...product.price,
          amount: parseFloat(value) * 100
        };
      } else if (field === "quantity") {
        product.quantity = parseInt(value);
      } else if (field === "is_enabled") {
        product.is_enabled = value;
      }

      // Fiyat ve miktar değişkenliğini kontrol et
      const prices = newInventory.products.map(p => p.price.amount);
      const quantities = newInventory.products.map(p => p.quantity);
      
      newInventory.price_varies = !prices.every(p => p === prices[0]);
      newInventory.quantity_varies = !quantities.every(q => q === quantities[0]);

      return newInventory;
    });
  };

  // Varyasyon ekleme
  const handleAddVariation = () => {
    setVariations(prev => [
      ...prev,
      {
        property_id: 0,
        property_name: "",
        values: [],
        options: []
      }
    ]);
  };

  // Varyasyon silme
  const handleRemoveVariation = (index: number) => {
    setVariations(prev => {
      const newVariations = [...prev];
      newVariations.splice(index, 1);
      return newVariations;
    });

    // Varyasyon matrisi güncelle
    const updatedInventory = generateVariationMatrix(variations);
    setInventory(updatedInventory);
  };

  // Tüm varyasyonları devre dışı bırak
  const handleInventoryBulkDisable = () => {
    setInventory(prev => ({
      ...prev,
      products: prev.products.map(product => ({
        ...product,
        is_enabled: false
      }))
    }));
  };

  // Tüm varyasyonların fiyatını güncelle
  const handleInventoryBulkPrice = (value: number) => {
    setInventory(prev => ({
      ...prev,
      products: prev.products.map(product => ({
        ...product,
        price: {
          ...product.price,
          amount: value * 100
        }
      })),
      price_varies: false
    }));
  };

  // Tüm varyasyonların miktarını güncelle
  const handleInventoryBulkQuantity = (value: number) => {
    setInventory(prev => ({
      ...prev,
      products: prev.products.map(product => ({
        ...product,
        quantity: value
      })),
      quantity_varies: false
    }));
  };

  const handleSubmit = async (state: "draft" | "active") => {
    try {
      // İşlem profili kontrolü
      const parsedProcessingProfileId = processingProfileId ? parseInt(processingProfileId) : 0;
      console.log("[PRODUCT_FORM] Processing profile check:", {
        raw: processingProfileId,
        type: typeof processingProfileId,
        parsed: parsedProcessingProfileId,
        isValid: !isNaN(parsedProcessingProfileId) && parsedProcessingProfileId >= 0
      });

      // Form verilerini hazırla
      const formData = {
        title,
        description,
        price: {
          amount: Math.round(price * 100), // USD cents'e çevir
          divisor: 100,
          currency_code: "USD"
        },
        quantity,
        shipping_profile_id: parseInt(shippingProfileId),
        processing_profile_id: parsedProcessingProfileId,
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
        // Varyasyon bilgilerini ekle
        has_variations: hasVariations,
        variations: hasVariations ? variations : undefined,
        inventory: hasVariations ? inventory : undefined
      };

      console.log("[PRODUCT_FORM] Submitting form data:", JSON.stringify({
        ...formData,
        processing_profile_id: formData.processing_profile_id
      }, null, 2));

      // Ürünü oluştur veya güncelle
      const response = await onSubmit(formData, state);
      console.log("[PRODUCT_FORM] API response:", response);

      if (!response.success) {
        throw new Error(response.message || 'İşlem başarısız oldu');
      }

      // Modal'ı kapat
      onClose();

      // Başarı mesajını göster
      toast({
        title: "Başarılı!",
        description: response.message || "İşlem başarıyla tamamlandı",
        variant: "success",
        duration: 5000,
      });
    } catch (error) {
      console.error("[PRODUCT_FORM] Submit error:", error);
      toast({
        title: "Hata!",
        description: error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu",
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
        className={`border-2 border-dashed rounded-lg p-4 text-center ${
          isDragging ? 'border-primary bg-primary/10' : 'border-gray-300'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {productImages.length === 0 ? (
          <>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              id="image-upload"
              onChange={handleImageSelect}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('image-upload')?.click()}
            >
              <ImagePlus className="w-4 h-4 mr-2" />
              Resim Yükle
            </Button>
            <p className="mt-2 text-sm text-gray-500">
              veya sürükleyip bırakın
            </p>
          </>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {productImages.map((image, index) => (
                <DraggableImage
                  key={`image-${index}`}
                  image={image}
                  index={index}
                  moveImage={handleMoveImage}
                  onRemove={handleRemoveImage}
                />
              ))}
              {productImages.length < 10 && (
                <div className="flex items-center justify-center">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    id="image-upload"
                    onChange={handleImageSelect}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    <ImagePlus className="w-4 h-4 mr-2" />
                    Daha Fazla Ekle
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Varyasyon yönetimi arayüzü
  const VariationsSection = () => (
    <div className="space-y-4 border-b pb-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Varyasyonlar</h3>
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="has-variations" 
            checked={hasVariations}
            onCheckedChange={(checked) => setHasVariations(!!checked)}
          />
          <Label htmlFor="has-variations">Varyasyonlar var</Label>
        </div>
      </div>
      
      {hasVariations ? (
        <div className="space-y-4">
          {variations.length > 0 ? (
            <div className="space-y-4">
              {variations.map((variation, index) => (
                <div key={index} className="border rounded-md p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{variation.property_name}</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {variation.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center">
                        <span className="text-sm">{option.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border rounded-md p-4 text-center">
              <p className="text-gray-500">Henüz varyasyon eklenmedi</p>
            </div>
          )}
          
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={setupStandardVariations}
              className="flex items-center"
              disabled={variations.length > 0}
            >
              <Layers className="w-4 h-4 mr-2" />
              Standart Size ve Frame Varyasyonlarını Ekle
            </Button>
          </div>
          
          {renderVariationTable()}
        </div>
      ) : (
        <div className="border rounded-md p-4 text-center">
          <p className="text-gray-500">Varyasyonlar devre dışı. Etkinleştirmek için yukarıdaki kutuyu işaretleyin.</p>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modalTitle || (initialData ? "Ürünü Düzenle" : "Yeni Ürün Oluştur")}</DialogTitle>
            <DialogDescription>
              {initialData ? "Etsy'deki ürün bilgilerinizi düzenleyin." : "Etsy'ye yeni ürün ekleyin."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Görseller Bölümü */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Ürün Görselleri</h3>
              <ImageSection />
            </div>
            
            {/* Temel Bilgiler */}
            <section className="space-y-4 border-b pb-6">
              <h3 className="text-lg font-semibold">Temel Bilgiler</h3>
              <div>
                <Label htmlFor="title">Başlık</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Açıklama</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>
            </section>

            {/* Fiyat & Envanter */}
            <section className="space-y-4 border-b pb-6">
              <h3 className="text-lg font-semibold">Fiyat & Envanter</h3>
              <div>
                <Label htmlFor="price">Fiyat (USD) - Varyasyon yoksa</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={price / 100}
                  onChange={(e) => setPrice(parseFloat(e.target.value) * 100)}
                  required
                  disabled={hasVariations}
                />
                {hasVariations && (
                  <p className="text-xs text-gray-500 mt-1">Varyasyonlar etkin olduğunda fiyatlar varyasyon bölümünden ayarlanır.</p>
                )}
              </div>
              <div>
                <Label htmlFor="quantity">Miktar</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  required
                />
              </div>
              
              {/* Etiketler ve Malzemeler */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div>
                  <Label className="block mb-2">
                    Etiketler <span className="text-gray-500 text-sm">(0-13)</span>
                  </Label>
                  <div className="flex items-center mb-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Etiket ekleyin"
                      onKeyDown={handleTagAdd}
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
                      onKeyDown={handleMaterialAdd}
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
            </section>
            
            {/* Varyasyonlar Bölümü */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Varyasyonlar</h3>
              <VariationsSection />
            </div>
            
            {/* Kargo ve İşlem Profilleri */}
            <section className="space-y-4 border-b pb-6">
              <h3 className="text-lg font-semibold">Kargo & İşlem Profilleri</h3>
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
                
                <div>
                  <Label htmlFor="processing" className="block mb-1">
                    İşlem Profili <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={processingProfileId}
                    onValueChange={setProcessingProfileId}
                    disabled={loadingProcessingProfiles || processingProfiles.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        loadingProcessingProfiles
                          ? "İşlem profilleri yükleniyor..."
                          : processingProfiles.length === 0
                          ? "İşlem profili bulunamadı"
                          : "İşlem profili seçin"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {processingProfiles.map((profile) => (
                        <SelectItem
                          key={profile.processing_profile_id}
                          value={profile.processing_profile_id.toString()}
                        >
                          {profile.title} ({profile.min_processing_days}-{profile.max_processing_days} gün)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              İptal
            </Button>
            <Button
              onClick={() => handleSubmit("draft")}
              disabled={isSubmitting}
              variant="secondary"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                "Taslak Olarak Kaydet"
              )}
            </Button>
            <Button
              onClick={() => handleSubmit("active")}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Yayınlanıyor...
                </>
              ) : (
                "Yayınla"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Kaydedilmemiş değişiklikler için onay dialog'u */}
      <Dialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kaydedilmemiş Değişiklikler</DialogTitle>
            <DialogDescription>
              Kaydedilmemiş değişiklikleriniz var. Çıkmak istediğinizden emin misiniz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnsavedChangesDialog(false)}>
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowUnsavedChangesDialog(false);
                onClose();
              }}
            >
              Çık
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
