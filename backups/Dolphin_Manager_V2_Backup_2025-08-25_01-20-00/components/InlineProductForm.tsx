'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  Image as ImageIcon, 
  Tag, 
  DollarSign, 
  FileText,
  Loader2,
  CheckCircle,
  Send
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface InlineProductFormProps {
  isVisible: boolean;
  autoFiles: File[];
  autoMode: 'queue' | 'direct-etsy';
  onSubmitSuccess: (productTitle?: string) => void;
  onClose: () => void;
}

export default function InlineProductForm({
  isVisible,
  autoFiles,
  autoMode,
  onSubmitSuccess,
  onClose
}: InlineProductFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: 80,
    tags: '',
    quantity: 999,
    images: [] as File[]
  });
  const [progress, setProgress] = useState(0);

  // Auto-fill form when files change
  useEffect(() => {
    if (autoFiles.length > 0 && isVisible) {
      const firstImage = autoFiles.find(f => f.type.startsWith('image/'));
      if (firstImage) {
        const baseName = firstImage.name.replace(/\.[^/.]+$/, "");
        const cleanName = baseName
          .replace(/[_-]/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
        
        const autoTitle = `${cleanName} Canvas Wall Art - Modern Home Decor`;
        const autoDescription = `🌟 Made Just for You – Fast & Safe Delivery 🌟

💡 Looking to personalize your wall art? We offer custom sizing and can turn your personal images into beautiful canvas prints.

✨ Features:
• High-quality canvas material
• Multiple size options available
• Ready to hang with included hardware
• Perfect for home, office, or as a gift

📦 Fast Processing & Shipping:
• Orders processed within 1-3 business days
• Secure packaging to ensure safe delivery
• Multiple frame options available

🎨 Want something unique? Message us for custom orders!`;

        const autoTags = 'wall art, canvas print, modern decor, home decoration, living room art, bedroom decor, office art, contemporary';

        setFormData({
          title: '', // Boş başlasın, kullanıcı dolduracak
          description: autoDescription,
          price: 80,
          tags: autoTags,
          quantity: 999,
          images: autoFiles
        });

        // Otomatik başlık oluşturma fonksiyonu
        const generateTitle = () => {
          return autoTitle.length > 140 ? autoTitle.substring(0, 137) + '...' : autoTitle;
        };

        // Form'a otomatik başlığı set et ve submit et
        setTimeout(() => {
          setFormData(prev => ({
            ...prev,
            title: generateTitle() // 2 saniye sonra otomatik doldur
          }));
          
          // Title doldurulduktan sonra submit et
          setTimeout(() => {
            // Verify data before submit
            console.log('🔍 Submit öncesi form kontrolü:', {
              title: generateTitle(),
              images: autoFiles.length,
              description: autoDescription.length
            });
            
            handleSubmit();
          }, 500); // Kısa bekleme
        }, 2000);
      }
    }
  }, [autoFiles, isVisible]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    
    // Son kontrolü yap - veriler hazır mı?
    if (!formData.title || formData.images.length === 0) {
      console.log('⚠️ Form henüz hazır değil, bekle...', {
        title: formData.title,
        images: formData.images.length
      });
      return;
    }
    
    setIsSubmitting(true);
    setProgress(0);

    try {
      // Progress simulation
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Create FormData
      const submitFormData = new FormData();
      
      console.log('📝 Gönderilecek veriler:', {
        title: formData.title,
        description: formData.description.substring(0, 100) + '...',
        images: formData.images.length,
        tags: formData.tags.split(',').length
      });
      
      const listingData = {
        title: formData.title,
        description: formData.description,
        price: formData.price,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        quantity: formData.quantity,
        taxonomy_id: 1027,
        who_made: "i_did",
        when_made: "made_to_order",
        is_supply: false,
        renewal_option: "automatic",
        state: autoMode === 'direct-etsy' ? "draft" : "draft",
        is_personalizable: true,
        personalization_is_required: false,
        personalization_instructions: "Phone Number for Delivery",
        personalization_char_count_max: 256,
        shipping_profile_id: 1,
        shop_section_id: null
      };

      submitFormData.append('listingData', JSON.stringify(listingData));

      // Add images
      console.log(`📷 Resimler ekleniyor: ${formData.images.length} adet`);
      formData.images.forEach((file, index) => {
        console.log(`📷 Resim ${index + 1}: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
        submitFormData.append(`imageFile_${index}`, file);
      });

      console.log(`🚀 Direkt Etsy'ye draft olarak gönderiliyor:`, formData.title);

      // API call - Direkt Etsy create API kullan
      const response = await fetch('/api/etsy/listings/create', {
        method: 'POST',
        body: submitFormData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Ürün başarıyla eklendi:', result);

      toast({
        title: "Başarılı!",
        description: "Ürün Etsy'ye draft olarak eklendi",
      });

      // Success callback - gerçek başarı sonrası çağır
      console.log('✅ Ürün başarıyla eklendi, 2 saniye bekleyip sonraki ürüne geçiliyor...');
      setTimeout(() => {
        onSubmitSuccess(formData.title);
        setIsSubmitting(false);
        setProgress(0);
      }, 2000); // Daha uzun bekle

    } catch (error) {
      console.error('❌ Form submit hatası:', error);
      
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Ürün eklenirken hata oluştu: " + error,
      });
      
      setIsSubmitting(false);
      setProgress(0);
    }
  }, [formData, autoMode, onSubmitSuccess, toast, isSubmitting]);

  if (!isVisible) return null;

  return (
    <div className="space-y-4">
      {/* Progress bar when submitting */}
      {isSubmitting && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-600 font-medium">
              Etsy'ye Draft Gönderiliyor...
            </span>
            <span className="text-gray-500">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Form fields */}
      <div className="space-y-4">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-medium">Ürün Başlığı</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="text-sm"
            disabled={isSubmitting}
          />
          <div className="text-xs text-gray-500">{formData.title.length}/140 karakter</div>
        </div>

        {/* Images preview */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Görseller ({formData.images.length})</Label>
          <div className="grid grid-cols-4 gap-2">
            {formData.images.slice(0, 8).map((file, index) => (
              <div key={index} className="relative">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Görsel ${index + 1}`}
                  className="w-full h-16 object-cover rounded border"
                />
                <div className="absolute bottom-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1 py-0.5 rounded">
                  {index + 1}
                </div>
              </div>
            ))}
            {formData.images.length > 8 && (
              <div className="flex items-center justify-center h-16 bg-gray-100 rounded border text-xs text-gray-500">
                +{formData.images.length - 8}
              </div>
            )}
          </div>
        </div>

        {/* Fiyat ve stok kaldırıldı - otomatik ayarlanıyor */}

        {/* Tags - Sadece görüntüleme */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-600">Etiketler</Label>
          <div className="text-sm bg-gray-50 px-3 py-2 rounded border text-gray-700 min-h-[2.5rem] flex items-center">
            {formData.tags || 'Otomatik etiketler oluşturuluyor...'}
          </div>
          <div className="text-xs text-gray-500">
            {formData.tags.split(',').filter(tag => tag.trim()).length}/13 etiket (otomatik)
          </div>
        </div>

        {/* Description - Sadece görüntüleme */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-600">Açıklama</Label>
          <div className="text-sm bg-gray-50 px-3 py-2 rounded border text-gray-700 min-h-[8rem] max-h-[8rem] overflow-y-auto">
            {formData.description || 'Otomatik açıklama oluşturuluyor...'}
          </div>
          <div className="text-xs text-gray-500">{formData.description.length} karakter (otomatik)</div>
        </div>

        {/* Submit button */}
        <div className="pt-4">
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.title}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Etsy'ye Draft Gönderiliyor...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Etsy'ye Draft Gönder
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}