"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X, Loader2 } from "lucide-react"
import { Product, CreateProductForm, TaxonomyNode } from "@/types/product"

interface ProductModalsProps {
  showCreateModal: boolean
  setShowCreateModal: (show: boolean) => void
  showEditModal: Product | null
  setShowEditModal: (product: Product | null) => void
  confirmDeleteProductId: number | null
  setConfirmDeleteProductId: (id: number | null) => void
  createForm: CreateProductForm
  setCreateForm: (form: CreateProductForm) => void
  tagInput: string
  setTagInput: (value: string) => void
  materialInput: string
  setMaterialInput: (value: string) => void
  taxonomyNodes: TaxonomyNode[]
  shippingProfiles: any[]
  submitting: boolean
  onCreateProduct: () => void
  onUpdateProduct: (product: Product) => void
  onDeleteProduct: (id: number) => void
  deletingProductId: number | null
}

export function ProductModals({
  showCreateModal,
  setShowCreateModal,
  showEditModal,
  setShowEditModal,
  confirmDeleteProductId,
  setConfirmDeleteProductId,
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
  onDeleteProduct,
  deletingProductId
}: ProductModalsProps) {
  const addTag = () => {
    if (tagInput.trim() && !createForm.tags.includes(tagInput.trim())) {
      setCreateForm({
        ...createForm,
        tags: [...createForm.tags, tagInput.trim()]
      })
      setTagInput("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setCreateForm({
      ...createForm,
      tags: createForm.tags.filter(tag => tag !== tagToRemove)
    })
  }

  const addMaterial = () => {
    if (materialInput.trim() && !createForm.materials.includes(materialInput.trim())) {
      setCreateForm({
        ...createForm,
        materials: [...createForm.materials, materialInput.trim()]
      })
      setMaterialInput("")
    }
  }

  const removeMaterial = (materialToRemove: string) => {
    setCreateForm({
      ...createForm,
      materials: createForm.materials.filter(material => material !== materialToRemove)
    })
  }

  return (
    <>
      {/* Create/Edit Modal */}
      <Dialog 
        open={showCreateModal || !!showEditModal} 
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateModal(false)
            setShowEditModal(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {showEditModal ? `Ürünü Düzenle: ${showEditModal.title}` : "Yeni Ürün Ekle"}
            </DialogTitle>
            <DialogDescription>
              {showEditModal ? "Bu ürünün detaylarını düzenleyin." : "Yeni bir ürün ekleyin."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {/* Temel Bilgiler */}
            <section className="space-y-4 border-b pb-6">
              <h3 className="text-lg font-semibold">Temel Bilgiler</h3>
              <div>
                <Label htmlFor="title">Başlık</Label>
                <Input
                  id="title"
                  value={showEditModal?.title || createForm.title}
                  onChange={(e) => showEditModal 
                    ? setShowEditModal({ ...showEditModal, title: e.target.value })
                    : setCreateForm({ ...createForm, title: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Açıklama</Label>
                <Textarea
                  id="description"
                  value={showEditModal?.description || createForm.description}
                  onChange={(e) => showEditModal
                    ? setShowEditModal({ ...showEditModal, description: e.target.value })
                    : setCreateForm({ ...createForm, description: e.target.value })
                  }
                  required
                />
              </div>
            </section>

            {/* Fiyat & Envanter */}
            <section className="space-y-4 border-b pb-6">
              <h3 className="text-lg font-semibold">Fiyat & Envanter</h3>
              <div>
                <Label htmlFor="price">Fiyat (USD)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={showEditModal?.price?.amount && showEditModal?.price?.divisor 
                    ? showEditModal.price.amount / showEditModal.price.divisor 
                    : createForm.price}
                  onChange={(e) => showEditModal?.price
                    ? setShowEditModal({ 
                        ...showEditModal, 
                        price: { 
                          ...showEditModal.price, 
                          amount: parseFloat(e.target.value) * showEditModal.price.divisor 
                        }
                      })
                    : setCreateForm({ ...createForm, price: parseFloat(e.target.value) })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="quantity">Miktar</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="1"
                  value={showEditModal?.quantity || createForm.quantity}
                  onChange={(e) => showEditModal
                    ? setShowEditModal({ ...showEditModal, quantity: parseInt(e.target.value) })
                    : setCreateForm({ ...createForm, quantity: parseInt(e.target.value) })
                  }
                  required
                />
              </div>
            </section>

            {/* Detaylar & Nitelikler */}
            <section className="space-y-4 border-b pb-6">
              <h3 className="text-lg font-semibold">Detaylar & Nitelikler</h3>
              <div>
                <Label htmlFor="taxonomy_id">Kategori</Label>
                <Select
                  value={showEditModal?.taxonomy_id?.toString() || createForm.taxonomy_id?.toString()}
                  onValueChange={(value) => showEditModal
                    ? setShowEditModal({ ...showEditModal, taxonomy_id: parseInt(value) })
                    : setCreateForm({ ...createForm, taxonomy_id: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Bir kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {taxonomyNodes.map(node => (
                      <SelectItem key={node.id} value={node.id.toString()}>
                        {node.path.join(' > ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Etiketler */}
              <div>
                <Label htmlFor="tags">Etiketler (Max 13)</Label>
                <div className="flex space-x-2">
                  <Input
                    id="tagInput"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Etiket ekle (örn: tablo, sanat)"
                    onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  />
                  <Button type="button" onClick={addTag}>Ekle</Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(showEditModal?.tags || createForm.tags).map(tag => (
                    <Badge key={tag} variant="secondary">
                      {tag} <button type="button" onClick={() => removeTag(tag)} className="ml-1 text-red-500"><X size={12} /></button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Malzemeler */}
              <div>
                <Label htmlFor="materials">Malzemeler (Max 13)</Label>
                <div className="flex space-x-2">
                  <Input
                    id="materialInput"
                    value={materialInput}
                    onChange={(e) => setMaterialInput(e.target.value)}
                    placeholder="Malzeme ekle (örn: tuval, yağlı boya)"
                    onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMaterial(); } }}
                  />
                  <Button type="button" onClick={addMaterial}>Ekle</Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(showEditModal?.materials || createForm.materials).map(material => (
                    <Badge key={material} variant="secondary">
                      {material} <button type="button" onClick={() => removeMaterial(material)} className="ml-1 text-red-500"><X size={12} /></button>
                    </Badge>
                  ))}
                </div>
              </div>
            </section>

            {/* Kargo & Hazırlık */}
            <section className="space-y-4 border-b pb-6">
              <h3 className="text-lg font-semibold">Kargo & Hazırlık</h3>
              <div>
                <Label htmlFor="shipping_profile_id">Kargo Profili</Label>
                <Select
                  value={showEditModal?.shipping_profile_id?.toString() || createForm.shipping_profile_id?.toString()}
                  onValueChange={(value) => showEditModal
                    ? setShowEditModal({ ...showEditModal, shipping_profile_id: parseInt(value) })
                    : setCreateForm({ ...createForm, shipping_profile_id: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Bir kargo profili seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {shippingProfiles.map(profile => (
                      <SelectItem key={profile.shipping_profile_id} value={profile.shipping_profile_id.toString()}>
                        {profile.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>

            {/* Kişiselleştirme */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold">Kişiselleştirme</h3>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_personalizable"
                  checked={showEditModal?.is_personalizable || createForm.is_personalizable}
                  onCheckedChange={(checked) => showEditModal
                    ? setShowEditModal({ ...showEditModal, is_personalizable: checked as boolean })
                    : setCreateForm({ ...createForm, is_personalizable: checked as boolean })
                  }
                />
                <Label htmlFor="is_personalizable">Kişiselleştirilebilir mi?</Label>
              </div>

              {(showEditModal?.is_personalizable || createForm.is_personalizable) && (
                <div className="space-y-4 pl-4 border-l">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="personalization_is_required"
                      checked={showEditModal?.personalization_is_required || createForm.personalization_is_required}
                      onCheckedChange={(checked) => showEditModal
                        ? setShowEditModal({ ...showEditModal, personalization_is_required: checked as boolean })
                        : setCreateForm({ ...createForm, personalization_is_required: checked as boolean })
                      }
                    />
                    <Label htmlFor="personalization_is_required">Alıcıdan kişiselleştirme bilgisini zorunlu kıl</Label>
                  </div>
                  <div>
                    <Label htmlFor="personalization_instructions">Alıcıya Talimatlar</Label>
                    <Textarea
                      id="personalization_instructions"
                      value={showEditModal?.personalization_instructions || createForm.personalization_instructions}
                      onChange={(e) => showEditModal
                        ? setShowEditModal({ ...showEditModal, personalization_instructions: e.target.value })
                        : setCreateForm({ ...createForm, personalization_instructions: e.target.value })
                      }
                      placeholder="Alıcıya kişiselleştirme için vermesi gereken bilgileri yazın"
                    />
                  </div>
                </div>
              )}
            </section>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateModal(false)
              setShowEditModal(null)
            }}>İptal</Button>
            <Button onClick={() => showEditModal ? onUpdateProduct(showEditModal) : onCreateProduct()} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {showEditModal ? 'Güncelleniyor...' : 'Oluşturuluyor...'}
                </>
              ) : (
                showEditModal ? 'Güncelle' : 'Oluştur'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!confirmDeleteProductId}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ürünü Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu ürünü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve Etsy'den de kaldırılacaktır.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDeleteProductId(null)}>İptal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => confirmDeleteProductId && onDeleteProduct(confirmDeleteProductId)}
              disabled={deletingProductId === confirmDeleteProductId}
              className="bg-red-500 hover:bg-red-600"
            >
              {deletingProductId === confirmDeleteProductId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Siliniyor...
                </>
              ) : (
                "Evet, Sil"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 