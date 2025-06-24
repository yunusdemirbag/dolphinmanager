'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package, Clock, Play, Pause, Settings as SettingsIcon, Image, Loader2, RotateCcw, Timer, CheckCircle, XCircle, Upload, Trash2, Edit3, Video, Trash } from "lucide-react";
import ProductFormModal from "@/components/ProductFormModal";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { IOSSwitch } from "@/components/ui/ios-switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Assuming these interfaces are defined somewhere accessible, e.g., in a types file.
// For now, let's define them here.
interface QueueItem {
  id: string;
  product_data: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

interface ProductsPageClientProps {
    initialProducts: any[];
    initialNextCursor: string | null;
    userId: string;
}

export default function ProductsPageClient({ initialProducts, initialNextCursor, userId }: ProductsPageClientProps) {
  const [activeTab, setActiveTab] = useState('products');
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const [queueInterval, setQueueInterval] = useState<NodeJS.Timeout | null>(null);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats>({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0
  });
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [products, setProducts] = useState<any[]>(initialProducts || []);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [hasMoreProducts, setHasMoreProducts] = useState(!!initialNextCursor);
  
  // Queue management states
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isAutoProcessing, setIsAutoProcessing] = useState(false);
  const [processingDelay, setProcessingDelay] = useState(20);
  const [currentlyProcessing, setCurrentlyProcessing] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempEditValue, setTempEditValue] = useState<string>('');
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [editingMediaItemId, setEditingMediaItemId] = useState<string | null>(null);
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const editingRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const { toast } = useToast();

  const fetchMoreProducts = useCallback(async () => {
    if (!nextCursor || isLoadingProducts) return;
    
    setIsLoadingProducts(true);
    try {
      // This is a new API route we'll need to create to specifically handle pagination
      const response = await fetch(`/api/products/paginate?user_id=${userId}&cursor=${nextCursor}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(prev => [...prev, ...(data.products || [])]);
        setNextCursor(data.nextCursor);
        setHasMoreProducts(!!data.nextCursor);
      } else {
        console.error("Failed to fetch more products");
        setHasMoreProducts(false);
      }
    } catch (error) {
      console.error("Error fetching more products:", error);
      setHasMoreProducts(false);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [nextCursor, isLoadingProducts, userId]);


  // Kuyruk verilerini yükle
  const loadQueueItems = async () => {
    try {
      setIsLoadingQueue(true);
      const response = await fetch('/api/queue?user_id=local-user-123')
      const data = await response.json()
      setQueueItems(data.items || [])
    } catch (error) {
      console.error('Kuyruk verileri yüklenemedi:', error)
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Kuyruk verileri yüklenemedi"
      })
    } finally {
      setIsLoadingQueue(false)
    }
  }

  const fetchQueue = async () => { 
    await loadQueueItems();
  };
  
  const toggleQueue = async () => { 
    setIsAutoProcessing(!isAutoProcessing);
  };

  useEffect(() => {
    if (activeTab === 'queue') {
      fetchQueue();
    }
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (queueInterval) clearInterval(queueInterval);
    };
  }, [queueInterval]);

  // Click outside to close editing
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Başlık düzenleme kontrolü
      if (editingItemId && editingField === 'title') {
        const titleRef = editingRefs.current[`title-${editingItemId}`];
        if (titleRef && !titleRef.contains(event.target as Node)) {
          cancelEdit();
        }
      }
      
      // Fiyat düzenleme kontrolü
      if (editingItemId && editingField === 'price') {
        const priceRef = editingRefs.current[`price-${editingItemId}`];
        if (priceRef && !priceRef.contains(event.target as Node)) {
          cancelEdit();
        }
      }
      
      // Etiket düzenleme kontrolü
      if (editingItemId && editingField === 'tags') {
        const tagsRef = editingRefs.current[`tags-${editingItemId}`];
        if (tagsRef && !tagsRef.contains(event.target as Node)) {
          cancelEdit();
        }
      }
      
      // Medya düzenleme kontrolü
      if (editingMediaItemId) {
        const mediaRef = editingRefs.current[`media-${editingMediaItemId}`];
        if (mediaRef && !mediaRef.contains(event.target as Node)) {
          setEditingMediaItemId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingItemId, editingField, editingMediaItemId]);

  const tabs = [
    { id: 'products', label: 'Ürünler', icon: Package },
    { id: 'queue', label: 'Kuyruk Yönetimi', icon: Clock },
    { id: 'auto-add', label: 'Otomatik Ürün Ekleme', icon: Plus },
  ];

  const renderProducts = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Ürünler</h2>
          <p className="text-gray-800">Etsy&apos;e yüklenmiş veya taslak ürünleriniz</p>
        </div>
        <Button onClick={() => setIsProductFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Yeni Ürün Ekle
        </Button>
      </div>
      
      {products.length === 0 ? (
        <Card className="p-4">
          <div className="text-center text-gray-700">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Henüz ürün bulunamadı</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map(product => {
              return (
                <Card key={product.listing_id || product.id} className="overflow-hidden">
                  <div className="aspect-square relative bg-gray-100">
                    {product.images && product.images.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={product.images[0]?.url_570xN || product.images[0]?.url_fullxfull} 
                        alt={product.title}
                        className="object-cover w-full h-full"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder-image.svg";
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Image className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium truncate">{product.title}</h3>
                    <div className="flex items-center justify-between text-sm text-gray-700 mt-2">
                      <span>{product.quantity} Adet</span>
                      <span className="font-semibold">
                        {product.price && typeof product.price === 'number' 
                          ? `${product.price.toFixed(2)} ${product.currency_code || 'USD'}` 
                          : product.price?.amount 
                            ? `${(product.price.amount / product.price.divisor).toFixed(2)} ${product.price?.currency_code}` 
                            : 'N/A'
                        }
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {hasMoreProducts && (
            <div className="text-center mt-6">
              <Button onClick={fetchMoreProducts} disabled={isLoadingProducts}>
                {isLoadingProducts ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Yükleniyor...</>
                ) : 'Daha Fazla Yükle'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );

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

  // Kuyruk istatistikleri
  const stats = {
    pending: queueItems.filter(item => item.status === 'pending').length,
    processing: queueItems.filter(item => item.status === 'processing').length,
    completed: queueItems.filter(item => item.status === 'completed').length,
    failed: queueItems.filter(item => item.status === 'failed').length,
    total: queueItems.length
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('tr-TR')
  }

  const getCategoryName = (taxonomyId: number) => {
    const categories: { [key: number]: string } = {
      1027: "Duvar Dekorasyonu",
      2078: "Dijital Baskılar",
    }
    return categories[taxonomyId] || "Bilinmeyen Kategori"
  }

  const startEdit = (itemId: string, field: string, currentValue: string) => {
    setEditingItemId(itemId);
    setEditingField(field);
    if (field === 'tags') {
      // Etiketler için array kullan
      const tags = Array.isArray(currentValue) ? currentValue : 
                   typeof currentValue === 'string' ? currentValue.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];
      setEditingTags(tags);
      setNewTagInput('');
    } else {
      setTempEditValue(currentValue);
    }
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    setEditingField(null);
    setTempEditValue('');
    setEditingTags([]);
    setNewTagInput('');
    setEditingMediaItemId(null);
  };

  const removeTag = (tagToRemove: string) => {
    setEditingTags(tags => tags.filter(tag => tag !== tagToRemove));
  };

  const addTag = () => {
    const trimmedTag = newTagInput.trim();
    
    // Etiket validasyonları
    if (!trimmedTag) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Etiket boş olamaz"
      });
      return;
    }
    
    if (trimmedTag.length > 20) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Etiket 20 karakterden uzun olamaz"
      });
      return;
    }
    
    if (editingTags.includes(trimmedTag)) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Bu etiket zaten ekli"
      });
      return;
    }
    
    if (editingTags.length >= 13) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Maksimum 13 etiket ekleyebilirsiniz"
      });
      return;
    }
    
    setEditingTags(tags => [...tags, trimmedTag]);
    setNewTagInput('');
  };

  const startMediaEdit = (itemId: string) => {
    setEditingMediaItemId(itemId);
  };

  const removeImage = async (itemId: string, imageIndex: number) => {
    try {
      const response = await fetch('/api/queue/update-media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          action: 'remove_image',
          imageIndex
        })
      });

      if (response.ok) {
        // Local state güncelle
        setQueueItems(items => 
          items.map(item => 
            item.id === itemId 
              ? {
                  ...item,
                  product_data: {
                    ...item.product_data,
                    images: item.product_data.images?.filter((_: any, idx: number) => idx !== imageIndex) || []
                  }
                }
              : item
          )
        );
        
        toast({
          title: "Başarılı",
          description: "Resim silindi"
        });
      }
    } catch (error) {
      console.error('Resim silme hatası:', error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Resim silinemedi"
      });
    }
  };

  const reorderImages = async (itemId: string, fromIndex: number, toIndex: number) => {
    try {
      const response = await fetch('/api/queue/update-media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          action: 'reorder_images',
          fromIndex,
          toIndex
        })
      });

      if (response.ok) {
        // Local state güncelle
        setQueueItems(items => 
          items.map(item => {
            if (item.id === itemId && item.product_data.images) {
              const newImages = [...item.product_data.images];
              const [removed] = newImages.splice(fromIndex, 1);
              newImages.splice(toIndex, 0, removed);
              
              return {
                ...item,
                product_data: {
                  ...item.product_data,
                  images: newImages
                }
              };
            }
            return item;
          })
        );
        
        toast({
          title: "Başarılı",
          description: "Resim sırası güncellendi"
        });
      }
    } catch (error) {
      console.error('Resim sıralama hatası:', error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Resim sırası güncellenemedi"
      });
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedImageIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number, itemId: string) => {
    e.preventDefault();
    if (draggedImageIndex !== null && draggedImageIndex !== dropIndex) {
      reorderImages(itemId, draggedImageIndex, dropIndex);
    }
    setDraggedImageIndex(null);
  };

  const processQueueItem = useCallback(async (itemId: string) => {
    try {
      setCurrentlyProcessing(itemId);
      
      // Kuyruk öğesini işleme al
      const response = await fetch('/api/etsy/listings/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queueItemId: itemId,
          isDraft: true // Otomatik olarak draft olarak gönder
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Local state'i güncelle
        setQueueItems(items => 
          items.map(item => 
            item.id === itemId 
              ? {
                  ...item,
                  status: 'completed' as const,
                  etsy_listing_id: result.listing_id,
                  error_message: undefined // Hata mesajını temizle
                }
              : item
          )
        );
        
        toast({
          title: "Başarılı",
          description: `Ürün Etsy'e draft olarak gönderildi (ID: ${result.listing_id})`
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Gönderim başarısız');
      }
    } catch (error) {
      console.error('Kuyruk işleme hatası:', error);
      
      // Hatalı durumu işaretle
      setQueueItems(items => 
        items.map(item => 
          item.id === itemId 
            ? {
                ...item,
                status: 'failed' as const,
                error_message: error instanceof Error ? error.message : 'Bilinmeyen hata'
              }
            : item
        )
      );
      
      toast({
        variant: "destructive",
        title: "Hata",
        description: error instanceof Error ? error.message : "Ürün gönderilemedi"
      });
    } finally {
      setCurrentlyProcessing(null);
    }
  }, [toast]);

  const retryQueueItem = useCallback(async (itemId: string) => {
    try {
      // Önce failed durumu pending'e çevir ve öğeyi listenin başına taşı
      setQueueItems(items => {
        const itemToRetry = items.find(item => item.id === itemId);
        if (!itemToRetry) return items;
        
        const updatedItem = {
          ...itemToRetry,
          status: 'pending' as const,
          error_message: undefined, // Hata mesajını temizle
          created_at: new Date().toISOString() // Yeni zaman damgası ile başa taşı
        };
        
        // Retry edilen öğeyi başa al, diğerlerini filtrele
        const otherItems = items.filter(item => item.id !== itemId);
        return [updatedItem, ...otherItems];
      });

      // Firebase'de de durumu güncelle
      await fetch('/api/queue/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          field: 'status',
          value: 'pending'
        })
      });

      toast({
        title: "Tekrar Deneme",
        description: "Ürün kuyruğun başına eklendi ve beklemede"
      });
    } catch (error) {
      console.error('Tekrar deneme hatası:', error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Tekrar deneme başarısız"
      });
    }
  }, [toast]);

  const clearQueue = useCallback(async () => {
    if (!confirm('Tüm kuyruk silinecek. Bu işlem geri alınamaz. Emin misiniz?')) {
      return;
    }

    try {
      const response = await fetch(`/api/queue/clear?user_id=local-user-123`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        
        // Local state'i temizle
        setQueueItems([]);
        
        toast({
          title: "Kuyruk Temizlendi",
          description: `${result.deleted_count} öğe başarıyla silindi`
        });
      } else {
        throw new Error('Kuyruk temizlenemedi');
      }
    } catch (error) {
      console.error('Kuyruk temizleme hatası:', error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Kuyruk temizlenemedi"
      });
    }
  }, [toast]);

  const saveEdit = async (itemId: string, field: string, newValue?: string | string[]) => {
    try {
      let valueToSave = newValue;
      
      // Başlık validasyonu
      if (field === 'title' && typeof newValue === 'string') {
        if (newValue.trim().length === 0) {
          toast({
            variant: "destructive",
            title: "Hata",
            description: "Başlık boş olamaz"
          });
          return;
        }
        if (newValue.length > 140) {
          toast({
            variant: "destructive",
            title: "Hata",
            description: "Başlık 140 karakterden uzun olamaz"
          });
          return;
        }
      }
      
      // Etiketler için editingTags array'ini kullan
      if (field === 'tags') {
        valueToSave = editingTags;
      }
      
      // Firebase'de kuyruk öğesini güncelle
      const response = await fetch('/api/queue/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          field,
          value: valueToSave
        })
      });

      if (response.ok) {
        // Local state'i güncelle
        setQueueItems(items => 
          items.map(item => 
            item.id === itemId 
              ? {
                  ...item,
                  product_data: {
                    ...item.product_data,
                    [field]: valueToSave
                  }
                }
              : item
          )
        );
        
        cancelEdit();
        toast({
          title: "Başarılı",
          description: "Ürün bilgisi güncellendi"
        });
      } else {
        throw new Error('Güncelleme başarısız');
      }
    } catch (error) {
      console.error('Güncelleme hatası:', error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Ürün güncellenemedi"
      });
    }
  };

  const renderQueue = () => (
    <div className="space-y-6">
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
            <SettingsIcon className="w-5 h-5" />
            Kuyruk Kontrol Paneli
            <div className="ml-auto flex items-center gap-4">
              <Label htmlFor="auto-processing" className="text-sm font-medium text-gray-700">
                {isAutoProcessing ? (
                  <span className="text-green-600 font-semibold">Otomatik Açık</span>
                ) : (
                  <span className="text-gray-500">Otomatik Kapalı</span>
                )}
              </Label>
              <IOSSwitch
                id="auto-processing"
                checked={isAutoProcessing}
                onCheckedChange={setIsAutoProcessing}
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <Button
              onClick={() => setIsAutoProcessing(!isAutoProcessing)}
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
              disabled={stats.pending === 0}
            >
              Hemen İşle
            </Button>

            <Button
              variant="outline"
              onClick={() => loadQueueItems()}
              disabled={isLoadingQueue}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Yenile
            </Button>

            <Button
              variant="destructive"
              onClick={clearQueue}
              disabled={isLoadingQueue || queueItems.length === 0}
            >
              <Trash className="w-4 h-4 mr-2" />
              Kuyruğu Temizle
            </Button>

            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <SettingsIcon className="w-4 h-4 mr-2" />
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
            <span>Canlı Kuyruk ({stats.total})</span>
            <div className="flex items-center gap-2">
              {selectedItems.length > 0 && (
                <span className="text-sm text-gray-600">
                  {selectedItems.length} seçili
                </span>
              )}
              <Checkbox
                checked={selectedItems.length === queueItems.length && queueItems.length > 0}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedItems(queueItems.map(item => item.id))
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
          {isLoadingQueue ? (
            <div className="text-center py-8">Kuyruk yükleniyor...</div>
          ) : queueItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Kuyrukta ürün bulunmuyor
            </div>
          ) : (
            <div className="space-y-4">
              {queueItems.map((item) => (
                <div
                  key={item.id}
                  className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                    currentlyProcessing === item.id ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
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

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="font-semibold text-lg mb-1">
                            {editingItemId === item.id && editingField === 'title' ? (
                              <div 
                                className="space-y-1"
                                ref={(el) => editingRefs.current[`title-${item.id}`] = el}
                              >
                                <div className="flex gap-2 items-center">
                                  <Input
                                    value={tempEditValue}
                                    onChange={(e) => setTempEditValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        saveEdit(item.id, 'title', tempEditValue);
                                      } else if (e.key === 'Escape') {
                                        cancelEdit();
                                      }
                                    }}
                                    className={`flex-1 ${tempEditValue.length > 140 ? 'border-red-500' : ''}`}
                                    autoFocus
                                    maxLength={150}
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => saveEdit(item.id, 'title', tempEditValue)}
                                    className="h-8 px-2"
                                    disabled={tempEditValue.length > 140 || tempEditValue.trim().length === 0}
                                  >
                                    ✓
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={cancelEdit}
                                    className="h-8 px-2"
                                  >
                                    ✕
                                  </Button>
                                </div>
                                <div className={`text-xs ${tempEditValue.length > 140 ? 'text-red-500' : 'text-gray-500'}`}>
                                  {tempEditValue.length}/140 karakter
                                </div>
                              </div>
                            ) : (
                              <div 
                                className="truncate cursor-pointer hover:bg-gray-50 px-2 py-1 rounded border-2 border-transparent hover:border-gray-200"
                                onClick={() => startEdit(item.id, 'title', item.product_data.title)}
                                title="Düzenlemek için tıklayın"
                              >
                                {item.product_data.title}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center gap-1">
                              {editingItemId === item.id && editingField === 'price' ? (
                                <div 
                                  className="flex gap-2 items-center"
                                  ref={(el) => editingRefs.current[`price-${item.id}`] = el}
                                >
                                  <span>$</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={tempEditValue}
                                    onChange={(e) => setTempEditValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        saveEdit(item.id, 'price', tempEditValue);
                                      } else if (e.key === 'Escape') {
                                        cancelEdit();
                                      }
                                    }}
                                    className="w-20 h-6 text-xs"
                                    autoFocus
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => saveEdit(item.id, 'price', tempEditValue)}
                                    className="h-6 px-1 text-xs"
                                  >
                                    ✓
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={cancelEdit}
                                    className="h-6 px-1 text-xs"
                                  >
                                    ✕
                                  </Button>
                                </div>
                              ) : (
                                <span 
                                  className="font-medium text-green-600 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded border border-transparent hover:border-gray-200"
                                  onClick={() => startEdit(item.id, 'price', item.product_data.price?.toString() || '0')}
                                  title="Düzenlemek için tıklayın"
                                >
                                  ${item.product_data.price?.toFixed(2) || '0.00'}
                                </span>
                              )}
                            </div>
                            <div>
                              {getCategoryName(item.product_data.taxonomy_id)}
                            </div>
                            <div>
                              {formatDate(item.created_at)}
                            </div>
                          </div>

                          <div className="mb-2">
                            <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                              <Image className="w-4 h-4" />
                              {item.product_data.images?.length || 0} resim
                              {item.product_data.video && (
                                <>
                                  <Video className="w-4 h-4 ml-2" />
                                  1 video
                                </>
                              )}
                            </div>
                            
                            {/* Medya görüntüleme/düzenleme */}
                            {editingMediaItemId === item.id ? (
                              <div 
                                className="space-y-2 p-2 border rounded"
                                ref={(el) => editingRefs.current[`media-${item.id}`] = el}
                              >
                                <div className="text-xs text-gray-600 mb-2">Resimleri sürükleyerek sıralayabilirsiniz</div>
                                <div className="flex flex-wrap gap-2">
                                  {/* Resimler */}
                                  {item.product_data.images?.map((img: any, idx: number) => (
                                    <div
                                      key={idx}
                                      draggable
                                      onDragStart={(e) => handleDragStart(e, idx)}
                                      onDragOver={handleDragOver}
                                      onDrop={(e) => handleDrop(e, idx, item.id)}
                                      className="relative w-16 h-16 rounded border overflow-hidden bg-gray-100 cursor-move hover:shadow-md group"
                                    >
                                      {img.base64 && (
                                        <img 
                                          src={`data:${img.type};base64,${img.base64}`}
                                          alt={`Resim ${idx + 1}`}
                                          className="w-full h-full object-cover"
                                        />
                                      )}
                                      <button
                                        onClick={() => removeImage(item.id, idx)}
                                        className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white rounded-bl text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                        title="Resmi sil"
                                      >
                                        ×
                                      </button>
                                      <div className="absolute bottom-0 left-0 w-full h-4 bg-black/50 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        {idx + 1}
                                      </div>
                                    </div>
                                  ))}
                                  
                                  {/* Video (en sonda) */}
                                  {item.product_data.video && (
                                    <div className="relative w-16 h-16 rounded border overflow-hidden bg-gray-100 group">
                                      {item.product_data.video.base64 && (
                                        <img 
                                          src={`data:${item.product_data.video.type};base64,${item.product_data.video.base64}`}
                                          alt="Video thumbnail"
                                          className="w-full h-full object-cover"
                                        />
                                      )}
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <Video className="w-4 h-4 text-white drop-shadow" />
                                      </div>
                                      <div className="absolute bottom-0 left-0 w-full h-4 bg-black/50 text-white text-xs flex items-center justify-center">
                                        Video
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Yeni resim ekleme butonu */}
                                  <div className="w-16 h-16 rounded border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-100">
                                    <Plus className="w-6 h-6 text-gray-400" />
                                  </div>
                                </div>
                                
                                <div className="flex gap-2 mt-2">
                                  <Button
                                    size="sm"
                                    onClick={() => setEditingMediaItemId(null)}
                                    className="h-7 px-3 text-xs"
                                  >
                                    ✓ Tamam
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-1">
                                {/* Küçük thumbnail'ler - tıklanabilir */}
                                {item.product_data.images?.slice(0, 4).map((img: any, idx: number) => (
                                  <div 
                                    key={idx} 
                                    className="w-8 h-8 rounded border overflow-hidden bg-gray-100 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
                                    onClick={() => startMediaEdit(item.id)}
                                    title="Medyaları düzenlemek için tıklayın"
                                  >
                                    {img.base64 && (
                                      <img 
                                        src={`data:${img.type};base64,${img.base64}`}
                                        alt={`Resim ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                    )}
                                  </div>
                                ))}
                                {(item.product_data.images?.length || 0) > 4 && (
                                  <div 
                                    className="w-8 h-8 rounded border bg-gray-100 flex items-center justify-center text-xs text-gray-500 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
                                    onClick={() => startMediaEdit(item.id)}
                                    title="Tüm medyaları görmek için tıklayın"
                                  >
                                    +{(item.product_data.images?.length || 0) - 4}
                                  </div>
                                )}
                                {/* Video thumbnail - tıklanabilir */}
                                {item.product_data.video && (
                                  <div 
                                    className="w-8 h-8 rounded border overflow-hidden bg-gray-100 relative cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
                                    onClick={() => startMediaEdit(item.id)}
                                    title="Medyaları düzenlemek için tıklayın"
                                  >
                                    {item.product_data.video.base64 && (
                                      <img 
                                        src={`data:${item.product_data.video.type};base64,${item.product_data.video.base64}`}
                                        alt="Video"
                                        className="w-full h-full object-cover"
                                      />
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <Video className="w-2 h-2 text-white drop-shadow" />
                                    </div>
                                  </div>
                                )}
                                {/* Eğer hiç medya yoksa tıklanabilir alan */}
                                {(!item.product_data.images || item.product_data.images.length === 0) && !item.product_data.video && (
                                  <div 
                                    className="w-8 h-8 rounded border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all"
                                    onClick={() => startMediaEdit(item.id)}
                                    title="Medya eklemek için tıklayın"
                                  >
                                    <Plus className="w-3 h-3 text-gray-400" />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1 mb-2">
                            {editingItemId === item.id && editingField === 'tags' ? (
                              <div 
                                className="w-full space-y-2"
                                ref={(el) => editingRefs.current[`tags-${item.id}`] = el}
                              >
                                {/* Etiket sayısı ve bilgi */}
                                <div className="flex justify-between items-center text-xs">
                                  <span className={`${editingTags.length >= 13 ? 'text-red-500' : 'text-gray-500'}`}>
                                    {editingTags.length}/13 etiket
                                  </span>
                                  <span className="text-gray-400">Max 20 karakter/etiket</span>
                                </div>
                                
                                {/* Mevcut etiketler */}
                                <div className="flex flex-wrap gap-1">
                                  {editingTags.map((tag, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs flex items-center gap-1 pr-1">
                                      #{tag}
                                      <button
                                        onClick={() => removeTag(tag)}
                                        className="hover:bg-red-500 hover:text-white rounded-full w-3 h-3 flex items-center justify-center text-xs"
                                        title="Etiketi sil"
                                      >
                                        ×
                                      </button>
                                    </Badge>
                                  ))}
                                </div>
                                
                                {/* Yeni etiket ekleme */}
                                <div className="space-y-1">
                                  <div className="flex gap-2 items-center">
                                    <Input
                                      value={newTagInput}
                                      onChange={(e) => setNewTagInput(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          addTag();
                                        } else if (e.key === 'Escape') {
                                          cancelEdit();
                                        }
                                      }}
                                      placeholder="Yeni etiket ekle..."
                                      className={`flex-1 h-8 text-xs ${newTagInput.length > 20 ? 'border-red-500' : ''}`}
                                      autoFocus
                                      maxLength={25}
                                      disabled={editingTags.length >= 13}
                                    />
                                    <Button
                                      size="sm"
                                      onClick={addTag}
                                      disabled={!newTagInput.trim() || newTagInput.length > 20 || editingTags.length >= 13}
                                      className="h-8 px-2"
                                      variant="outline"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </Button>
                                  </div>
                                  <div className={`text-xs ${newTagInput.length > 20 ? 'text-red-500' : 'text-gray-500'}`}>
                                    {newTagInput.length}/20 karakter
                                  </div>
                                </div>
                                
                                {/* Kaydet/İptal butonları */}
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => saveEdit(item.id, 'tags')}
                                    className="h-8 px-3"
                                  >
                                    ✓ Kaydet
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={cancelEdit}
                                    className="h-8 px-3"
                                  >
                                    ✕ İptal
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div 
                                className="flex flex-wrap gap-1 cursor-pointer hover:bg-gray-50 p-1 rounded border-2 border-transparent hover:border-gray-200 w-full"
                                onClick={() => startEdit(item.id, 'tags', item.product_data.tags || [])}
                                title="Etiketleri düzenlemek için tıklayın"
                              >
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
                                {(!item.product_data.tags || item.product_data.tags.length === 0) && (
                                  <span className="text-xs text-gray-400 italic">Etiket eklemek için tıklayın</span>
                                )}
                              </div>
                            )}
                          </div>

                          {item.error_message && (
                            <div className="text-sm text-red-600 bg-red-50 p-2 rounded space-y-2">
                              <div>{item.error_message}</div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => retryQueueItem(item.id)}
                                disabled={currentlyProcessing !== null}
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Tekrar Dene
                              </Button>
                            </div>
                          )}
                        </div>

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
                            
                            {item.status === 'pending' && (
                              <Button
                                size="sm"
                                disabled={currentlyProcessing !== null}
                                className="h-8"
                                onClick={() => processQueueItem(item.id)}
                              >
                                {currentlyProcessing === item.id ? (
                                  <>
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    Gönderiliyor...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-3 h-3 mr-1" />
                                    Direkt Gönder
                                  </>
                                )}
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
    </div>
  );
  const renderAutoAdd = () => <div>Otomatik ekleme özelliği yakında...</div>;

  return (
    <DndProvider backend={HTML5Backend}>
      <>
        <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'products' && renderProducts()}
        {activeTab === 'queue' && renderQueue()}
        {activeTab === 'auto-add' && renderAutoAdd()}
      </div>

        <ProductFormModal 
          isOpen={isProductFormOpen} 
          onClose={() => setIsProductFormOpen(false)} 
        />
      </>
    </DndProvider>
  );
} 