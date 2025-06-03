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
import { Loader2 } from "lucide-react"
import { Product, CreateProductForm, TaxonomyNode, ShippingProfile, EtsyProcessingProfile } from "@/types/product"
import { ProductFormSections } from "./ProductFormSections"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

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

  // Form değişikliklerini kontrol et
  const hasUnsavedChanges = () => {
    if (!product) {
      return title !== "" || description !== "" || price !== 0 || quantity !== 1 || 
             shippingProfileId !== "" || processingProfileId !== ""
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

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Başlık
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Açıklama
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                Fiyat
              </Label>
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                Adet
              </Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="shipping" className="text-right">
                Kargo Profili
              </Label>
              <Select
                value={shippingProfileId}
                onValueChange={setShippingProfileId}
                disabled={loadingShippingProfiles || shippingProfiles.length === 0}
              >
                <SelectTrigger className="col-span-3">
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="processing" className="text-right">
                İşlem Profili
              </Label>
              <Select
                value={processingProfileId}
                onValueChange={setProcessingProfileId}
                disabled={loadingProcessingProfiles || processingProfiles.length === 0}
              >
                <SelectTrigger className="col-span-3">
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

          <DialogFooter className="flex justify-between">
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
                    {product ? 'Güncelleniyor...' : 'Oluşturuluyor...'}
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