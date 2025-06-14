import { useState, useEffect } from "react";
import { Button } from "@/src/components/ui/button";
import { Progress } from "@/src/components/ui/progress";
import { Loader2, Upload, CheckCircle, AlertCircle, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { toast } from "sonner";

interface BatchUploadButtonProps {
  products: any[];
  onComplete?: (results: any) => void;
  disabled?: boolean;
}

export function BatchUploadButton({ products, onComplete, disabled = false }: BatchUploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<any | null>(null);
  const [statusCheckInterval, setStatusCheckInterval] = useState<NodeJS.Timeout | null>(null);

  // Job durumunu kontrol et
  useEffect(() => {
    if (jobId && showDialog) {
      // İlk durumu hemen kontrol et
      checkJobStatus();
      
      // Belirli aralıklarla kontrol et
      const interval = setInterval(checkJobStatus, 2000);
      setStatusCheckInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    } else if (!showDialog && statusCheckInterval) {
      clearInterval(statusCheckInterval);
      setStatusCheckInterval(null);
    }
  }, [jobId, showDialog]);

  // Job durumunu kontrol et
  const checkJobStatus = async () => {
    if (!jobId) return;
    
    try {
      const response = await fetch(`/api/etsy/listings/job-status/${jobId}`);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Job status error:', error);
        return;
      }
      
      const status = await response.json();
      setJobStatus(status);
      
      // İşlem tamamlandıysa veya hata olduysa interval'ı temizle
      if (status.status === 'completed' || status.status === 'failed') {
        if (statusCheckInterval) {
          clearInterval(statusCheckInterval);
          setStatusCheckInterval(null);
        }
        
        // İşlem tamamlandıysa callback'i çağır
        if (status.status === 'completed' && onComplete) {
          onComplete(status);
        }
      }
    } catch (error) {
      console.error('Error checking job status:', error);
    }
  };

  // Toplu yükleme işlemini başlat
  const startBatchUpload = async () => {
    if (products.length === 0) {
      toast.error('Yüklenecek ürün bulunamadı!');
      return;
    }

    setIsUploading(true);
    setShowDialog(true);
    
    try {
      // FormData oluştur
      const formData = new FormData();
      
      // Ürün verilerini ekle
      formData.append('products', JSON.stringify(products));
      
      // Her ürün için dosyaları ekle
      products.forEach((product, index) => {
        const productId = product.id || `product_${index}`;
        
        // Görselleri ekle
        if (product.images && Array.isArray(product.images)) {
          product.images.forEach((image: any, imgIndex: number) => {
            if (image.file instanceof File) {
              formData.append(`imageFiles_${productId}_${imgIndex}`, image.file);
            }
          });
        }
        
        // Video ekle (varsa)
        if (product.video?.file instanceof File) {
          formData.append(`videoFile_${productId}`, product.video.file);
        }
      });
      
      // API'ye istek at
      const response = await fetch('/api/etsy/listings/batch-upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Toplu yükleme başlatılamadı');
      }
      
      const result = await response.json();
      setJobId(result.jobId);
      
      toast.success(`${result.totalProducts} ürün için yükleme işlemi başlatıldı`);
      
    } catch (error: any) {
      console.error('Batch upload error:', error);
      toast.error(`Hata: ${error.message || 'Bilinmeyen bir hata oluştu'}`);
      setShowDialog(false);
    } finally {
      setIsUploading(false);
    }
  };

  // Dialogu kapat
  const handleCloseDialog = () => {
    // İşlem devam ediyorsa uyarı göster
    if (jobStatus?.status === 'processing') {
      if (!confirm('İşlem hala devam ediyor. Pencereyi kapatmak istediğinize emin misiniz?')) {
        return;
      }
    }
    
    setShowDialog(false);
    setJobId(null);
    setJobStatus(null);
  };

  return (
    <>
      <Button 
        onClick={startBatchUpload} 
        disabled={disabled || isUploading || products.length === 0}
        variant="default"
        className="flex items-center gap-2"
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {products.length > 0 ? `${products.length} Ürünü Etsy'ye Gönder` : 'Toplu Ürün Gönder'}
      </Button>
      
      {/* İlerleme Durumu Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Toplu Ürün Yükleme</DialogTitle>
            <DialogDescription>
              {!jobId ? 'Ürünler işleniyor...' : 
               jobStatus?.status === 'pending' ? 'Yükleme işlemi başlatılıyor...' :
               jobStatus?.status === 'processing' ? 'Ürünler Etsy\'ye yükleniyor...' :
               jobStatus?.status === 'completed' ? 'Yükleme işlemi tamamlandı!' :
               jobStatus?.status === 'failed' ? 'Yükleme işlemi başarısız oldu!' :
               'İşlem durumu kontrol ediliyor...'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {/* İlerleme Çubuğu */}
            <div className="mb-4">
              <Progress value={jobStatus?.progress || 0} className="h-2" />
              <p className="text-xs text-gray-500 mt-1 text-right">
                {jobStatus?.progress || 0}%
              </p>
            </div>
            
            {/* Durum Bilgisi */}
            {jobStatus?.currentStatus && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                <Info className="h-4 w-4" />
                <span>{jobStatus.currentStatus}</span>
              </div>
            )}
            
            {/* Sonuç Özeti */}
            {jobStatus?.summary && (
              <div className="border rounded-md p-3 bg-gray-50">
                <h4 className="font-medium mb-2">Sonuç Özeti</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Toplam Ürün:</span>
                    <span className="font-medium">{jobStatus.summary.totalCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Başarılı:
                    </span>
                    <span className="font-medium text-green-600">{jobStatus.summary.successCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      Başarısız:
                    </span>
                    <span className="font-medium text-red-600">{jobStatus.summary.failedCount}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Hata Mesajı */}
            {jobStatus?.error && (
              <div className="border border-red-200 rounded-md p-3 bg-red-50 mt-4">
                <h4 className="font-medium text-red-700 mb-1">Hata</h4>
                <p className="text-sm text-red-600">{jobStatus.error}</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCloseDialog}
              disabled={isUploading}
            >
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 