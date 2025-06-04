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
import { toast } from "@/components/ui/use-toast"

interface ProductDeleteModalProps {
  confirmDeleteProductId: number | null
  setConfirmDeleteProductId: (id: number | null) => void
  onDeleteProduct: (id: number) => Promise<{ success: boolean; message?: string }>
  deletingProductId: number | null
}

export function ProductDeleteModal({
  confirmDeleteProductId,
  setConfirmDeleteProductId,
  onDeleteProduct,
  deletingProductId
}: ProductDeleteModalProps) {
  const handleDelete = async () => {
    try {
      if (!confirmDeleteProductId) {
        throw new Error('Ürün ID\'si bulunamadı');
      }

      const response = await onDeleteProduct(confirmDeleteProductId);
      
      if (!response.success) {
        throw new Error(response.message || 'Ürün silinirken hata oluştu');
      }

      // Modal'ı kapat
      setConfirmDeleteProductId(null);

      // Başarı mesajını göster
      toast({
        title: "Başarılı!",
        description: response.message || "Ürün başarıyla silindi",
        variant: "success",
        duration: 5000,
      });
    } catch (error) {
      console.error("[PRODUCT_DELETE] Delete error:", error);
      toast({
        title: "Hata!",
        description: error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

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
            onClick={handleDelete}
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