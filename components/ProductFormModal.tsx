'use client';

import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Upload, 
  X, 
  Plus, 
  Sparkles, 
  Save,
  Clock,
  Image as ImageIcon
} from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Variation {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface ProductMedia {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'video';
}

export default function ProductFormModal({ isOpen, onClose }: ProductFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('');
  const [variations, setVariations] = useState<Variation[]>([
    { id: '1', name: 'Standart', price: 0, stock: 10 }
  ]);
  const [media, setMedia] = useState<ProductMedia[]>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const handleMediaUpload = (files: FileList | null) => {
    if (!files) return;
    
    Array.from(files).forEach((file) => {
      const preview = URL.createObjectURL(file);
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      
      setMedia(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview,
        type
      }]);
    });
  };

  const removeMedia = (id: string) => {
    setMedia(prev => {
      const item = prev.find(m => m.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter(m => m.id !== id);
    });
  };

  const addVariation = () => {
    setVariations(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      price: 0,
      stock: 10
    }]);
  };

  const removeVariation = (id: string) => {
    if (variations.length > 1) {
      setVariations(prev => prev.filter(v => v.id !== id));
    }
  };

  const updateVariation = (id: string, field: keyof Variation, value: string | number) => {
    setVariations(prev => prev.map(v => 
      v.id === id ? { ...v, [field]: value } : v
    ));
  };

  const generateAIContent = async () => {
    if (media.length === 0) {
      alert('AI içerik üretmek için en az bir görsel yükleyin');
      return;
    }

    setIsGeneratingAI(true);
    try {
      // AI üretimi simülasyonu
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setTitle('Modern Minimalist Canvas Duvar Sanatı Soyut Geometrik Tasarım');
      setTags('wall art, canvas print, abstract art, minimalist, modern, geometric, home decor, living room, bedroom art, contemporary, black white, nordic style, scandinavian');
      setDescription(`Bu zarif ve modern canvas duvar sanatı parçası, evinizin her köşesine sofistike bir dokunuş katacak.

🎨 ÜRÜN ÖZELLİKLERİ:
• Yüksek kaliteli canvas malzeme
• Canlı ve solmayan renkler
• Ahşap çerçeve ile birlikte
• Asılmaya hazır halde gönderilir

✨ TASARIM:
Minimalist geometrik şekillerin uyumlu bir kompozisyonu ile modern evlerin vazgeçilmez dekoratif elementi.

📐 UYGUN ALANLAR:
• Oturma odası
• Yatak odası
• Ofis
• Koridor
• Modern iç mekanlar

🎁 Kendiniz için veya sevdikleriniz için mükemmel bir hediye seçeneği!`);
      
    } catch (error) {
      console.error('AI üretim hatası:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSubmit = async (action: 'draft' | 'queue') => {
    const formData = {
      title,
      description,
      tags: tags.split(',').map(t => t.trim()),
      category,
      variations,
      media: media.map(m => ({ id: m.id, type: m.type })),
      action
    };

    console.log('Form gönderiliyor:', formData);
    
    // Firebase'e kaydetme işlemi buraya gelecek
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>Yeni Ürün Ekle</span>
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Varyasyonlu ürün ekleme formu - AI destekli içerik üretimi ile
          </p>
        </DialogHeader>

        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Temel Bilgiler</TabsTrigger>
            <TabsTrigger value="variations">Varyasyonlar</TabsTrigger>
            <TabsTrigger value="media">Medya</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900">Ürün Başlığı</label>
                <div className="flex space-x-2">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ürün başlığını girin"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={generateAIContent}
                    disabled={isGeneratingAI || media.length === 0}
                    className="shrink-0"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {isGeneratingAI ? 'Üretiliyor...' : 'AI Üret'}
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900">Etiketler</label>
                <Input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Virgülle ayırarak etiketler girin"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Maksimum 13 etiket, her biri en fazla 20 karakter
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900">Kategori</label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ürün kategorisi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900">Ürün Açıklaması</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detaylı ürün açıklaması"
                  rows={8}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="variations" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Ürün Varyasyonları</h3>
              <Button variant="outline" onClick={addVariation}>
                <Plus className="w-4 h-4 mr-2" />
                Varyasyon Ekle
              </Button>
            </div>

            <div className="space-y-3">
              {variations.map((variation, index) => (
                <Card key={variation.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Varyasyon {index + 1}</CardTitle>
                      {variations.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVariation(variation.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-900">Varyasyon Adı</label>
                      <Input
                        value={variation.name}
                        onChange={(e) => updateVariation(variation.id, 'name', e.target.value)}
                        placeholder="Örn: Küçük, Orta, Büyük"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-900">Fiyat ($)</label>
                      <Input
                        type="number"
                        value={variation.price}
                        onChange={(e) => updateVariation(variation.id, 'price', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-900">Stok</label>
                      <Input
                        type="number"
                        value={variation.stock}
                        onChange={(e) => updateVariation(variation.id, 'stock', parseInt(e.target.value) || 0)}
                        placeholder="10"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="media" className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900">Medya Dosyaları</label>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                onDrop={(e) => {
                  e.preventDefault();
                  handleMediaUpload(e.dataTransfer.files);
                }}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.multiple = true;
                  input.accept = 'image/*,video/*';
                  input.onchange = (e) => handleMediaUpload((e.target as HTMLInputElement).files);
                  input.click();
                }}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-700">Dosyaları sürükleyip bırakın veya tıklayarak seçin</p>
                <p className="text-sm text-gray-600 mt-1">
                  Resim ve video dosyaları desteklenir
                </p>
              </div>
            </div>

            {media.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {media.map((item) => (
                  <div key={item.id} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                      {item.type === 'image' ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.preview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          src={item.preview}
                          className="w-full h-full object-cover"
                          muted
                        />
                      )}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeMedia(item.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                    <div className="absolute bottom-2 left-2">
                      {item.type === 'video' ? (
                        <div className="bg-black/50 text-white px-2 py-1 rounded text-xs">
                          Video
                        </div>
                      ) : (
                        <ImageIcon className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            İptal
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleSubmit('draft')}
            disabled={!title.trim()}
          >
            <Save className="w-4 h-4 mr-2" />
            Taslak Olarak Etsy&apos;e Yükle
          </Button>
          <Button 
            onClick={() => handleSubmit('queue')}
            disabled={!title.trim()}
          >
            <Clock className="w-4 h-4 mr-2" />
            Kuyruğa Ekle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}