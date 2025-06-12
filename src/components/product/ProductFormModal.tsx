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
import { ProductMediaSection, MediaFile } from './ProductMediaSection';

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
  const [description, setDescription] = useState(product?.description || "")
  const [price, setPrice] = useState(product?.price?.amount || 0)
  const [quantity, setQuantity] = useState(4)
  const [shippingProfileId, setShippingProfileId] = useState(
    product?.shipping_profile_id?.toString() || ""
  )

  // Additional fields to match Etsy
  const [tags, setTags] = useState(product?.tags || [])
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

  // Dükkan bölümlerini API'den çekmek için useEffect
  useEffect(() => {
    if (isOpen) {
      async function loadShopSections() {
        try {
          const response = await fetch('/api/etsy/shop-sections');
          const data = await response.json();
          if (response.ok && data.sections) {
            setShopSections(data.sections);
            // Eğer ürün düzenleniyorsa onun bölümünü, değilse ilk bölümü seç
            const initialSectionId = product?.shop_section_id?.toString() || data.sections[0]?.shop_section_id.toString() || '';
            setSelectedShopSection(initialSectionId);
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
  }, [isOpen, product]);

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

      // Eğer düzenlenen bir ürün varsa ve görselleri varsa
      if (product?.images?.length) {
        // Etsy API'den gelen ürün görsellerini MediaFile formatına dönüştür
        const newImages = product.images.map((img: any) => ({
          id: crypto.randomUUID(),
          file: undefined, // Etsy API'den gelen görseller için yeni dosya oluşturmaya gerek yok
          preview: img.url_fullxfull || img.url_570xN || img.url || "",
          type: "image" as const
        }));
        setProductImages(newImages);
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
            description: "Fiyat en az $0.20 olmalıdır."
        });
        return;
    }

    // 2. Diğer validasyonlar
    if (!title.trim()) {
        toast({
            variant: "destructive",
            title: "Başlık Gerekli",
            description: "Lütfen ürün için bir başlık girin."
        });
        return;
    }

    if (!shippingProfileId) {
        toast({
            variant: "destructive",
            title: "Kargo Profili Seçilmedi",
            description: "Lütfen bir kargo profili seçin."
        });
        return;
    }

    if (!description.trim()) {
        toast({
            variant: "destructive",
            title: "Açıklama Gerekli",
            description: "Lütfen ürün için bir açıklama girin."
        });
        return;
    }

    if (productImages.length === 0) {
        toast({
            variant: "destructive",
            title: "Resim Gerekli",
            description: "Lütfen en az bir ürün resmi ekleyin."
        });
        return;
    }

    try {
        setSubmitting(true);
        const formData = new FormData();
        
        const listingData = {
            title,
            description,
            price,
            tags,
            shipping_profile_id: Number(shippingProfileId),
            primary_color: primaryColor,
            secondary_color: secondaryColor,
            width,
            width_unit: widthUnit,
            height,
            height_unit: heightUnit,
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
        
        // Sadece file özelliği olan görselleri yükle
        productImages.forEach(image => {
            if (image.file instanceof File) {
                formData.append('imageFiles', image.file);
            }
        });
        
        // Video dosyasını yükle
        if (videoFile?.file instanceof File) {
            formData.append('videoFile', videoFile.file);
        }

        const response = await fetch('/api/etsy/listings/create', {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Sunucu tarafında bilinmeyen bir hata oluştu.');
        }

        toast({ title: "Başarılı!", description: result.message });
        onClose();
        router.refresh();

    } catch (error) {
        toast({ variant: "destructive", title: 'İşlem Başarısız', description: (error as Error).message });
    } finally {
        setSubmitting(false);
    }
  };

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
                  onValueChange={setSelectedShopSection}
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
                <div className="flex items-center mb-2">
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
                    onClick={handleAddTag}
                    disabled={tags.length >= 13 || !newTag.trim()}
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

          <Separator />

          {/* Medya Bölümü */}
          <ProductMediaSection
            productImages={productImages}
            setProductImages={setProductImages}
            videoFile={videoFile}
            setVideoFile={setVideoFile}
            disabled={submitting}
          />
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