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
import { Product, CreateProductForm, TaxonomyNode } from "@/types/product"
import { ProductFormSections } from "./ProductFormSections"

interface ProductFormModalProps {
  showModal: boolean
  setShowModal: (show: boolean) => void
  editProduct: Product | null
  setEditProduct: (product: Product | null) => void
  createForm: CreateProductForm
  setCreateForm: (form: CreateProductForm) => void
  tagInput: string
  setTagInput: (value: string) => void
  materialInput: string
  setMaterialInput: (value: string) => void
  taxonomyNodes: TaxonomyNode[]
  shippingProfiles: any[]
  submitting: boolean
  onCreateProduct: (state: "draft" | "active") => void
  onUpdateProduct: (product: Product) => void
}

export function ProductFormModal({
  showModal,
  setShowModal,
  editProduct,
  setEditProduct,
  createForm,
  setCreateForm,
  tagInput,
  setTagInput,
  materialInput,
  setMaterialInput,
  taxonomyNodes,
  shippingProfiles,
  submitting,
  onCreateProduct,
  onUpdateProduct,
}: ProductFormModalProps) {
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false)
  const [pendingClose, setPendingClose] = useState(false)

  // Formda değişiklik yapılıp yapılmadığını kontrol eden fonksiyon
  const hasUnsavedChanges = () => {
    if (editProduct) {
      return false // Düzenleme modalı için ayrıca kontrol eklenebilir
    }
    return createForm.title !== "" ||
      createForm.description !== "" ||
      createForm.price !== 0 ||
      createForm.quantity !== 1 ||
      createForm.tags.length > 0 ||
      createForm.materials.length > 0 ||
      createForm.taxonomy_id !== 0 ||
      createForm.shipping_profile_id !== 0
  }

  // Modal kapatma işlemi
  const handleCloseModal = () => {
    if (hasUnsavedChanges()) {
      setShowUnsavedChangesDialog(true)
      setPendingClose(true)
    } else {
      setShowModal(false)
      setEditProduct(null)
    }
  }

  // Kapatma işlemini onayla
  const confirmClose = () => {
    setShowUnsavedChangesDialog(false)
    setPendingClose(false)
    setShowModal(false)
    setEditProduct(null)
  }

  // Kapatma işlemini iptal et
  const cancelClose = () => {
    setShowUnsavedChangesDialog(false)
    setPendingClose(false)
  }

  return (
    <>
      {/* Create/Edit Modal */}
      <Dialog 
        open={showModal} 
        onOpenChange={(open) => {
          if (!open) {
            handleCloseModal()
          }
        }}
      >
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editProduct ? `Ürünü Düzenle: ${editProduct.title}` : "Yeni Ürün Ekle"}
            </DialogTitle>
            <DialogDescription>
              {editProduct ? "Bu ürünün detaylarını düzenleyin." : "Yeni bir ürün ekleyin."}
            </DialogDescription>
          </DialogHeader>

          <ProductFormSections
            editProduct={editProduct}
            createForm={createForm}
            setCreateForm={setCreateForm}
            tagInput={tagInput}
            setTagInput={setTagInput}
            materialInput={materialInput}
            setMaterialInput={setMaterialInput}
            taxonomyNodes={taxonomyNodes}
            shippingProfiles={shippingProfiles}
          />

          <DialogFooter className="flex justify-between">
            <div>
              <Button variant="outline" onClick={handleCloseModal}>İptal</Button>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                onClick={() => {
                  if (editProduct) {
                    onUpdateProduct({ ...editProduct, state: "draft" })
                  } else {
                    onCreateProduct("draft")
                  }
                }} 
                disabled={submitting}
              >
                {submitting && createForm.state === "draft" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Taslak Kaydediliyor...
                  </>
                ) : (
                  "Taslak Olarak Kaydet"
                )}
              </Button>
              <Button 
                onClick={() => {
                  if (editProduct) {
                    onUpdateProduct({ ...editProduct, state: "active" })
                  } else {
                    onCreateProduct("active")
                  }
                }} 
                disabled={submitting}
              >
                {submitting && createForm.state === "active" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editProduct ? 'Güncelleniyor...' : 'Oluşturuluyor...'}
                  </>
                ) : (
                  editProduct ? 'Güncelle' : 'Ürünü Oluştur'
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showUnsavedChangesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kaydedilmemiş Değişiklikler</AlertDialogTitle>
            <AlertDialogDescription>
              Kaydedilmemiş değişiklikleriniz var. Formu kapatmak istediğinizden emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelClose}>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClose}>Tamam</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 