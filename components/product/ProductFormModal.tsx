"use client"

import { useState, useCallback, useEffect } from "react"
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
import { Loader2, Plus, X, Image as ImageIcon, Upload } from "lucide-react"
import { Product, CreateProductForm, TaxonomyNode, ShippingProfile, EtsyProcessingProfile } from "@/types/product"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"

interface ProductFormModalProps {
  isOpen: boolean
  onClose: () => void
  product?: Product
  onSubmit: (product: Partial<Product>, state: "draft" | "active") => Promise<void>
  submitting: boolean
  shippingProfiles: ShippingProfile[]
  processingProfiles: EtsyProcessingProfile[]
  loadingShippingProfiles: boolean
  loadingProcessingProfiles: boolean
}

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
  const [productImages, setProductImages] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)

  // Reset form when modal opens/closes or product changes
  useEffect(() => {
    if (isOpen) {
      // If product is provided, set fields to product values, otherwise reset to defaults
      setTitle(product?.title || "")
      setDescription(product?.description || "")
      setPrice(product?.price?.amount || 0)
      setQuantity(product?.quantity || 1)
      setShippingProfileId(product?.shipping_profile_id?.toString() || "")
      setProcessingProfileId(product?.processing_profile_id?.toString() || "")
      setTags(product?.tags || [])
      setTagInput("")
      setMaterials(product?.materials || [])
      setMaterialInput("")
      setIsPersonalizable(product?.is_personalizable || false)
      setPersonalizationRequired(product?.personalization_is_required || false)
      setPersonalizationInstructions(product?.personalization_instructions || "")
      setPrimaryColor(product?.primary_color || "")
      setSecondaryColor(product?.secondary_color || "")
      setWidth(product?.width || 0)
      setWidthUnit(product?.width_unit || "cm")
      setHeight(product?.height || 0)
      setHeightUnit(product?.height_unit || "cm")
      setTaxonomyId(product?.taxonomy_id || 0)
      setProductImages([])
      setIsDragging(false)
    }
  }, [isOpen, product])

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

  // Drag and drop işleyicileri
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.files) {
      setIsDragging(true)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files).filter(file => 
        file.type.startsWith('image/') && productImages.length + e.dataTransfer.files.length <= 10
      )
      setProductImages(prev => [...prev, ...newFiles])
      e.dataTransfer.clearData()
    }
  }, [productImages])

  // Dosya yükleme işleyicisi
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const newFiles = Array.from(files).filter(file => 
        file.type.startsWith('image/') && productImages.length + files.length <= 10
      )
      setProductImages(prev => [...prev, ...newFiles])
      // Input değerini sıfırla ki aynı dosyaları tekrar seçebilsin
      e.target.value = ''
    }
  }

  // Görsel kaldırma
  const handleRemoveImage = (index: number) => {
    setProductImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (state: "draft" | "active") => {
    try {
      // Ensure price has a valid default value if not provided
      const priceAmount = price || 1; // Default to 1 USD if price is not set
      
      // Send only the essential product data without including the File objects
      const productData = {
        title,
        description,
        price: {
          amount: priceAmount * 100, // Convert to cents and ensure it's not null
          divisor: 100,
          currency_code: "USD"
        },
        quantity,
        shipping_profile_id: parseInt(shippingProfileId),
        processing_profile_id: parseInt(processingProfileId),
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
        state
      };
      
      console.log("Submitting product with processing profile ID:", processingProfileId);
      
      // Pass the product data to create the listing
      const createdProduct = await onSubmit(productData, state);
      
      let successMessage = "Ürün başarıyla oluşturuldu";
      let hasUploadedImages = false;
      let uploadErrorCount = 0;
      let uploadedImageIds: string[] = [];
      const maxRetries = 2; // Allow up to 2 retries (3 attempts total)
      
      // Show initial toast for product creation
      toast({
        title: "Başarılı!",
        description: "Ürün oluşturuldu, resimler yükleniyor...",
        variant: "default"
      });
      
      // If we have images and the product was created successfully
      if (productImages.length > 0 && createdProduct && typeof createdProduct === 'object') {
        const listingId = (createdProduct as any).listing_id;
        
        if (listingId) {
          console.log("Product created with listing ID:", listingId, "- Uploading images...");
          
          // Upload images one by one with increased delay
          for (let i = 0; i < productImages.length; i++) {
            let retryCount = 0;
            let uploadSuccess = false;
            
            // Show progress toast
            toast({
              title: "Resim Yükleniyor",
              description: `Resim ${i+1}/${productImages.length} yükleniyor...`,
              variant: "default"
            });
            
            while (retryCount <= maxRetries && !uploadSuccess) {
              try {
                const formData = new FormData();
                formData.append('image', productImages[i]);
                formData.append('rank', i.toString());
                
                console.log(`Uploading image ${i+1}/${productImages.length} for listing ${listingId}... (Attempt ${retryCount + 1}/${maxRetries + 1})`);
                
                // Add a longer delay between uploads to prevent race conditions
                if (i > 0) {
                  await new Promise(resolve => setTimeout(resolve, 3000)); // Increased from 2000 to 3000ms
                }
                
                const uploadResponse = await fetch(`/api/etsy/listings/${listingId}/images`, {
                  method: 'POST',
                  body: formData,
                  cache: 'no-store' // Prevent caching
                });
                
                console.log(`Image upload response status: ${uploadResponse.status}`);
                
                if (!uploadResponse.ok) {
                  throw new Error(`Upload failed with status: ${uploadResponse.status}`);
                }
                
                const responseText = await uploadResponse.text();
                let responseData;
                
                try {
                  responseData = responseText ? JSON.parse(responseText) : null;
                  console.log(`Image upload response:`, responseData);
                  
                  if (responseData?.success && responseData?.uploaded_image_id) {
                    uploadSuccess = true;
                    hasUploadedImages = true;
                    uploadedImageIds.push(responseData.uploaded_image_id);
                    console.log(`Successfully uploaded image ${i+1}, ID: ${responseData.uploaded_image_id}`);
                    
                    // Show success toast for each image
                    toast({
                      title: "Resim Yüklendi",
                      description: `Resim ${i+1}/${productImages.length} başarıyla yüklendi`,
                      variant: "success"
                    });
                    
                    // Add a delay after successful upload to allow Etsy to process
                    await new Promise(resolve => setTimeout(resolve, 2000));
                  } else {
                    throw new Error(`Upload response indicates failure: ${JSON.stringify(responseData)}`);
                  }
                } catch (parseError) {
                  console.error(`Failed to parse response or upload unsuccessful:`, parseError);
                  throw parseError;
                }
              } catch (uploadError) {
                console.error(`Error uploading image ${i+1} (Attempt ${retryCount + 1}/${maxRetries + 1}):`, uploadError);
                retryCount++;
                
                if (retryCount <= maxRetries) {
                  console.log(`Retrying upload for image ${i+1} in 3 seconds...`);
                  toast({
                    title: "Yeniden Deneniyor",
                    description: `Resim ${i+1} yüklenirken hata oluştu, yeniden deneniyor...`,
                    variant: "default"
                  });
                  await new Promise(resolve => setTimeout(resolve, 3000));
                } else {
                  uploadErrorCount++;
                  console.error(`Failed to upload image ${i+1} after all attempts`);
                  toast({
                    title: "Hata",
                    description: `Resim ${i+1} yüklenemedi`,
                    variant: "destructive"
                  });
                }
              }
            }
          }
          
          // After all uploads, verify images are attached with increased wait time
          if (hasUploadedImages) {
            console.log(`Uploaded ${productImages.length - uploadErrorCount}/${productImages.length} images. Verifying...`);
            
            toast({
              title: "Doğrulanıyor",
              description: "Resimler yüklendi, Etsy'de görüntülenmesi bekleniyor...",
              variant: "default"
            });
            
            // Wait longer for Etsy to process the images
            await new Promise(resolve => setTimeout(resolve, 8000)); // Increased from 5000 to 8000ms
            
            let verificationAttempts = 0;
            const maxVerificationAttempts = 3;
            let imagesVerified = false;
            
            while (verificationAttempts < maxVerificationAttempts && !imagesVerified) {
              try {
                const verifyResponse = await fetch(`/api/etsy/listings/${listingId}?verify_images=true`, {
                  cache: 'no-store' // Prevent caching
                });
                if (verifyResponse.ok) {
                  const verifyData = await verifyResponse.json();
                  const hasImages = verifyData?.listing?.images && verifyData.listing.images.length > 0;
                  
                  if (hasImages) {
                    console.log(`Verification successful: ${verifyData.listing.images.length} images attached`);
                    imagesVerified = true;
                    toast({
                      title: "Başarılı!",
                      description: "Resimler başarıyla yüklendi ve ürüne eklendi.",
                      variant: "success"
                    });
                  } else {
                    console.warn(`Verification attempt ${verificationAttempts + 1} shows no images attached to listing`);
                    verificationAttempts++;
                    
                    if (verificationAttempts < maxVerificationAttempts) {
                      console.log(`Waiting 5 seconds before next verification attempt...`);
                      toast({
                        title: "Doğrulanıyor",
                        description: "Resimler işleniyor, lütfen bekleyin...",
                        variant: "default"
                      });
                      await new Promise(resolve => setTimeout(resolve, 5000));
                    } else {
                      toast({
                        title: "Bilgi",
                        description: "Resimler yüklendi ancak Etsy'de görüntülenmesi birkaç dakika sürebilir. Lütfen sayfayı yenileyin veya birkaç dakika sonra tekrar kontrol edin.",
                        variant: "default"
                      });
                      
                      // Schedule a refresh after 30 seconds
                      setTimeout(() => {
                        window.location.reload();
                      }, 30000);
                    }
                  }
                }
              } catch (verifyError) {
                console.warn(`Failed to verify images:`, verifyError);
                verificationAttempts++;
                
                if (verificationAttempts >= maxVerificationAttempts) {
                  toast({
                    title: "Uyarı",
                    description: "Resimler yüklendi ancak doğrulama yapılamadı. Lütfen birkaç dakika sonra Etsy'de kontrol edin.",
                    variant: "destructive"
                  });
                  
                  // Schedule a refresh after 30 seconds
                  setTimeout(() => {
                    window.location.reload();
                  }, 30000);
                }
              }
            }
          }
        } else {
          console.error("No listing_id found in created product:", createdProduct);
          toast({
            title: "Hata",
            description: "Ürün oluşturuldu ancak resimler yüklenemedi. Listing ID bulunamadı.",
            variant: "destructive"
          });
        }
      }
      
      // Show final success toast
      if (state === "draft") {
        successMessage = "Ürün taslak olarak kaydedildi";
      }
      
      if (hasUploadedImages) {
        if (uploadErrorCount > 0) {
          successMessage += ` (${productImages.length - uploadErrorCount}/${productImages.length} görsel yüklendi)`;
        } else {
          successMessage += " ve görseller yüklendi";
        }
      } else if (productImages.length > 0) {
        successMessage += " fakat görseller yüklenemedi";
      }
      
      toast({
        variant: "success",
        title: "Başarılı!",
        description: successMessage
      });
      
      // Close the modal
      onClose();
      
    } catch (error) {
      console.error("Form gönderimi sırasında hata:", error);
      
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Ürün oluşturulamadı. Lütfen tekrar deneyin."
      });
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {product ? `Ürünü Düzenle: ${product.title}` : "Yeni Ürün Ekle"}
            </DialogTitle>
            <DialogDescription>
              {product ? "Bu ürünün detaylarını düzenleyin." : "Yeni bir ürün ekleyin."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Ürün Görselleri */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Ürün Görselleri</h3>
              <div 
                className={`border-2 border-dashed rounded-md p-6 transition-colors duration-300 ${
                  isDragging ? "border-primary bg-primary/5" : "border-gray-300"
                }`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {productImages.length === 0 ? (
                  <div className="flex flex-col items-center text-center">
                    <ImageIcon className="h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold">Ürün Görselleri</h3>
                    <p className="mt-1 text-xs text-gray-500">
                      En fazla 10 fotoğraf ekleyebilirsiniz
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Dosyaları sürükleyip bırakarak veya seçerek yükleyebilirsiniz
                    </p>
                    <label htmlFor="file-upload" className="mt-4">
                      <div className="flex items-center cursor-pointer">
                        <Button type="button" className="flex items-center" asChild>
                          <span>
                            <Upload className="mr-2 h-4 w-4" />
                            Fotoğraf Yükle
                          </span>
                        </Button>
                      </div>
                      <input
                        id="file-upload"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-semibold">Yüklenen Görseller ({productImages.length}/10)</h3>
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Button type="button" variant="outline" size="sm" className="flex items-center" asChild>
                          <span>
                            <Plus className="mr-2 h-4 w-4" />
                            Daha Fazla Ekle
                          </span>
                        </Button>
                        <input
                          id="file-upload"
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleFileChange}
                          className="sr-only"
                        />
                      </label>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {productImages.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="relative group">
                          <div className="aspect-square rounded-md overflow-hidden border border-gray-200">
                            <img 
                              src={URL.createObjectURL(file)} 
                              alt={`Ürün görseli ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </button>
                          {index === 0 && (
                            <span className="absolute bottom-1 left-1 bg-primary text-white text-xs px-2 py-0.5 rounded">
                              Ana Görsel
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="text-xs text-gray-500 text-center">
                      {isDragging ? (
                        <p>Görselleri buraya bırakın</p>
                      ) : (
                        <p>Daha fazla görsel eklemek için sürükleyip bırakabilirsiniz</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

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
                    {product ? 'Güncelleniyor...' : 'Ürünü Oluştur'}
                  </>
                ) : (
                  product ? 'Güncelle' : 'Ürünü Oluştur'
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showUnsavedChangesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kaydedilmemiş Değişiklikler</AlertDialogTitle>
            <AlertDialogDescription>
              Kaydedilmemiş değişiklikleriniz var. Formu kapatmak istediğinizden emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowUnsavedChangesDialog(false)}>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowUnsavedChangesDialog(false)
              onClose()
            }}>Tamam</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 