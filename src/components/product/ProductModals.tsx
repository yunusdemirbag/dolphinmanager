"use client"

import { Product, CreateProductForm, TaxonomyNode } from "@/types/product"
import { ProductFormModal } from "./ProductFormModal"
import { ProductDeleteModal } from "./ProductDeleteModal"

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
  onCreateProduct: (state: "draft" | "active") => void
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
  return (
    <>
      <ProductFormModal
        showModal={showCreateModal}
        setShowModal={setShowCreateModal}
        editProduct={showEditModal}
        setEditProduct={setShowEditModal}
        createForm={createForm}
        setCreateForm={setCreateForm}
        tagInput={tagInput}
        setTagInput={setTagInput}
        materialInput={materialInput}
        setMaterialInput={setMaterialInput}
        taxonomyNodes={taxonomyNodes}
        shippingProfiles={shippingProfiles}
        submitting={submitting}
        onCreateProduct={onCreateProduct}
        onUpdateProduct={onUpdateProduct}
      />

      <ProductDeleteModal
        confirmDeleteProductId={confirmDeleteProductId}
        setConfirmDeleteProductId={setConfirmDeleteProductId}
        onDeleteProduct={onDeleteProduct}
        deletingProductId={deletingProductId}
      />
    </>
  )
} 