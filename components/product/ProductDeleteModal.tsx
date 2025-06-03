"use client"

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

interface ProductDeleteModalProps {
  confirmDeleteProductId: number | null
  setConfirmDeleteProductId: (id: number | null) => void
  onDeleteProduct: (id: number) => void
  deletingProductId: number | null
}

export function ProductDeleteModal({
  confirmDeleteProductId,
  setConfirmDeleteProductId,
  onDeleteProduct,
  deletingProductId
}: ProductDeleteModalProps) {
  return (
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
  )
} 