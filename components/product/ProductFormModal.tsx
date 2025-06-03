"use client"

import { useState } from "react"
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

  // Form değişikliklerini kontrol et
  const hasUnsavedChanges = () => {
    if (!product) {
      return title !== "" || description !== "" || price !== 0 || quantity !== 1 || 
             shippingProfileId !== "" || processingProfileId !== "" ||
             tags.length > 0 || materials.length > 0
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

  const handleSubmit = async (state: "draft" | "active") => {
    await onSubmit({
      title,
      description,
      price: {
        amount: price,
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
    }, state)
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
                    Adet <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value))}
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

            <Separator />

            {/* Ürün Görselleri */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Ürün Görselleri</h3>
              <div className="border-2 border-dashed rounded-md p-6 text-center">
                <div className="flex flex-col items-center">
                  <ImageIcon className="h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-semibold">Ürün Görselleri</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    En fazla 10 fotoğraf ve 1 video ekleyebilirsiniz
                  </p>
                  <div className="mt-4">
                    <Button type="button" className="flex items-center">
                      <Upload className="mr-2 h-4 w-4" />
                      Fotoğraf Yükle
                    </Button>
                  </div>
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