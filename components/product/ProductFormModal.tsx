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
  onSubmit: (product: Partial<Product>, state: "draft" | "active") => Promise<CreateListingResponse>
  submitting: boolean
  shippingProfiles: ShippingProfile[]
  processingProfiles: EtsyProcessingProfile[]
  loadingShippingProfiles: boolean
  loadingProcessingProfiles: boolean
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
  processingProfiles,
  loadingShippingProfiles,
  loadingProcessingProfiles
}: ProductFormModalProps) {
  const { toast } = useToast()
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false)
  const [title, setTitle] = useState(product?.title || "")
  const [description, setDescription] = useState(product?.description || "")
  const [price, setPrice] = useState(product?.price?.amount || 0)
  const [quantity, setQuantity] = useState(product?.quantity || 1)
  const [shippingProfileId, setShippingProfileId] = useState<string>(
    product?.shipping_profile_id?.toString() || ""
  )
  const [processingProfileId, setProcessingProfileId] = useState<string>(
    product?.processing_profile_id?.toString() || ""
  )

  // Additional fields to match Etsy
  const [tags, setTags] = useState<string[]>(product?.tags || [])
  const [tagInput, setTagInput] = useState("")
  const [materials, setMaterials] = useState<string[]>(product?.materials || [])
  const [materialInput, setMaterialInput] = useState("")
  const [isPersonalizable, setIsPersonalizable] = useState(product?.is_personalizable || false)
  const [personalizationRequired, setPersonalizationRequired] = useState(product?.personalization_is_required || false)
  const [personalizationInstructions, setPersonalizationInstructions] = useState(product?.personalization_instructions || "")
  const [primaryColor, setPrimaryColor] = useState(product?.primary_color || "")
  const [secondaryColor, setSecondaryColor] = useState(product?.secondary_color || "")
  const [width, setWidth] = useState(product?.width || 0)
  const [widthUnit, setWidthUnit] = useState(product?.width_unit || "cm")
  const [height, setHeight] = useState(product?.height || 0)
  const [heightUnit, setHeightUnit] = useState(product?.height_unit || "cm")
  const [taxonomyId, setTaxonomyId] = useState(product?.taxonomy_id || 0)
  
  // Ürün görselleri için state
  const [productImages, setProductImages] = useState<{
    file: File;
    preview: string;
    uploading: boolean;
    error?: string;
  }[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Reset form when modal opens/closes or product changes
  useEffect(() => {
    if (isOpen) {
      setTitle(product?.title || "");
      setDescription(product?.description || "");
      setPrice(product?.price?.amount || 0);
      setQuantity(product?.quantity || 1);
      setShippingProfileId(product?.shipping_profile_id?.toString() || "");
      setProcessingProfileId(product?.processing_profile_id?.toString() || "");
      setTags(product?.tags || []);
      setTagInput("");
      setMaterials(product?.materials || []);
      setMaterialInput("");
      setIsPersonalizable(product?.is_personalizable || false);
      setPersonalizationRequired(product?.personalization_is_required || false);
      setPersonalizationInstructions(product?.personalization_instructions || "");
      setPrimaryColor(product?.primary_color || "");
      setSecondaryColor(product?.secondary_color || "");
      setWidth(product?.width || 0);
      setWidthUnit(product?.width_unit || "cm");
      setHeight(product?.height || 0);
      setHeightUnit(product?.height_unit || "cm");
      setTaxonomyId(product?.taxonomy_id || 0);
      setProductImages([]);
      setIsDragging(false);
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
      return title !== "" || description !== "" || price !== 0 || quantity !== 1 || 
             shippingProfileId !== "" || processingProfileId !== "" ||
             tags.length > 0 || materials.length > 0 || productImages.length > 0
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

  const handleSubmit = async (state: "draft" | "active") => {
    try {
      // İşlem profili kontrolü
      const parsedProcessingProfileId = processingProfileId ? parseInt(processingProfileId) : 0;
      console.log("[PRODUCT_FORM] Processing profile check:", {
        raw: processingProfileId,
        type: typeof processingProfileId,
        parsed: parsedProcessingProfileId,
        isValid: !isNaN(parsedProcessingProfileId) && parsedProcessingProfileId > 0
      });

      if (isNaN(parsedProcessingProfileId) || parsedProcessingProfileId <= 0) {
        throw new Error("Lütfen geçerli bir işlem profili seçin. Bu alan zorunludur.");
      }

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
        processing_profile_id: parsedProcessingProfileId, // Parse edilmiş değeri kullan
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
        taxonomy_id: taxonomyId
      };

      console.log("[PRODUCT_FORM] Submitting form data:", JSON.stringify({
        ...formData,
        processing_profile_id: formData.processing_profile_id
      }, null, 2));

      // Ürünü oluştur
      const response = await onSubmit(formData, state);
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
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Varyasyonlar</h3>
                <div className="border-2 border-dashed rounded-md p-6">
                  <div className="flex flex-col space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Ürün Varyasyonları</h4>
                        <p className="text-sm text-gray-500">
                          Renk, boyut, çerçeve gibi farklı seçenekler ekleyin
                        </p>
                      </div>
                      <Button type="button" variant="outline" size="sm" className="flex items-center">
                        <Plus className="mr-2 h-4 w-4" />
                        Varyasyon Ekle
                      </Button>
                    </div>
                    
                    {/* Boş varyasyon bölümü */}
                    <div className="flex items-center justify-center h-32 border rounded-md border-dashed">
                      <div className="text-center">
                        <p className="text-gray-500 mb-2">Henüz varyasyon eklenmemiş</p>
                        <Button type="button" variant="outline" size="sm" className="flex items-center mx-auto">
                          <Plus className="mr-2 h-4 w-4" />
                          İlk Varyasyonu Ekle
                        </Button>
                      </div>
                    </div>
                    
                    {/* Varyasyon ayarları - gizli, sadece varyasyon eklenince görünecek */}
                    <div className="hidden border-t pt-4 space-y-4">
                      <h4 className="font-medium">Varyasyon Ayarları</h4>
                      
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <Checkbox id="price-vary" />
                          <Label htmlFor="price-vary" className="ml-2 font-normal">
                            Fiyatlar varyasyona göre değişir
                          </Label>
                        </div>
                        
                        <div className="flex items-center">
                          <Checkbox id="processing-vary" />
                          <Label htmlFor="processing-vary" className="ml-2 font-normal">
                            İşlem profilleri varyasyona göre değişir 
                            <Badge className="ml-2 bg-blue-100 text-blue-800 hover:bg-blue-200">Yeni</Badge>
                          </Label>
                        </div>
                        
                        <div className="flex items-center">
                          <Checkbox id="quantity-vary" />
                          <Label htmlFor="quantity-vary" className="ml-2 font-normal">
                            Stok miktarları varyasyona göre değişir
                          </Label>
                        </div>
                        
                        <div className="flex items-center">
                          <Checkbox id="sku-vary" />
                          <Label htmlFor="sku-vary" className="ml-2 font-normal">
                            SKU'lar varyasyona göre değişir
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

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