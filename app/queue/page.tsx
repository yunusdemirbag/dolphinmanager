"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Settings, 
  Timer, 
  CheckCircle, 
  XCircle, 
  Clock,
  Image,
  Video,
  Edit3,
  Upload,
  Trash2
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface QueueItem {
  id: string;
  user_id: string;
  product_data: {
    title: string;
    price: number;
    tags: string[];
    images: any[];
    video?: any;
    taxonomy_id: number;
    created_at: string;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  retry_count: number;
  error_message?: string;
  etsy_listing_id?: string;
}

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

export default function QueuePage() {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([])
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [isAutoProcessing, setIsAutoProcessing] = useState(false)
  const [processingDelay, setProcessingDelay] = useState(20)
  const [currentlyProcessing, setCurrentlyProcessing] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { toast } = useToast()

  // Kuyruk istatistikleri
  const stats: QueueStats = {
    pending: queueItems.filter(item => item.status === 'pending').length,
    processing: queueItems.filter(item => item.status === 'processing').length,
    completed: (() => {
      const completedKeys = Object.keys(localStorage).filter(key => key.startsWith('completed_'));
      const validCompleted = completedKeys.filter(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          return data.title && data.completed_at && !isNaN(new Date(data.completed_at).getTime());
        } catch {
          localStorage.removeItem(key); // Bozuk veriyi temizle
          return false;
        }
      });
      localStorage.setItem('completed_count', validCompleted.length.toString());
      return validCompleted.length;
    })(),
    failed: queueItems.filter(item => item.status === 'failed').length,
    total: queueItems.length + (() => {
      const completedKeys = Object.keys(localStorage).filter(key => key.startsWith('completed_'));
      const validCompleted = completedKeys.filter(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          return data.title && data.completed_at && !isNaN(new Date(data.completed_at).getTime());
        } catch {
          return false;
        }
      });
      return validCompleted.length;
    })()
  }

  // Kuyruk verilerini yükle
  const loadQueueItems = async () => {
    try {
      const response = await fetch('/api/queue?user_id=local-user-123')
      const data = await response.json()
      // Tüm ürünleri al, filtreleme UI seviyesinde yapılacak
      setQueueItems(data.items || [])
    } catch (error) {
      console.error('Kuyruk verileri yüklenemedi:', error)
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Kuyruk verileri yüklenemedi"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Base64'ten File objesine dönüştürme
  const base64ToFile = (base64: string, filename: string, mimeType: string): File => {
    const byteCharacters = atob(base64.split(',')[1] || base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new File([byteArray], filename, { type: mimeType });
  };

  // Otomatik işleme sistemi
  const processNextItem = async () => {
    const pendingItems = queueItems.filter(item => item.status === 'pending')
    if (pendingItems.length === 0) {
      setIsAutoProcessing(false)
      toast({
        title: "Kuyruk Tamamlandı",
        description: "Tüm bekleyen ürünler işlendi"
      })
      return
    }

    const nextItem = pendingItems[0]
    setCurrentlyProcessing(nextItem.id)

    try {
      // İşleme başla
      await fetch('/api/queue/worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', itemId: nextItem.id })
      })

      // Etsy'ye gönder
      const formData = new FormData()
      formData.append('listingData', JSON.stringify({
        ...nextItem.product_data,
        state: 'draft' // Her zaman taslak olarak gönder
      }))

      // Görselleri ekle - Base64'ten File'a dönüştür
      if (nextItem.product_data.images) {
        nextItem.product_data.images.forEach((image: any, index: number) => {
          const base64Data = image.base64 || image.data;
          if (base64Data) {
            const file = base64ToFile(base64Data, image.filename || image.name, image.type);
            formData.append(`imageFile_${index}`, file);
          }
        })
      }

      // Video ekle - Base64'ten File'a dönüştür  
      if (nextItem.product_data.video) {
        const videoBase64Data = nextItem.product_data.video.base64 || nextItem.product_data.video.data;
        if (videoBase64Data) {
          const videoFile = base64ToFile(
            videoBase64Data, 
            nextItem.product_data.video.filename || nextItem.product_data.video.name, 
            nextItem.product_data.video.type
          );
          formData.append('videoFile', videoFile);
        }
      }

      const etsyResponse = await fetch('/api/etsy/listings/create', {
        method: 'POST',
        body: formData
      })

      const etsyResult = await etsyResponse.json()
      
      console.log('🔍 Etsy sonucu:', {
        success: etsyResult.success,
        listing_id: etsyResult.listing_id,
        error: etsyResult.error
      })

      if (etsyResult.success) {
        console.log('✅ Etsy başarılı, DELETE işlemi başlatılıyor...')
        // Başarılı - Ürünü direkt sil ve tamamlananlar sayacını artır
        const deleteResponse = await fetch('/api/queue', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'delete_selected',
            itemIds: [nextItem.id],
            user_id: 'local-user-123'
          })
        })

        const deleteResult = await deleteResponse.json()
        
        if (deleteResult.success) {
          // Tamamlananlar sayacını localStorage'da tut
          const completedCount = parseInt(localStorage.getItem('completed_count') || '0') + 1
          localStorage.setItem('completed_count', completedCount.toString())
          localStorage.setItem(`completed_${nextItem.id}`, JSON.stringify({
            title: nextItem.product_data.title,
            completed_at: new Date().toISOString(),
            etsy_listing_id: etsyResult.listing_id,
            processing_time: Math.round(processingDelay) // İşlem süresi saniye olarak
          }))

          toast({
            title: "Ürün Gönderildi",
            description: `"${nextItem.product_data.title}" Etsy'ye gönderildi ve tamamlandı (${completedCount})`
          })
        } else {
          console.error('DELETE işlemi başarısız:', deleteResult.error)
          toast({
            variant: "destructive", 
            title: "Uyarı",
            description: `Ürün Etsy'ye gönderildi ama kuyruktan silinemedi: ${deleteResult.error}`
          })
        }
      } else {
        console.log('❌ Etsy başarısız, hata:', etsyResult.error)
        // Hatalı - Ürünü direkt sil (hatalıları da kuyruktaki karmaşayı önlemek için)
        const deleteResponse = await fetch('/api/queue', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'delete_selected',
            itemIds: [nextItem.id],
            user_id: 'local-user-123'
          })
        })

        const deleteResult = await deleteResponse.json()
        
        toast({
          variant: "destructive",
          title: "Gönderim Hatası",
          description: `${etsyResult.error || 'Bilinmeyen hata'}${deleteResult.success ? '' : ' (Kuyruktan da silinemedi)'}`
        })
      }
    } catch (error) {
      console.error('İşleme hatası:', error)
      // Hata durumunda da ürünü sil
      try {
        const deleteResponse = await fetch('/api/queue', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'delete_selected',
            itemIds: [nextItem.id],
            user_id: 'local-user-123'
          })
        })
        const deleteResult = await deleteResponse.json()
        
        toast({
          variant: "destructive",
          title: "İşleme Hatası", 
          description: `Ürün işlenemedi${deleteResult.success ? ' ve kuyruktan silindi' : ' (kuyruktan da silinemedi)'}`
        })
      } catch (deleteError) {
        console.error('Delete işlemi de başarısız:', deleteError)
        toast({
          variant: "destructive",
          title: "Kritik Hata",
          description: "Ürün işlenemedi ve kuyruktan da silinemedi"
        })
      }
    }

    setCurrentlyProcessing(null)
    await loadQueueItems()

    // Otomatik işleme devam ediyorsa, bekle
    if (isAutoProcessing) {
      setCountdown(processingDelay)
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            processNextItem()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
  }

  // Manuel bir ürünü işle
  const processSingleItem = async (itemId: string) => {
    const item = queueItems.find(i => i.id === itemId)
    if (!item) return

    setCurrentlyProcessing(itemId)
    // processNextItem mantığını tek ürün için kullan
    // ... aynı kod
    setCurrentlyProcessing(null)
    await loadQueueItems()
  }

  // Seçili ürünleri sil
  const deleteSelectedItems = async () => {
    if (selectedItems.length === 0) return
    
    try {
      const response = await fetch('/api/queue', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'delete_selected',
          itemIds: selectedItems,
          user_id: 'local-user-123'
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "Ürünler Silindi",
          description: `${selectedItems.length} ürün başarıyla silindi`
        })
        setSelectedItems([])
        await loadQueueItems()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Silme hatası:', error)
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Seçili ürünler silinemedi"
      })
    }
  }

  // Kuyruğu temizle
  const clearQueue = async () => {
    const totalItems = queueItems.length + stats.completed
    
    if (totalItems === 0) return
    
    if (!confirm(`Tüm kuyruk temizlenecek (${queueItems.length} aktif + ${stats.completed} tamamlanan = ${totalItems} toplam). Bu işlem geri alınamaz. Emin misiniz?`)) return
    
    try {
      // Database'deki tüm ürünleri sil
      const response = await fetch('/api/queue', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'clear_all',
          user_id: 'local-user-123'
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // localStorage'daki tamamlanan ürünleri de temizle
        const completedKeys = Object.keys(localStorage).filter(key => key.startsWith('completed_'))
        completedKeys.forEach(key => localStorage.removeItem(key))
        localStorage.removeItem('completed_count')
        
        toast({
          title: "Kuyruk Tamamen Temizlendi",
          description: `${totalItems} ürün (aktif + tamamlanan) başarıyla silindi`
        })
        setSelectedItems([])
        await loadQueueItems()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Temizleme hatası:', error)
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Kuyruk temizlenemedi"
      })
    }
  }

  // Otomatik işleme toggle
  const toggleAutoProcessing = () => {
    setIsAutoProcessing(!isAutoProcessing)
    if (!isAutoProcessing) {
      processNextItem()
    } else {
      setCountdown(0)
    }
  }

  useEffect(() => {
    loadQueueItems()
    const interval = setInterval(loadQueueItems, 10000) // 10 saniyede bir güncelle
    return () => clearInterval(interval)
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('tr-TR')
  }

  const getCategoryName = (taxonomyId: number) => {
    // Kategori ID'lerine göre isim döndür
    const categories: { [key: number]: string } = {
      1027: "Duvar Dekorasyonu",
      2078: "Dijital Baskılar",
      // Diğer kategoriler...
    }
    return categories[taxonomyId] || "Bilinmeyen Kategori"
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Başlık */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Kuyruktaki Ürünler</h1>
          <p className="text-gray-600">{stats.total} ürün</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => loadQueueItems()}
            disabled={isLoading}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Yenile
          </Button>
        </div>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">Bekleyen</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Timer className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
            <div className="text-sm text-gray-600">İşleniyor</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-600">Tamamlanan</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-sm text-gray-600">Hatalı</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Upload className="w-5 h-5 text-gray-500" />
            </div>
            <div className="text-2xl font-bold text-gray-600">{stats.total}</div>
            <div className="text-sm text-gray-600">Toplam</div>
          </CardContent>
        </Card>
      </div>

      {/* Kuyruk Kontrol Paneli */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Kuyruk Kontrol Paneli
            <div className="ml-auto flex items-center gap-2">
              <Label htmlFor="auto-processing">Otomatik Kapalı</Label>
              <Switch
                id="auto-processing"
                checked={isAutoProcessing}
                onCheckedChange={toggleAutoProcessing}
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <Button
              onClick={toggleAutoProcessing}
              variant={isAutoProcessing ? "destructive" : "default"}
              className="flex items-center gap-2"
            >
              {isAutoProcessing ? (
                <>
                  <Pause className="w-4 h-4" />
                  Durdur
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Otomatik Başlat
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                if (stats.pending > 0) {
                  processNextItem()
                }
              }}
              disabled={stats.pending === 0 || currentlyProcessing !== null}
            >
              Hemen İşle
            </Button>

            <Button
              variant="outline"
              onClick={clearQueue}
              disabled={isLoading}
            >
              Kuyruğu Temizle
            </Button>

            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Ayarlar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Kuyruk Ayarları</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="delay">İşlemler Arası Bekleme Süresi (saniye)</Label>
                    <Input
                      id="delay"
                      type="number"
                      value={processingDelay}
                      onChange={(e) => setProcessingDelay(Number(e.target.value))}
                      min="5"
                      max="300"
                    />
                    <p className="text-sm text-gray-600">
                      Etsy API kısıtlamasını önlemek için ürünler arası bekleme süresi
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {selectedItems.length > 0 && (
              <Button
                variant="destructive"
                onClick={deleteSelectedItems}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Seçilenleri Sil ({selectedItems.length})
              </Button>
            )}

            {countdown > 0 && (
              <div className="flex items-center gap-2 text-blue-600">
                <Timer className="w-4 h-4" />
                Sonraki işlem: {countdown}s
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Kuyruk Listesi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Canlı Kuyruk ({stats.pending + stats.processing})</span>
            <div className="flex items-center gap-2">
              {selectedItems.length > 0 && (
                <span className="text-sm text-gray-600">
                  {selectedItems.length} seçili
                </span>
              )}
              <Checkbox
                checked={(() => {
                  const activeItems = queueItems.filter(item => item.status === 'pending' || item.status === 'processing');
                  return selectedItems.length === activeItems.length && activeItems.length > 0;
                })()}
                onCheckedChange={(checked) => {
                  const activeItems = queueItems.filter(item => item.status === 'pending' || item.status === 'processing');
                  if (checked) {
                    setSelectedItems(activeItems.map(item => item.id))
                  } else {
                    setSelectedItems([])
                  }
                }}
              />
              <Label className="text-sm">Tümünü Seç</Label>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Kuyruk yükleniyor...</div>
          ) : queueItems.filter(item => item.status === 'pending' || item.status === 'processing').length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Canlı kuyrukta ürün bulunmuyor
            </div>
          ) : (
            <div className="space-y-4">
              {queueItems
                .filter(item => item.status === 'pending' || item.status === 'processing')
                .map((item) => (
                <div
                  key={item.id}
                  className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                    currentlyProcessing === item.id ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Seçim checkbox'ı */}
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedItems([...selectedItems, item.id])
                        } else {
                          setSelectedItems(selectedItems.filter(id => id !== item.id))
                        }
                      }}
                      className="mt-1"
                    />

                    {/* Ürün görseli */}
                    <div className="flex-shrink-0">
                      {(() => {
                        const firstImage = item.product_data.images?.[0];
                        const imageData = firstImage?.base64 || firstImage?.data;
                        
                        if (imageData) {
                          const imageSrc = imageData.startsWith('data:') 
                            ? imageData 
                            : `data:${firstImage.type || 'image/jpeg'};base64,${imageData}`;
                          
                          return (
                            <img 
                              src={imageSrc}
                              alt={item.product_data.title}
                              className="w-32 h-32 object-cover rounded-lg border"
                            />
                          );
                        }
                        
                        return (
                          <div className="w-32 h-32 bg-gray-200 rounded-lg border flex items-center justify-center">
                            <Image className="w-12 h-12 text-gray-400" />
                          </div>
                        );
                      })()}
                    </div>

                    {/* Ürün bilgileri */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1 truncate">
                            {item.product_data.title}
                          </h3>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-green-600">
                                ${item.product_data.price?.toFixed(2) || '0.00'}
                              </span>
                            </div>
                            <div>
                              {getCategoryName(item.product_data.taxonomy_id)}
                            </div>
                            <div>
                              {formatDate(item.created_at)}
                            </div>
                          </div>

                          {/* Medya dosyaları */}
                          <div className="flex items-center gap-4 mb-2">
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Image className="w-4 h-4" />
                              {item.product_data.images?.length || 0} resim
                            </div>
                            {item.product_data.video && (
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Video className="w-4 h-4" />
                                1 video
                              </div>
                            )}
                          </div>

                          {/* Etiketler */}
                          <div className="flex flex-wrap gap-1 mb-2">
                            {item.product_data.tags?.slice(0, 6).map((tag: string, index: number) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                            {(item.product_data.tags?.length || 0) > 6 && (
                              <Badge variant="outline" className="text-xs">
                                +{(item.product_data.tags?.length || 0) - 6} daha
                              </Badge>
                            )}
                          </div>

                          {/* Hata mesajı */}
                          {item.error_message && (
                            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                              {item.error_message}
                            </div>
                          )}
                        </div>

                        {/* Durum ve aksiyonlar */}
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                item.status === 'pending' ? 'secondary' :
                                item.status === 'processing' ? 'default' :
                                item.status === 'completed' ? 'default' : 'destructive'
                              }
                              className={
                                item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                item.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                item.status === 'completed' ? 'bg-green-100 text-green-800' : ''
                              }
                            >
                              {item.status === 'pending' && 'Bekliyor'}
                              {item.status === 'processing' && 'İşleniyor'}
                              {item.status === 'completed' && 'Tamamlandı'}
                              {item.status === 'failed' && 'Hatalı'}
                            </Badge>
                          </div>

                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                              title="Düzenle"
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>
                            
                            {item.status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => processSingleItem(item.id)}
                                disabled={currentlyProcessing !== null}
                                className="h-8"
                              >
                                <Upload className="w-3 h-3 mr-1" />
                                Direkt Gönder
                              </Button>
                            )}
                          </div>

                          {item.etsy_listing_id && (
                            <div className="text-xs text-gray-500">
                              Etsy ID: {item.etsy_listing_id}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tamamlananlar Sekmesi */}
      {stats.completed > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Tamamlananlar ({stats.completed})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(() => {
                // Geçerli tamamlanan ürünleri al ve doğrula
                const completedKeys = Object.keys(localStorage)
                  .filter(key => key.startsWith('completed_'));
                
                const validCompleted = completedKeys.filter(key => {
                  try {
                    const data = JSON.parse(localStorage.getItem(key) || '{}');
                    return data.title && data.completed_at && !isNaN(new Date(data.completed_at).getTime());
                  } catch {
                    localStorage.removeItem(key); // Bozuk veriyi temizle
                    return false;
                  }
                }).sort().reverse();

                // stats.completed sayısını güncelle
                localStorage.setItem('completed_count', validCompleted.length.toString());

                return validCompleted.map((completedId) => {
                  const data = JSON.parse(localStorage.getItem(completedId) || '{}');
                  
                  return (
                    <div key={completedId} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <div>
                          <div className="font-semibold text-green-800">{data.title}</div>
                          <div className="text-sm text-green-600 space-x-4">
                            <span>📅 {new Date(data.completed_at).toLocaleString('tr-TR')}</span>
                            <span>⏱️ {data.processing_time || 0} saniye</span>
                          </div>
                        </div>
                      </div>
                      {data.etsy_listing_id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`https://www.etsy.com/listing/${data.etsy_listing_id}`, '_blank')}
                        >
                          Etsy'de Gör
                        </Button>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}