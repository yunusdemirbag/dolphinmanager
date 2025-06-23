'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Upload, 
  X, 
  Plus, 
  Sparkles, 
  Save,
  Clock,
  Image as ImageIcon,
  Video,
  Tag as TagIcon
} from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Variation {
  size: string;
  pattern: string;
  price: number;
  is_active: boolean;
}

interface ProductMedia {
  file: File;
  preview: string;
  uploading: boolean;
  error?: string;
}

interface ShippingProfile {
  shipping_profile_id: number;
  title: string;
  min_processing_days: number;
  max_processing_days: number;
}

interface ShopSection {
  shop_section_id: number;
  title: string;
}

interface TaxonomyNode {
  id: number;
  name: string;
  path: string[];
  level: number;
}

// Predefined variations from source
const predefinedVariations: Variation[] = [
  // 8"x12" - 20x30 cm
  { size: '8"x12" - 20x30 cm', pattern: 'Roll', price: 80, is_active: true },
  { size: '8"x12" - 20x30 cm', pattern: 'Standard Canvas', price: 0, is_active: false },
  { size: '8"x12" - 20x30 cm', pattern: 'White Frame', price: 0, is_active: false },
  { size: '8"x12" - 20x30 cm', pattern: 'Gold Frame', price: 0, is_active: false },
  { size: '8"x12" - 20x30 cm', pattern: 'Silver Frame', price: 0, is_active: false },
  { size: '8"x12" - 20x30 cm', pattern: 'Black Frame', price: 0, is_active: false },

  // 14"x20" - 35x50cm
  { size: '14"x20" - 35x50cm', pattern: 'Roll', price: 90, is_active: true },
  { size: '14"x20" - 35x50cm', pattern: 'Standard Canvas', price: 130, is_active: true },
  { size: '14"x20" - 35x50cm', pattern: 'White Frame', price: 230, is_active: true },
  { size: '14"x20" - 35x50cm', pattern: 'Gold Frame', price: 230, is_active: true },
  { size: '14"x20" - 35x50cm', pattern: 'Silver Frame', price: 230, is_active: true },
  { size: '14"x20" - 35x50cm', pattern: 'Black Frame', price: 230, is_active: true },

  // 16"x24" - 40x60cm
  { size: '16"x24" - 40x60cm', pattern: 'Roll', price: 100, is_active: true },
  { size: '16"x24" - 40x60cm', pattern: 'Standard Canvas', price: 164, is_active: true },
  { size: '16"x24" - 40x60cm', pattern: 'White Frame', price: 280, is_active: true },
  { size: '16"x24" - 40x60cm', pattern: 'Gold Frame', price: 280, is_active: true },
  { size: '16"x24" - 40x60cm', pattern: 'Silver Frame', price: 280, is_active: true },
  { size: '16"x24" - 40x60cm', pattern: 'Black Frame', price: 280, is_active: true },

  // 20"x28" - 50x70cm
  { size: '20"x28" - 50x70cm', pattern: 'Roll', price: 150, is_active: true },
  { size: '20"x28" - 50x70cm', pattern: 'Standard Canvas', price: 250, is_active: true },
  { size: '20"x28" - 50x70cm', pattern: 'White Frame', price: 380, is_active: true },
  { size: '20"x28" - 50x70cm', pattern: 'Gold Frame', price: 380, is_active: true },
  { size: '20"x28" - 50x70cm', pattern: 'Silver Frame', price: 380, is_active: true },
  { size: '20"x28" - 50x70cm', pattern: 'Black Frame', price: 380, is_active: true },

  // 24"x36" - 60x90cm
  { size: '24"x36" - 60x90cm', pattern: 'Roll', price: 166, is_active: true },
  { size: '24"x36" - 60x90cm', pattern: 'Standard Canvas', price: 290, is_active: true },
  { size: '24"x36" - 60x90cm', pattern: 'White Frame', price: 574, is_active: true },
  { size: '24"x36" - 60x90cm', pattern: 'Gold Frame', price: 574, is_active: true },
  { size: '24"x36" - 60x90cm', pattern: 'Silver Frame', price: 574, is_active: true },
  { size: '24"x36" - 60x90cm', pattern: 'Black Frame', price: 574, is_active: true },

  // 28"x40" - 70x100cm
  { size: '28"x40" - 70x100cm', pattern: 'Roll', price: 220, is_active: true },
  { size: '28"x40" - 70x100cm', pattern: 'Standard Canvas', price: 420, is_active: true },
  { size: '28"x40" - 70x100cm', pattern: 'White Frame', price: 780, is_active: true },
  { size: '28"x40" - 70x100cm', pattern: 'Gold Frame', price: 780, is_active: true },
  { size: '28"x40" - 70x100cm', pattern: 'Silver Frame', price: 780, is_active: true },
  { size: '28"x40" - 70x100cm', pattern: 'Black Frame', price: 780, is_active: true },

  // 32"x48" - 80x120cm
  { size: '32"x48" - 80x120cm', pattern: 'Roll', price: 260, is_active: true },
  { size: '32"x48" - 80x120cm', pattern: 'Standard Canvas', price: 540, is_active: true },
  { size: '32"x48" - 80x120cm', pattern: 'White Frame', price: 1140, is_active: true },
  { size: '32"x48" - 80x120cm', pattern: 'Gold Frame', price: 1140, is_active: true },
  { size: '32"x48" - 80x120cm', pattern: 'Silver Frame', price: 1140, is_active: true },
  { size: '32"x48" - 80x120cm', pattern: 'Black Frame', price: 1140, is_active: true },

  // 36"x51" - 90x130cm
  { size: '36"x51" - 90x130cm', pattern: 'Roll', price: 320, is_active: true },
  { size: '36"x51" - 90x130cm', pattern: 'Standard Canvas', price: 980, is_active: true },
  { size: '36"x51" - 90x130cm', pattern: 'White Frame', price: 1440, is_active: true },
  { size: '36"x51" - 90x130cm', pattern: 'Gold Frame', price: 1440, is_active: true },
  { size: '36"x51" - 90x130cm', pattern: 'Silver Frame', price: 1440, is_active: true },
  { size: '36"x51" - 90x130cm', pattern: 'Black Frame', price: 1440, is_active: true },
];

export default function ProductFormModal({ isOpen, onClose }: ProductFormModalProps) {
  // Basic product info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(4);
  
  // Etsy specific fields
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [taxonomyId, setTaxonomyId] = useState(1027); // Wall Decor default
  const [shippingProfileId, setShippingProfileId] = useState('');
  const [selectedShopSection, setSelectedShopSection] = useState('');
  
  // Personalization
  const [isPersonalizable, setIsPersonalizable] = useState(true);
  const [personalizationRequired, setPersonalizationRequired] = useState(false);
  const [personalizationInstructions, setPersonalizationInstructions] = useState('Phone Number for Delivery');
  
  // Variations
  const [hasVariations, setHasVariations] = useState(true);
  const [variations, setVariations] = useState<Variation[]>(predefinedVariations);
  
  // Media
  const [productImages, setProductImages] = useState<ProductMedia[]>([]);
  const [videoFile, setVideoFile] = useState<ProductMedia | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // UI states
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Data states
  const [shippingProfiles, setShippingProfiles] = useState<ShippingProfile[]>([]);
  const [shopSections, setShopSections] = useState<ShopSection[]>([]);
  const [taxonomyNodes, setTaxonomyNodes] = useState<TaxonomyNode[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Load external data
  useEffect(() => {
    if (isOpen) {
      loadExternalData();
    }
  }, [isOpen]);

  const loadExternalData = async () => {
    setLoadingData(true);
    try {
      // Get current user for Firebase queries
      const mockUserId = 'local-user-123'; // In real app, get from auth
      let connectedShopId: number | null = null;

      // Try to get connected store from Firebase first
      try {
        const storeResponse = await fetch(`/api/store/firebase?user_id=${mockUserId}`);
        if (storeResponse.ok) {
          const storeData = await storeResponse.json();
          connectedShopId = storeData.store?.shop_id;
          console.log('Connected store from Firebase:', storeData.store);
        }
      } catch {
        console.log('No store found in Firebase, will use fallback');
      }

      // Load shipping profiles (try Firebase first, then fallback)
      try {
        let shippingData = null;
        
        if (connectedShopId) {
          const firebaseResponse = await fetch(`/api/shipping-profiles/firebase?shop_id=${connectedShopId}`);
          if (firebaseResponse.ok) {
            shippingData = await firebaseResponse.json();
            console.log('Shipping profiles loaded from Firebase');
          }
        }
        
        if (!shippingData || !shippingData.profiles?.length) {
          const shippingResponse = await fetch('/api/etsy/shipping-profiles');
          if (shippingResponse.ok) {
            shippingData = await shippingResponse.json();
            console.log('Shipping profiles loaded from Etsy API');
          }
        }

        setShippingProfiles(shippingData?.profiles || [
          { shipping_profile_id: 1, title: 'Standard Shipping', min_processing_days: 1, max_processing_days: 3 },
          { shipping_profile_id: 2, title: 'Express Shipping', min_processing_days: 1, max_processing_days: 2 }
        ]);
      } catch (error) {
        console.error('Shipping profiles load error:', error);
        setShippingProfiles([
          { shipping_profile_id: 1, title: 'Standard Shipping', min_processing_days: 1, max_processing_days: 3 },
          { shipping_profile_id: 2, title: 'Express Shipping', min_processing_days: 1, max_processing_days: 2 }
        ]);
      }

      // Load shop sections (try Firebase first, then fallback)
      try {
        let sectionsData = null;
        
        if (connectedShopId) {
          const firebaseResponse = await fetch(`/api/shop-sections/firebase?shop_id=${connectedShopId}`);
          if (firebaseResponse.ok) {
            sectionsData = await firebaseResponse.json();
            console.log('Shop sections loaded from Firebase');
          }
        }
        
        if (!sectionsData || !sectionsData.sections?.length) {
          const sectionsResponse = await fetch('/api/etsy/shop-sections');
          if (sectionsResponse.ok) {
            sectionsData = await sectionsResponse.json();
            console.log('Shop sections loaded from Etsy API');
          }
        }

        setShopSections(sectionsData?.sections || [
          { shop_section_id: 0, title: 'Home' },
          { shop_section_id: 1, title: 'Woman Art' },
          { shop_section_id: 2, title: 'Abstract Art' },
          { shop_section_id: 3, title: 'Love Art' },
          { shop_section_id: 4, title: 'Flowers Art' },
          { shop_section_id: 5, title: 'Landscape Art' }
        ]);
      } catch (error) {
        console.error('Shop sections load error:', error);
        setShopSections([
          { shop_section_id: 0, title: 'Home' },
          { shop_section_id: 1, title: 'Woman Art' },
          { shop_section_id: 2, title: 'Abstract Art' },
          { shop_section_id: 3, title: 'Love Art' },
          { shop_section_id: 4, title: 'Flowers Art' },
          { shop_section_id: 5, title: 'Landscape Art' }
        ]);
      }

      // Load taxonomy (try Firebase first, then fallback)
      try {
        let taxonomyData = null;
        
        const firebaseResponse = await fetch('/api/taxonomy/firebase');
        if (firebaseResponse.ok) {
          taxonomyData = await firebaseResponse.json();
          console.log('Taxonomy loaded from Firebase');
        }
        
        if (!taxonomyData || !taxonomyData.taxonomy_nodes?.length) {
          const taxonomyResponse = await fetch('/api/etsy/taxonomy');
          if (taxonomyResponse.ok) {
            taxonomyData = await taxonomyResponse.json();
            console.log('Taxonomy loaded from Etsy API');
          }
        }

        setTaxonomyNodes(taxonomyData?.taxonomy_nodes || [
          { id: 68887271, name: "Art & Collectibles", level: 1, path: ["Art & Collectibles"] },
          { id: 68887312, name: "Prints", level: 2, path: ["Art & Collectibles", "Prints"] },
          { id: 1027, name: "Home Decor", level: 2, path: ["Home & Living", "Home Decor"] },
          { id: 1366, name: "Wall Decor", level: 3, path: ["Home & Living", "Home Decor", "Wall Decor"] }
        ]);
      } catch (error) {
        console.error('Taxonomy load error:', error);
        setTaxonomyNodes([
          { id: 68887271, name: "Art & Collectibles", level: 1, path: ["Art & Collectibles"] },
          { id: 68887312, name: "Prints", level: 2, path: ["Art & Collectibles", "Prints"] },
          { id: 1027, name: "Home Decor", level: 2, path: ["Home & Living", "Home Decor"] },
          { id: 1366, name: "Wall Decor", level: 3, path: ["Home & Living", "Home Decor", "Wall Decor"] }
        ]);
      }

    } catch (error) {
      console.error('External data load error:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleMediaUpload = useCallback((files: FileList | null) => {
    if (!files) return;
    
    Array.from(files).forEach((file) => {
      // File size check (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} dosyası çok büyük. Maksimum 10MB olmalı.`);
        return;
      }
      
      // File type check
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        alert(`${file.name} desteklenmeyen dosya türü. Sadece resim ve video dosyaları kabul edilir.`);
        return;
      }
      
      const preview = URL.createObjectURL(file);
      const mediaFile = {
        file,
        preview,
        uploading: false,
        error: undefined
      };
      
      if (file.type.startsWith('video/')) {
        setVideoFile(mediaFile);
      } else {
        setProductImages(prev => [...prev, mediaFile]);
      }
    });
  }, []);

  const removeMedia = (index: number) => {
    setProductImages(prev => {
      const item = prev[index];
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeVideo = () => {
    if (videoFile) {
      URL.revokeObjectURL(videoFile.preview);
      setVideoFile(null);
    }
  };

  const addTag = () => {
    if (newTag.trim() && tags.length < 13 && !tags.includes(newTag.trim())) {
      setTags(prev => [...prev, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const updateVariation = (index: number, field: keyof Variation, value: string | number | boolean) => {
    setVariations(prev => prev.map((variation, i) => 
      i === index ? { ...variation, [field]: value } : variation
    ));
  };

  const generateAIContent = async () => {
    if (productImages.length === 0) {
      alert('AI içerik üretmek için en az bir görsel yükleyin');
      return;
    }

    setIsGeneratingAI(true);
    try {
      // AI generation simulation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Generate content based on selected taxonomy/category
      const categoryContent = getCategoryContent();
      
      setTitle(categoryContent.title);
      setTags(categoryContent.tags);
      setDescription(categoryContent.description);
      
    } catch (error) {
      console.error('AI üretim hatası:', error);
      alert('AI içerik üretimi sırasında hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const getCategoryContent = () => {
    const templates = {
      art: {
        title: 'Modern Minimalist Canvas Duvar Sanatı Soyut Geometrik Tasarım',
        tags: ['wall art', 'canvas print', 'abstract art', 'minimalist', 'modern', 'geometric', 'home decor', 'living room', 'bedroom art', 'contemporary', 'black white', 'nordic style', 'scandinavian'],
        description: `Bu zarif ve modern canvas duvar sanatı parçası, evinizin her köşesine sofistike bir dokunuş katacak.

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

🎁 Kendiniz için veya sevdikleriniz için mükemmel bir hediye seçeneği!`
      }
    };

    return templates.art;
  };

  const validateForm = () => {
    const errors = [];
    
    if (!title.trim()) errors.push('Ürün başlığı gereklidir');
    if (!description.trim()) errors.push('Ürün açıklaması gereklidir');
    if (productImages.length === 0) errors.push('En az bir ürün görseli gereklidir');
    if (tags.length === 0) errors.push('En az bir etiket gereklidir');
    if (!shippingProfileId) errors.push('Kargo profili seçimi gereklidir');
    
    if (hasVariations) {
      const activeVariations = variations.filter(v => v.is_active);
      if (activeVariations.length === 0) errors.push('En az bir aktif varyasyon gereklidir');
    }
    
    return errors;
  };

  const handleSubmit = async (action: 'draft' | 'queue') => {
    const errors = validateForm();
    if (errors.length > 0) {
      alert('Form hatası:\n' + errors.join('\n'));
      return;
    }

    const formData = {
      title: title.trim(),
      description: description.trim(),
      tags,
      quantity,
      taxonomy_id: taxonomyId,
      shipping_profile_id: parseInt(shippingProfileId),
      shop_section_id: selectedShopSection ? parseInt(selectedShopSection) : undefined,
      is_personalizable: isPersonalizable,
      personalization_is_required: personalizationRequired,
      personalization_instructions: personalizationInstructions,
      has_variations: hasVariations,
      variations: hasVariations ? variations.filter(v => v.is_active) : [],
      images: productImages.map((img, index) => ({
        file: img.file,
        alt_text: `${title} - ${index + 1}`,
        rank: index + 1
      })),
      video: videoFile?.file || null,
      materials: ["Cotton Canvas", "Wood Frame", "Hanger"],
      who_made: "i_did" as const,
      when_made: "2020_2024",
      state: action === 'draft' ? 'draft' : 'active',
      action,
      created_at: new Date().toISOString()
    };

    setSubmitting(true);
    try {
      if (action === 'queue') {
        const response = await fetch('/api/queue', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            product: formData,
            action: 'add'
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Ürün kuyruğa eklendi:', result);
          
          // Success notification
          const notification = document.createElement('div');
          notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
          notification.textContent = 'Ürün başarıyla kuyruğa eklendi!';
          document.body.appendChild(notification);
          setTimeout(() => notification.remove(), 3000);
        } else {
          throw new Error('Kuyruk API hatası');
        }
      } else {
        // Draft submission - save to Firebase
        try {
          const mockUserId = 'local-user-123'; // In real app, get from auth
          let shopId = 123456; // Default mock shop ID
          
          // Try to get connected shop ID
          try {
            const storeResponse = await fetch(`/api/store/firebase?user_id=${mockUserId}`);
            if (storeResponse.ok) {
              const storeData = await storeResponse.json();
              shopId = storeData.store?.shop_id || shopId;
            }
          } catch {
            console.log('Using mock shop ID');
          }

          const draftData = {
            user_id: mockUserId,
            shop_id: shopId,
            title: formData.title,
            description: formData.description,
            tags: formData.tags,
            images: formData.images.map(img => `blob:${img.file.name}`), // Mock image URLs
            variations: formData.variations,
            category_id: formData.taxonomy_id,
            shop_section_id: formData.shop_section_id,
            shipping_profile_id: formData.shipping_profile_id,
            is_personalized: formData.is_personalizable,
            processing_min: 1,
            processing_max: 3,
            status: 'draft' as const
          };

          const response = await fetch('/api/product-drafts/firebase', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(draftData),
          });

          if (response.ok) {
            const result = await response.json();
            console.log('Taslak Firebase\'e kaydedildi:', result);
            
            const notification = document.createElement('div');
            notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
            notification.textContent = 'Taslak başarıyla kaydedildi!';
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
          } else {
            throw new Error('Firebase kayıt hatası');
          }
        } catch (error) {
          console.error('Draft save error:', error);
          const notification = document.createElement('div');
          notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
          notification.textContent = 'Taslak kaydedilirken hata oluştu!';
          document.body.appendChild(notification);
          setTimeout(() => notification.remove(), 3000);
        }
      }
      
      // Reset form after successful submission
      setTitle('');
      setDescription('');
      setTags([]);
      setNewTag('');
      setQuantity(4);
      setShippingProfileId('');
      setSelectedShopSection('');
      setVariations(predefinedVariations);
      productImages.forEach(item => URL.revokeObjectURL(item.preview));
      setProductImages([]);
      if (videoFile) URL.revokeObjectURL(videoFile.preview);
      setVideoFile(null);
      
      onClose();
    } catch (error) {
      console.error('Ürün kaydetme hatası:', error);
      
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      notification.textContent = 'Ürün kaydedilirken hata oluştu!';
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>Yeni Ürün Ekle</span>
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Canvas ürün ekleme formu - AI destekli içerik üretimi ve Etsy entegrasyonu ile
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Medya Yükleme Bölümü */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2 flex items-center space-x-2">
              <ImageIcon className="w-5 h-5" />
              <span>Ürün Görselleri ve Video</span>
            </h3>
            
            <div>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
                  isDragging 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleMediaUpload(e.dataTransfer.files);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onClick={() => {
                  fileInputRef.current?.click();
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => handleMediaUpload(e.target.files)}
                />
                <Upload className={`w-8 h-8 mx-auto mb-3 ${
                  isDragging ? 'text-blue-500' : 'text-gray-400'
                }`} />
                <p className={`text-sm ${
                  isDragging ? 'text-blue-700' : 'text-gray-700'
                }`}>
                  {isDragging ? 'Dosyaları bırakın' : 'Görselleri ve videoyu sürükleyip bırakın veya tıklayarak seçin'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  JPG, PNG, GIF (max 10MB) • Video için MP4 (max 100MB)
                </p>
              </div>
            </div>

            {/* Uploaded Images */}
            {productImages.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium">Yüklenen Görseller ({productImages.length})</h4>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      productImages.forEach(item => URL.revokeObjectURL(item.preview));
                      setProductImages([]);
                    }}
                  >
                    Tümünü Temizle
                  </Button>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {productImages.map((item, index) => (
                    <div key={index} className="relative group">
                      <div className={`aspect-square rounded-lg overflow-hidden border-2 ${
                        index === 0 ? 'border-blue-500' : 'border-gray-200'
                      }`}>
                        <img
                          src={item.preview}
                          alt={`Ürün görseli ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {index === 0 && (
                        <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1 py-0.5 rounded">
                          Ana
                        </div>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeMedia(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                      <div className="absolute bottom-1 right-1 bg-black/50 text-white text-xs px-1 py-0.5 rounded">
                        {Math.round(item.file.size / 1024)}KB
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Video Section */}
            {videoFile && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Video</h4>
                <div className="relative group w-48">
                  <div className="aspect-video rounded-lg overflow-hidden border-2 border-gray-200">
                    <video
                      src={videoFile.preview}
                      className="w-full h-full object-cover"
                      controls
                      muted
                    />
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={removeVideo}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 py-0.5 rounded flex items-center space-x-1">
                    <Video className="w-3 h-3" />
                    <span>{Math.round(videoFile.file.size / 1024 / 1024)}MB</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Temel Bilgiler */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Temel Bilgiler</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2">Ürün Başlığı</label>
              <div className="flex space-x-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ürün başlığını girin"
                  className="flex-1"
                  maxLength={140}
                />
                <Button
                  variant="outline"
                  onClick={generateAIContent}
                  disabled={isGeneratingAI || productImages.length === 0}
                  className="shrink-0"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {isGeneratingAI ? 'Üretiliyor...' : 'AI Üret'}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">{title.length}/140 karakter</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Kategori</label>
                <Select value={taxonomyId.toString()} onValueChange={(value) => setTaxonomyId(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {taxonomyNodes.map((node) => (
                      <SelectItem key={node.id} value={node.id.toString()}>
                        {'  '.repeat(node.level - 1)}{node.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Mağaza Bölümü</label>
                <Select value={selectedShopSection} onValueChange={setSelectedShopSection} disabled={loadingData}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingData ? "Yükleniyor..." : "Bölüm seçin (opsiyonel)"} />
                  </SelectTrigger>
                  <SelectContent>
                    {shopSections.map((section) => (
                      <SelectItem key={section.shop_section_id} value={section.shop_section_id.toString()}>
                        {section.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Ürün Açıklaması</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detaylı ürün açıklaması yazın..."
                rows={8}
                maxLength={5000}
              />
              <p className="text-xs text-gray-500 mt-1">{description.length}/5000 karakter</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Stok Miktarı</label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  min="0"
                  max="999"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Kargo Profili</label>
                <Select value={shippingProfileId} onValueChange={setShippingProfileId} disabled={loadingData}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingData ? "Yükleniyor..." : "Kargo profili seçin"} />
                  </SelectTrigger>
                  <SelectContent>
                    {shippingProfiles.map((profile) => (
                      <SelectItem key={profile.shipping_profile_id} value={profile.shipping_profile_id.toString()}>
                        {profile.title} ({profile.min_processing_days}-{profile.max_processing_days} gün)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Etiketler */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2 flex items-center space-x-2">
              <TagIcon className="w-5 h-5" />
              <span>Etiketler</span>
            </h3>
            
            <div className="flex space-x-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Yeni etiket ekle"
                className="flex-1"
                maxLength={20}
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
              />
              <Button 
                type="button" 
                onClick={addTag}
                disabled={tags.length >= 13 || !newTag.trim()}
              >
                Ekle
              </Button>
            </div>
            
            <div className="flex justify-between text-xs text-gray-500">
              <span>Maksimum 13 etiket, her biri en fazla 20 karakter</span>
              <span>{tags.length}/13</span>
            </div>
            
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Kişiselleştirme */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Kişiselleştirme Seçenekleri</h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={isPersonalizable}
                  onCheckedChange={setIsPersonalizable}
                />
                <label className="text-sm font-medium">Bu ürün kişiselleştirilebilir</label>
              </div>
              
              {isPersonalizable && (
                <>
                  <div className="flex items-center space-x-2 ml-6">
                    <Switch
                      checked={personalizationRequired}
                      onCheckedChange={setPersonalizationRequired}
                    />
                    <label className="text-sm">Kişiselleştirme zorunlu</label>
                  </div>
                  
                  <div className="ml-6">
                    <label className="block text-sm font-medium mb-2">Kişiselleştirme Talimatları</label>
                    <Input
                      value={personalizationInstructions}
                      onChange={(e) => setPersonalizationInstructions(e.target.value)}
                      placeholder="Kişiselleştirme için gerekli bilgiler"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Varyasyonlar */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-lg font-medium">Ürün Varyasyonları</h3>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={hasVariations}
                  onCheckedChange={setHasVariations}
                />
                <label className="text-sm">Varyasyonları kullan</label>
              </div>
            </div>

            {hasVariations && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Canvas ürünler için önceden tanımlanmış boyut ve çerçeve varyasyonları
                </p>
                
                <div className="max-h-96 overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left p-3 font-medium">Aktif</th>
                        <th className="text-left p-3 font-medium">Boyut</th>
                        <th className="text-left p-3 font-medium">Çerçeve/Tür</th>
                        <th className="text-right p-3 font-medium">Fiyat ($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variations.map((variation, index) => (
                        <tr key={index} className={`border-t ${variation.is_active ? 'bg-green-50' : 'bg-gray-50'}`}>
                          <td className="p-3">
                            <Checkbox
                              checked={variation.is_active}
                              onCheckedChange={(checked) => updateVariation(index, 'is_active', checked)}
                            />
                          </td>
                          <td className="p-3 font-medium">{variation.size}</td>
                          <td className="p-3">{variation.pattern}</td>
                          <td className="p-3 text-right">
                            <Input
                              type="number"
                              value={variation.price}
                              onChange={(e) => updateVariation(index, 'price', parseFloat(e.target.value) || 0)}
                              className="w-20 text-right"
                              step="0.01"
                              min="0"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="text-xs text-gray-500">
                  Aktif varyasyonlar: {variations.filter(v => v.is_active).length} / {variations.length}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 pt-6">
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Button variant="outline" onClick={onClose} className="sm:w-auto w-full">
              İptal
            </Button>
            <div className="flex gap-2 flex-1">
              <Button 
                variant="outline" 
                onClick={() => handleSubmit('draft')}
                disabled={submitting || productImages.length === 0 || !title.trim()}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                {submitting ? 'Kaydediliyor...' : 'Taslak Kaydet'}
              </Button>
              <Button 
                onClick={() => handleSubmit('queue')}
                disabled={submitting || productImages.length === 0 || !title.trim()}
                className="flex-1"
              >
                <Clock className="w-4 h-4 mr-2" />
                {submitting ? 'Ekleniyor...' : 'Kuyruğa Ekle'}
              </Button>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            * Başlık, açıklama, en az bir görsel ve kargo profili gereklidir
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}