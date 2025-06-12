"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Loader2, Plus, X, Image as ImageIcon, Upload, GripVertical, RefreshCw, FileText, Tag as TagIcon } from "lucide-react"
import { Product, CreateProductForm, TaxonomyNode, ShippingProfile, EtsyProcessingProfile } from "@/types/product"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useDrag, useDrop } from 'react-dnd';
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { predefinedVariations } from '@/lib/etsy-variation-presets';
import { useRouter } from "next/navigation"
import { ProductMediaSection } from './ProductMediaSection';

// Sabit kategori ID'leri
const WALL_DECOR_TAXONOMY_ID = 1027;
const DIGITAL_PRINTS_TAXONOMY_ID = 2078;

// Default materials - API'de sabit değerler gönderildiği için burada kullanılmayacak
const DEFAULT_MATERIALS = ["Cotton Canvas", "Wood Frame", "Hanger"];

// Kişiselleştirme sabitleri
const PERSONALIZATION_INSTRUCTIONS = 'Phone Number for Delivery';

// Add interface for API response
interface CreateListingResponse {
  success: boolean;
  listing_id?: number;
  listing?: {
    listing_id: number;
    [key: string]: any;
  };
  message: string;
}

interface ProductFormModalProps {
  isOpen: boolean
  onClose: () => void
  product?: Product
  shippingProfiles: ShippingProfile[]
  loadingShippingProfiles: boolean
}

// Sabit item type tanımla
const ItemTypes = {
  IMAGE: 'image'
};

// Sürüklenebilir resim bileşeni
const DraggableImage = ({ 
  image, 
  index, 
  moveImage,
  onRemove 
}: { 
  image: { file: File; preview: string; uploading: boolean; error?: string; }; 
  index: number; 
  moveImage: (dragIndex: number, hoverIndex: number) => void;
  onRemove: (index: number) => void; 
}) => {
  const ref = useRef<HTMLDivElement>(null);
  
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.IMAGE,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  
  const [, drop] = useDrop({
    accept: ItemTypes.IMAGE,
    hover: (item: { index: number }, monitor) => {
      if (!ref.current) {
        return;
      }
      
      const dragIndex = item.index;
      const hoverIndex = index;
      
      // Kendi üzerine düşürmeyi önle
      if (dragIndex === hoverIndex) {
        return;
      }
      
      // Sürüklenen elemanın ekrandaki dikdörtgenini hesapla
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      
      // Dikdörtgenin ortasını bul
      const hoverMiddleX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      
      // Fare konumunu al
      const clientOffset = monitor.getClientOffset();
      
      if (!clientOffset) {
        return;
      }
      
      // Fare konumunun hover elemanına göre pozisyonunu hesapla
      const hoverClientX = clientOffset.x - hoverBoundingRect.left;
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;
      
      // Sadece fare ortanın solunda iken ve sola hareket ediyorsa
      // veya fare ortanın sağında iken ve sağa hareket ediyorsa taşı
      const isDraggingLeft = dragIndex > hoverIndex && hoverClientX > hoverMiddleX;
      const isDraggingRight = dragIndex < hoverIndex && hoverClientX < hoverMiddleX;
      const isDraggingUp = dragIndex > hoverIndex && hoverClientY > hoverMiddleY;
      const isDraggingDown = dragIndex < hoverIndex && hoverClientY < hoverMiddleY;
      
      // Sadece mouse'un hareket ettiği yöne doğru işlem yap
      if (isDraggingLeft || isDraggingRight || isDraggingUp || isDraggingDown) {
        // Resmin yerini değiştir
        moveImage(dragIndex, hoverIndex);
        
        // item'ın index'ini güncelle
        item.index = hoverIndex;
      }
    },
  });
  
  // drag ve drop ref'lerini birleştir
  drag(drop(ref));
  
  // Prepare the image source - use proxy for Etsy static URLs
  const imageSource = image.preview.includes('etsystatic.com') 
    ? `/api/etsy/image-proxy?url=${encodeURIComponent(image.preview)}`
    : image.preview;
  
  return (
    <div
      ref={ref}
      className={`relative group rounded-lg overflow-hidden border cursor-grab active:cursor-grabbing ${
        index === 0 ? "ring-2 ring-primary border-primary" : "border-gray-200"
      }`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <img
        src={imageSource}
        alt={`Ürün resmi ${index + 1}`}
        className="w-full aspect-square object-cover"
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute top-2 right-2 p-1 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
      >
        <X className="w-4 h-4 text-gray-700" />
      </button>
      {index === 0 && (
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-primary text-white text-xs rounded">
          Ana Görsel
        </div>
      )}
      {image.uploading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
      )}
      {image.error && (
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-red-500 text-white text-xs rounded">
          Hata
        </div>
      )}
    </div>
  );
};

// MediaFile interface'ini güncelliyorum
export interface MediaFile {
  file: File;
  preview: string;
  uploading: boolean;
  error?: string;
}

export function ProductFormModal({
  isOpen,
  onClose,
  product,
  shippingProfiles,
  loadingShippingProfiles,
}: ProductFormModalProps) {
  const { toast } = useToast()
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false)
  const [title, setTitle] = useState(product?.title || "")
  const [description, setDescription] = useState(product?.description || "")
  const [price, setPrice] = useState(product?.price?.amount || 0)
  const [quantity, setQuantity] = useState(4)
  const [shippingProfileId, setShippingProfileId] = useState(
    product?.shipping_profile_id?.toString() || ""
  )

  // Additional fields to match Etsy
  const [tags, setTags] = useState(product?.tags || [])
  const [newTag, setNewTag] = useState("")
  const [isPersonalizable, setIsPersonalizable] = useState(true)
  const [personalizationRequired, setPersonalizationRequired] = useState(false)
  const [personalizationInstructions, setPersonalizationInstructions] = useState(
    'Phone Number for Delivery'
  )
  const [primaryColor, setPrimaryColor] = useState(product?.primary_color || "")
  const [secondaryColor, setSecondaryColor] = useState(product?.secondary_color || "")
  const [width, setWidth] = useState(product?.width || 0)
  const [widthUnit, setWidthUnit] = useState(product?.width_unit || "cm")
  const [height, setHeight] = useState(product?.height || 0)
  const [heightUnit, setHeightUnit] = useState(product?.height_unit || "cm")
  const [taxonomyId, setTaxonomyId] = useState(product?.taxonomy_id || WALL_DECOR_TAXONOMY_ID);
  
  const [hasVariations, setHasVariations] = useState<boolean>(true);
  const [variations, setVariations] = useState(product?.variations || predefinedVariations)
  const [shopSections, setShopSections] = useState<{ shop_section_id: number; title: string }[]>([]);
  const [selectedShopSection, setSelectedShopSection] = useState<string>('');
  
  // Ürün görselleri için state
  const [productImages, setProductImages] = useState<MediaFile[]>([])
  const [videoFile, setVideoFile] = useState<MediaFile | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const router = useRouter()

  // --- BAŞLIK OTO-ÜRETİMİ STATE ---
  const [autoTitleLoading, setAutoTitleLoading] = useState(false);
  const [autoTitleUsed, setAutoTitleUsed] = useState(false);

  // Açıklama üretimi için state
  const [autoDescriptionLoading, setAutoDescriptionLoading] = useState(false);

  // Etiket üretimi için state
  const [autoTagsLoading, setAutoTagsLoading] = useState(false);

  // Dükkan bölümlerini API'den çekmek için useEffect
  useEffect(() => {
    if (isOpen) {
      async function loadShopSections() {
        try {
          const response = await fetch('/api/etsy/shop-sections');
          const data = await response.json();
          if (response.ok && data.sections) {
            setShopSections(data.sections);
            // Eğer ürün düzenleniyorsa onun bölümünü, değilse ilk bölümü seç
            const initialSectionId = product?.shop_section_id?.toString() || data.sections[0]?.shop_section_id.toString() || '';
            setSelectedShopSection(initialSectionId);
          }
        } catch (error) { 
          console.error("Dükkan bölümleri yüklenemedi:", error);
          toast({
            variant: "destructive",
            title: "Hata",
            description: "Dükkan bölümleri yüklenirken bir hata oluştu."
          });
        }
      }
      loadShopSections();
    }
  }, [isOpen, product]);

  // Modified reset form useEffect
  useEffect(() => {
    if (isOpen) {
      setTitle(product?.title || "");
      setDescription(product?.description || "");
      setPrice(product?.price?.amount || 0);
      setQuantity(4);
      setShippingProfileId(product?.shipping_profile_id?.toString() || "");
      setTags(product?.tags || []);
      setNewTag("");
      setIsPersonalizable(true);
      setPersonalizationRequired(false);
      setPersonalizationInstructions(PERSONALIZATION_INSTRUCTIONS);
      setPrimaryColor(product?.primary_color || "");
      setSecondaryColor(product?.secondary_color || "");
      setWidth(product?.width || 0);
      setWidthUnit(product?.width_unit || "cm");
      setHeight(product?.height || 0);
      setHeightUnit(product?.height_unit || "cm");
      setTaxonomyId(product?.taxonomy_id || WALL_DECOR_TAXONOMY_ID);
      setProductImages([]);
      setVideoFile(null);

      setHasVariations(product?.variations ? product.variations.length > 0 : true);
      
      // Varyasyonları resetle - her zaman aktif olarak başlat
      const initialVariations = product?.variations && product.variations.length > 0 
        ? product.variations 
        : predefinedVariations;
      setVariations(initialVariations);

      if (product?.images?.length) {
        setProductImages(product.images.map(img => ({
          file: new File([], img.url || ''),
          preview: img.url || '',
          uploading: false
        })));
      }
    }

    // Cleanup previews on unmount
    return () => {
      productImages.forEach(img => {
        if (img.preview) {
          URL.revokeObjectURL(img.preview);
        }
      });
    };
  }, [isOpen, product]);

  // Kargo profili varsayılanı: Yeni ürün eklerken ilk profili otomatik seç
  useEffect(() => {
    if (isOpen && !product && shippingProfiles.length > 0) {
      setShippingProfileId(shippingProfiles[0].shipping_profile_id.toString());
    }
  }, [isOpen, product, shippingProfiles]);

  // Modal her açıldığında başlık ve autoTitleUsed state'lerini sıfırla
  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setAutoTitleUsed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // hasUnsavedChanges fonksiyonunu güncelle
  const hasUnsavedChanges = () => {
    return (
      title !== "" ||
      description !== "" ||
      price !== 0 ||
      quantity !== 4 ||
      shippingProfileId !== "" ||
      tags.length > 0 ||
      productImages.length > 0
    );
  };

  // Modal kapatılırken değişiklik varsa onay sor
  const handleCloseModal = () => {
    if (hasUnsavedChanges()) {
      setShowUnsavedChangesDialog(true);
    } else {
      onClose();
    }
  };

  // Tag ekleme
  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag("");
    }
  }

  // Tag silme
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  }

  // Material işlemleri kaldırıldı - API'de sabit değerler kullanılıyor

  // Resim yükleme işleyicileri
  const handleImageDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    const videoFiles = files.filter(f => f.type.startsWith('video/'));
    if (productImages.length + imageFiles.length > 10) {
      toast({ title: "Maksimum Resim Limiti", description: "En fazla 10 resim yükleyebilirsiniz.", variant: "destructive" });
    } else {
      const newImages = imageFiles.map(file => ({ file, preview: URL.createObjectURL(file), uploading: false }));
      setProductImages(prev => [...prev, ...newImages]);
    }
    if (videoFiles.length > 0) {
      if (videoFile) URL.revokeObjectURL(videoFile.preview);
      setVideoFile({ file: videoFiles[0], preview: URL.createObjectURL(videoFiles[0]), uploading: false });
    }
  }, [productImages.length, videoFile, toast]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    const videoFiles = files.filter(f => f.type.startsWith('video/'));
    if (productImages.length + imageFiles.length > 10) {
      toast({ title: "Maksimum Resim Limiti", description: "En fazla 10 resim yükleyebilirsiniz.", variant: "destructive" });
    } else {
      const newImages = imageFiles.map(file => ({ file, preview: URL.createObjectURL(file), uploading: false }));
      setProductImages(prev => [...prev, ...newImages]);
    }
    if (videoFiles.length > 0) {
      if (videoFile) URL.revokeObjectURL(videoFile.preview);
      setVideoFile({ file: videoFiles[0], preview: URL.createObjectURL(videoFiles[0]), uploading: false });
    }
    e.target.value = '';
  }, [productImages.length, videoFile, toast]);

  const handleRemoveImage = useCallback((index: number) => {
    setProductImages(prev => {
      const newImages = [...prev];
      if (newImages[index].preview) {
        URL.revokeObjectURL(newImages[index].preview);
      }
      newImages.splice(index, 1);
      return newImages;
    });
  }, []);

  // Resim sırasını değiştir
  const moveImage = useCallback((dragIndex: number, hoverIndex: number) => {
    setProductImages((prevImages) => {
      const newImages = [...prevImages];
      const draggedImage = newImages[dragIndex];
      newImages.splice(dragIndex, 1);
      newImages.splice(hoverIndex, 0, draggedImage);
      return newImages;
    });
  }, []);

  const handleVariationChange = (index: number, field: 'price' | 'is_active', value: string | number | boolean) => {
    const newVariations = [...variations];
    const variationToUpdate = { ...newVariations[index] };
  
    if (field === 'price') {
      variationToUpdate.price = Number(value);
    } else if (field === 'is_active') {
      variationToUpdate.is_active = !!value;
    }
  
    newVariations[index] = variationToUpdate;
    setVariations(newVariations);
  };

  // --- GÖRSEL YÜKLENDİKTEN VE MODAL AÇILDIKTAN SONRA BAŞLIK OLUŞTURMA ---
  useEffect(() => {
    // Modal açıkken ve başlık boşsa ve görsel varsa tetikle
    if (isOpen && productImages.length > 0 && !title && !autoTitleUsed) {
      const generateTitle = async () => {
        setAutoTitleLoading(true);
        try {
          const formData = new FormData();
          formData.append("image", productImages[0].file);
          const res = await fetch("/api/ai/generate-etsy-title", {
            method: "POST",
            body: formData,
          });
          const text = await res.text();
          // Markdown code block içinden başlığı ayıkla
          const match = text.match(/```markdown\n([\s\S]*?)\n```/);
          const generatedTitle = match ? match[1].trim() : text.trim();
          if (generatedTitle && !title) {
            setTitle(generatedTitle);
            setAutoTitleUsed(true);
          }
        } catch (e) {
          toast({ variant: "destructive", title: "Başlık üretilemedi", description: "Görselden başlık oluşturulamadı." });
        } finally {
          setAutoTitleLoading(false);
        }
      };
      generateTitle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productImages, isOpen]);

  // Modal her açıldığında, başlık boşsa ve görsel varsa autoTitleUsed'u sıfırla ki analiz tekrar tetiklensin
  useEffect(() => {
    if (isOpen && productImages.length > 0 && !title) {
      setAutoTitleUsed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Başlık değiştiğinde açıklama otomatik üret
  useEffect(() => {
    if (title) {
      setAutoDescriptionLoading(true);
      const generateDescription = async () => {
        const prompt = `TASK: Generate a complete, compelling, and SEO-friendly Etsy product description based on the provided product title.\n\nCRITICAL INSTRUCTIONS:\n1.  **MIMIC THE BENCHMARK:** Your entire output MUST perfectly replicate the structure, sectioning, tone, and emoji usage of the \`BENCHMARK DESCRIPTION\` provided below. This benchmark is your template for STYLE and FORMAT.\n2.  **DYNAMIC ADAPTATION:** The most crucial part is to adapt the opening hook and introductory paragraph to reflect the specific mood, subject, and style of the \`PRODUCT TITLE\`. Infuse keywords from the title into this creative section.\n3.  **MAINTAIN ALL SECTIONS:** Ensure every section from the benchmark (\`Why You'll Love It:\`, \`✅\` bullet points, \`📦 Shipped with Care\`, etc.) is present in your final output.\n\n---\n\n### BENCHMARK DESCRIPTION (THIS IS THE STYLE YOU MUST FOLLOW)\n\n🌟 Transform Your Walls with Timeless Canvas Art! 🖼️✨\n\nBring a fresh touch of elegance to your interior with this premium-quality canvas wall print. Whether it's your living room, bedroom, or workspace — this piece adds warmth, depth, and artistic charm to any setting.\n\nWhy You'll Love It:\n\n✅ Top-Tier Quality – Printed on durable canvas with rich, high-resolution colors designed to stay vibrant for years.\n✅ Ready to Hang – Comes pre-installed with hardware, so you can hang it right out of the box.\n✅ Seamless Fit – Perfectly complements modern, bohemian, minimalist, and cozy classic interiors.\n✅ Clean, Gallery Look – Neatly stretched with a flawless edge wrap for a professional, finished look.\n✅ Customizable Options – Need a specific color or size? We're happy to tailor it to your needs!\n\n📦 Shipped with Care – Professionally packed and shipped quickly via trusted carriers like DHL, UPS, or FedEx.\n\n💬 **Looking for a custom order? Please send us a message via Etsy, and let's design something unique just for you!**\n\n🎁 Ideal as a thoughtful gift or an eye-catching feature in your home — order now and bring beauty to your walls!\n\n---\n\n### INPUT DATA\n\n**PRODUCT TITLE:** ${title}\n\n---\n\n### OUTPUT\n\nGenerate the full description based on the instructions.`;
        try {
          const res = await fetch("/api/ai/generate-etsy-title", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt }),
          });
          const text = await res.text();
          setDescription(text.trim());
        } catch (e) {
          toast({ variant: "destructive", title: "Açıklama üretilemedi", description: "Başlığa göre açıklama oluşturulamadı." });
        } finally {
          setAutoDescriptionLoading(false);
        }
      };
      generateDescription();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  // Başlık değiştiğinde otomatik etiket üret
  useEffect(() => {
    if (title) {
      setAutoTagsLoading(true);
      const generateTags = async () => {
        const prompt = `TASK: Generate a hyper-optimized list of 13 Etsy tags for a physical canvas wall art print, based on the provided product title.\n\nYOUR EXPERT ROLE:\nYou are an elite Etsy SEO and keyword research specialist. Your mission is to analyze the given product title and generate a list of high-value, high-traffic tags that potential buyers are actively searching for on both Etsy and Google. Your thinking process must be multi-faceted.\n\nYOUR STRATEGY (How you will think):\n1.  **Core & Long-Tail:** Extract the primary subject and style. Combine them into specific, long-tail keywords (e.g., \"minimalist line art,\" \"black lion canvas\").\n2.  **Broader Categories:** Identify the wider art categories this fits into (e.g., \"abstract wall art,\" \"modern home decor\").\n3.  **Aesthetic & Vibe:** Capture the mood and aesthetic (e.g., \"moody office decor,\" \"regal wall art,\" \"dark academia art\").\n4.  **Placement & Room:** Suggest where it could be hung (e.g., \"living room art,\" \"office wall decor,\" \"above bed art\").\n5.  **Audience & Gifting:** Think about who would buy this and for what occasion (e.g., \"gift for him,\" \"new home gift,\" \"boss gift\").\n\nCRITICAL RULES (NON-NEGOTIABLE):\n1.  **Exactly 13 tags.** No more, no less.\n2.  **Max 20 characters per tag,** including spaces. (e.g., 'large wall art' is 15 chars).\n3.  **Format:** All lowercase, English.\n4.  **Relevance:** All tags must be directly relevant to the title and suitable for a physical canvas print. DO NOT use words like \"digital\" or \"download\".\n\n---\n\n### INPUT DATA\n\n**PRODUCT TITLE:** ${title}\n\n---\n\n### OUTPUT FORMAT\nProvide ONLY the 13 comma-separated tags in a single line. Do not number them or use any other formatting.`;
        try {
          const res = await fetch("/api/ai/generate-etsy-title", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt }),
          });
          const text = await res.text();
          // Tagleri satır sonu, fazla boşluk ve virgül ile ayırıp 13'e tamamla
          let tags = text.replace(/\n/g, "").split(",").map(t => t.trim()).filter(Boolean);
          if (tags.length > 13) tags = tags.slice(0, 13);
          setTags(tags);
        } catch (e) {
          toast({ variant: "destructive", title: "Etiket üretilemedi", description: "Başlığa göre etiket oluşturulamadı." });
        } finally {
          setAutoTagsLoading(false);
        }
      };
      generateTags();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  // Form verilerini handle eden fonksiyon
  const handleSubmit = async (state: "draft" | "active") => {
    // 1. Fiyat Validasyonu
    let isPriceValid = false;
    if (hasVariations) {
        isPriceValid = variations.some(v => v.is_active && v.price >= 0.20);
    } else {
        isPriceValid = price >= 0.20;
    }

    if (!isPriceValid) {
        toast({
            variant: "destructive",
            title: "Geçersiz Fiyat",
            description: "Lütfen en az bir ürün veya varyasyon için 0.20 USD'den yüksek bir fiyat girin.",
        });
        return;
    }

    // 2. Diğer Validasyonlar
    if (!title || !shippingProfileId || productImages.length === 0) {
        toast({ variant: "destructive", description: "Başlık, Kargo Profili ve en az bir Resim zorunludur." });
        return;
    }

    setSubmitting(true);

    try {
        const formData = new FormData();

        const listingData = {
            // Formdan gelen dinamik değerler
            title,
            description,
            price,
            shipping_profile_id: Number(shippingProfileId),
            tags,
            has_variations: hasVariations,
            variations: hasVariations ? variations.filter((v: any) => v.is_active) : [],
            state: state,
            shop_section_id: Number(selectedShopSection) || undefined,
            
            // --- Kişiselleştirme Ayarları (Sabit ve EKSİKSİZ) ---
            is_personalizable: true,
            personalization_is_required: false,
            personalization_instructions: PERSONALIZATION_INSTRUCTIONS,
            personalization_char_count_max: 256, // <-- Etsy için kritik alan

            // --- Etsy'nin İstediği Diğer Zorunlu Alanlar ---
            quantity: 999,
            taxonomy_id: taxonomyId,
            who_made: "i_did",
            when_made: "made_to_order",
            is_supply: false,
        };
        
        formData.append('listingData', JSON.stringify(listingData));
        productImages.forEach(image => formData.append('imageFiles', image.file));
        if (videoFile) formData.append('videoFile', videoFile.file);

        const response = await fetch('/api/etsy/listings/create', {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Sunucu tarafında bilinmeyen bir hata oluştu.');
        }

        toast({ title: "Başarılı!", description: result.message });
        onClose();
        router.refresh();

    } catch (error) {
        toast({ variant: "destructive", title: 'İşlem Başarısız', description: (error as Error).message });
    } finally {
        setSubmitting(false);
    }
  };

  // Resim bölümü
  const ImageSection = () => (
    <div className="space-y-4">
      {/* BAŞLIK VE RESİM/VIDEO SAYACI */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Medya</h3>
        <div className="text-sm text-gray-500">
          {productImages.length}/10 resim, {videoFile ? 1 : 0}/1 video
        </div>
      </div>

      {/* VİDEO ÖNİZLEME KARTI */}
      {videoFile && (
        <div className="mt-4 space-y-2">
          <h4 className="text-md font-medium text-gray-700">Video</h4>
          <div className="relative group rounded-lg overflow-hidden border p-2 bg-slate-50">
            <video
              src={videoFile.preview}
              controls={!videoFile.uploading}
              className="w-full rounded-md max-h-64 aspect-video object-cover"
            />
            {videoFile.uploading && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="mt-2 text-sm">Video Etsy'e yükleniyor...</p>
              </div>
            )}
            {videoFile.error && (
              <div className="absolute bottom-2 left-2 right-2 px-2 py-1 bg-red-500 text-white text-xs rounded text-center">
                {videoFile.error}
              </div>
            )}
            {!videoFile.uploading && (
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(videoFile.preview);
                  setVideoFile(null);
                }}
                className="absolute top-2 right-2 z-10 p-1 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
              >
                <X className="w-4 h-4 text-gray-700" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* SÜRÜKLE-BIRAK ALANI VE RESİM LİSTESİ */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
          productImages.length === 0 && !videoFile ? "border-primary bg-primary/5" : "border-gray-200 hover:border-primary/50"
        }`}
        onDrop={handleImageDrop}
        onDragOver={e => e.preventDefault()}
        onDragEnter={e => {
          e.preventDefault();
        }}
        onDragLeave={e => {
          e.preventDefault();
        }}
      >
        {productImages.length === 0 && !videoFile ? (
          <div className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium mb-1">Medya dosyalarını buraya sürükleyin</p>
            <p className="text-sm text-gray-500 mb-4">veya</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                // Implement file input for image selection
              }}
            >
              Bilgisayardan Seçin
            </Button>
            <p className="text-xs text-gray-500 mt-4">
              PNG, JPG, GIF veya MP4/QuickTime video • Resim başına max. 20MB
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {productImages.map((image, index) => (
              <DraggableImage
                key={`${index}-${image.preview}`}
                image={image}
                index={index}
                moveImage={moveImage}
                onRemove={handleRemoveImage}
              />
            ))}
            {productImages.length < 10 && (
              <button
                type="button"
                onClick={() => {
                  // Implement file input for image selection
                }}
                className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <Upload className="w-6 h-6 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">Medya Ekle</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Modified varyasyonlar section in the UI
  const VariationsSection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Varyasyonlar</h3>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="hasVariations"
          checked={hasVariations}
          onCheckedChange={checked => setHasVariations(Boolean(checked))}
        />
        <label
          htmlFor="hasVariations"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Varyasyonlar var
        </label>
      </div>

      {hasVariations && (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Size</TableHead>
                <TableHead>Pattern</TableHead>
                <TableHead className="w-[120px]">Fiyat</TableHead>
                <TableHead className="w-[80px]">Görünür</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variations.map((variation, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{variation.size}</TableCell>
                  <TableCell>{variation.pattern}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={variation.price === 0 ? '' : variation.price}
                      placeholder="Fiyat"
                      onChange={(e) => handleVariationChange(index, 'price', e.target.value)}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={variation.is_active}
                      onCheckedChange={(checked) => handleVariationChange(index, 'is_active', checked)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            handleCloseModal();
          } else {
            setTitle("");
            setAutoTitleUsed(false);
          }
        }}
      >
        <DialogTrigger asChild>
          {/* DialogTrigger content */}
        </DialogTrigger>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {product ? `Ürünü Düzenle: ${product.title}` : "Yeni Ürün Ekle"}
            </DialogTitle>
            <DialogDescription>
              {product ? "Bu ürünün detaylarını düzenleyin." : "Yeni bir ürün ekleyin."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Resim Bölümü */}
            <ImageSection />

            <Separator />
            
            {/* Temel Bilgiler Bölümü */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Temel Bilgiler</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="title" className="block mb-1">
                    Başlık <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setAutoTitleUsed(false); // Kullanıcı elle değiştirirse tekrar otomatik doldurma yapmasın
                      }}
                      placeholder="Ürününüzün başlığını girin (SEO için anahtar kelimeler ekleyin)"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="border border-gray-300 hover:bg-gray-100 rounded-md"
                      title="Yeni Başlık İste"
                      disabled={autoTitleLoading || productImages.length === 0}
                      onClick={async () => {
                        if (productImages.length === 0) return;
                        setAutoTitleLoading(true);
                        try {
                          const formData = new FormData();
                          formData.append("image", productImages[0].file);
                          const res = await fetch("/api/ai/generate-etsy-title", {
                            method: "POST",
                            body: formData,
                          });
                          const text = await res.text();
                          const match = text.match(/```markdown\n([\s\S]*?)\n```/);
                          const generatedTitle = match ? match[1].trim() : text.trim();
                          if (generatedTitle) {
                            setTitle(generatedTitle);
                            setAutoTitleUsed(true);
                          }
                        } catch (e) {
                          toast({ variant: "destructive", title: "Başlık üretilemedi", description: "Görselden başlık oluşturulamadı." });
                        } finally {
                          setAutoTitleLoading(false);
                        }
                      }}
                    >
                      {autoTitleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    </Button>
                    <span className="text-xs text-gray-500 ml-1">Yeni Başlık İste</span>
                  </div>
                  {autoTitleLoading && (
                    <div className="text-xs text-blue-500 mt-1">Görselden başlık üretiliyor...</div>
                  )}
                </div>

                <div>
                  <Label htmlFor="price" className="block mb-1">
                    Fiyat <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-center">
                    <span className="mr-2">$</span>
                    <Input
                      id="price"
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(parseFloat(e.target.value))}
                      disabled={hasVariations}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="quantity" className="block mb-1">
                    Adet / Stok Miktarı <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={quantity}
                    disabled
                    className="w-full"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="description" className="block mb-1">
                    Açıklama <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="min-h-[100px]"
                      placeholder="Ürününüzün detaylı açıklamasını girin"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="border border-gray-300 hover:bg-gray-100 rounded-md"
                      title="Yeni Açıklama İste"
                      disabled={autoDescriptionLoading || !title}
                      onClick={async () => {
                        if (!title) return;
                        setAutoDescriptionLoading(true);
                        const prompt = `TASK: Generate a complete, compelling, and SEO-friendly Etsy product description based on the provided product title.\n\nCRITICAL INSTRUCTIONS:\n1.  **MIMIC THE BENCHMARK:** Your entire output MUST perfectly replicate the structure, sectioning, tone, and emoji usage of the \`BENCHMARK DESCRIPTION\` provided below. This benchmark is your template for STYLE and FORMAT.\n2.  **DYNAMIC ADAPTATION:** The most crucial part is to adapt the opening hook and introductory paragraph to reflect the specific mood, subject, and style of the \`PRODUCT TITLE\`. Infuse keywords from the title into this creative section.\n3.  **MAINTAIN ALL SECTIONS:** Ensure every section from the benchmark (\`Why You'll Love It:\`, \`✅\` bullet points, \`📦 Shipped with Care\`, etc.) is present in your final output.\n\n---\n\n### BENCHMARK DESCRIPTION (THIS IS THE STYLE YOU MUST FOLLOW)\n\n🌟 Transform Your Walls with Timeless Canvas Art! 🖼️✨\n\nBring a fresh touch of elegance to your interior with this premium-quality canvas wall print. Whether it's your living room, bedroom, or workspace — this piece adds warmth, depth, and artistic charm to any setting.\n\nWhy You'll Love It:\n\n✅ Top-Tier Quality – Printed on durable canvas with rich, high-resolution colors designed to stay vibrant for years.\n✅ Ready to Hang – Comes pre-installed with hardware, so you can hang it right out of the box.\n✅ Seamless Fit – Perfectly complements modern, bohemian, minimalist, and cozy classic interiors.\n✅ Clean, Gallery Look – Neatly stretched with a flawless edge wrap for a professional, finished look.\n✅ Customizable Options – Need a specific color or size? We're happy to tailor it to your needs!\n\n📦 Shipped with Care – Professionally packed and shipped quickly via trusted carriers like DHL, UPS, or FedEx.\n\n💬 **Looking for a custom order? Please send us a message via Etsy, and let's design something unique just for you!**\n\n🎁 Ideal as a thoughtful gift or an eye-catching feature in your home — order now and bring beauty to your walls!\n\n---\n\n### INPUT DATA\n\n**PRODUCT TITLE:** ${title}\n\n---\n\n### OUTPUT\n\nGenerate the full description based on the instructions.`;
                        try {
                          const res = await fetch("/api/ai/generate-etsy-title", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ prompt }),
                          });
                          const text = await res.text();
                          setDescription(text.trim());
                        } catch (e) {
                          toast({ variant: "destructive", title: "Açıklama üretilemedi", description: "Başlığa göre açıklama oluşturulamadı." });
                        } finally {
                          setAutoDescriptionLoading(false);
                        }
                      }}
                    >
                      {autoDescriptionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    </Button>
                    <span className="text-xs text-gray-500 ml-1">Yeni Açıklama İste</span>
                  </div>
                  {autoDescriptionLoading && (
                    <div className="text-xs text-blue-500 mt-1">Başlığa göre açıklama üretiliyor...</div>
                  )}
                </div>

                {/* Kategori seçimi */}
                <div className="col-span-2">
                  <Label htmlFor="category" className="block mb-1">Kategori *</Label>
                  <Select
                    value={taxonomyId ? taxonomyId.toString() : WALL_DECOR_TAXONOMY_ID.toString()}
                    onValueChange={(val) => setTaxonomyId(Number(val))}
                    required
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>{taxonomyId === DIGITAL_PRINTS_TAXONOMY_ID ? "Digital Prints" : "Wall Decor"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={WALL_DECOR_TAXONOMY_ID.toString()}>Wall Decor</SelectItem>
                      <SelectItem value={DIGITAL_PRINTS_TAXONOMY_ID.toString()}>Digital Prints</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Shop Section seçimi */}
                <div className="col-span-2">
                  <Label htmlFor="shopSection">Kanvas Kategorileri</Label>
                  <Select
                    value={selectedShopSection}
                    onValueChange={setSelectedShopSection}
                    disabled={shopSections.length === 0}
                  >
                    <SelectTrigger id="shopSection">
                      <SelectValue placeholder="Bir kategori seçin..." />
                    </SelectTrigger>
                    <SelectContent>
                      {shopSections.map(section => (
                        <SelectItem 
                          key={section.shop_section_id} 
                          value={section.shop_section_id.toString()}
                        >
                          {section.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Etiketler ve Malzemeler */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Etiketler & Malzemeler</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="block mb-2">
                    Etiketler <span className="text-gray-500 text-sm">(0-13)</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      className="mr-2"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="border border-gray-300 hover:bg-gray-100 rounded-md"
                      title="Yeni Etiket İste"
                      disabled={autoTagsLoading || !title}
                      onClick={async () => {
                        if (!title) return;
                        setAutoTagsLoading(true);
                        const prompt = `TASK: Generate a hyper-optimized list of 13 Etsy tags for a physical canvas wall art print, based on the provided product title.\n\nYOUR EXPERT ROLE:\nYou are an elite Etsy SEO and keyword research specialist. Your mission is to analyze the given product title and generate a list of high-value, high-traffic tags that potential buyers are actively searching for on both Etsy and Google. Your thinking process must be multi-faceted.\n\nYOUR STRATEGY (How you will think):\n1.  **Core & Long-Tail:** Extract the primary subject and style. Combine them into specific, long-tail keywords (e.g., \"minimalist line art,\" \"black lion canvas\").\n2.  **Broader Categories:** Identify the wider art categories this fits into (e.g., \"abstract wall art,\" \"modern home decor\").\n3.  **Aesthetic & Vibe:** Capture the mood and aesthetic (e.g., \"moody office decor,\" \"regal wall art,\" \"dark academia art\").\n4.  **Placement & Room:** Suggest where it could be hung (e.g., \"living room art,\" \"office wall decor,\" \"above bed art\").\n5.  **Audience & Gifting:** Think about who would buy this and for what occasion (e.g., \"gift for him,\" \"new home gift,\" \"boss gift\").\n\nCRITICAL RULES (NON-NEGOTIABLE):\n1.  **Exactly 13 tags.** No more, no less.\n2.  **Max 20 characters per tag,** including spaces. (e.g., 'large wall art' is 15 chars).\n3.  **Format:** All lowercase, English.\n4.  **Relevance:** All tags must be directly relevant to the title and suitable for a physical canvas print. DO NOT use words like \"digital\" or \"download\".\n\n---\n\n### INPUT DATA\n\n**PRODUCT TITLE:** ${title}\n\n---\n\n### OUTPUT FORMAT\nProvide ONLY the 13 comma-separated tags in a single line. Do not number them or use any other formatting.`;
                        try {
                          const res = await fetch("/api/ai/generate-etsy-title", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ prompt }),
                          });
                          const text = await res.text();
                          // Tagleri satır sonu, fazla boşluk ve virgül ile ayırıp 13'e tamamla
                          let tags = text.replace(/\n/g, "").split(",").map(t => t.trim()).filter(Boolean);
                          if (tags.length > 13) tags = tags.slice(0, 13);
                          setTags(tags);
                        } catch (e) {
                          toast({ variant: "destructive", title: "Etiket üretilemedi", description: "Başlığa göre etiket oluşturulamadı." });
                        } finally {
                          setAutoTagsLoading(false);
                        }
                      }}
                    >
                      {autoTagsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TagIcon className="w-4 h-4" />}
                    </Button>
                    <span className="text-xs text-gray-500 ml-1">Yeni Etiket İste</span>
                  </div>
                  {autoTagsLoading && (
                    <div className="text-xs text-blue-500 mt-1">Başlığa göre etiketler üretiliyor...</div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mt-2 min-h-[40px]">
                  {tags.map((tag, index) => (
                    <Badge key={index} className="px-3 py-1 flex items-center gap-1">
                      {tag}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => handleRemoveTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {tags.length}/13 etiket eklendi
                </p>
                {tags.length !== 13 && !autoTagsLoading && (
                  <div className="text-xs text-red-500 mt-1">Uyarı: Tam olarak 13 etiket üretilmelidir. Lütfen başlığı kontrol edin veya tekrar deneyin.</div>
                )}
              </div>
            </div>

            <Separator />

            {/* Malzemeler kısmı kaldırıldı - API'de sabit değerler kullanılıyor */}
            <div>
              <Label className="block mb-2">
                Malzemeler
              </Label>
              <div className="text-sm text-gray-600 bg-gray-100 p-2 rounded border border-gray-200">
                <p>Bu ürün için kullanılan malzemeler:</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {DEFAULT_MATERIALS.map((material, i) => (
                    <Badge key={i} variant="secondary" className="px-3 py-1">
                      {material}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            {/* Kargo ve İşlem Profilleri */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Kargo & İşlem Profilleri</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="shipping" className="block mb-1">
                    Kargo Profili <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={shippingProfileId}
                    onValueChange={setShippingProfileId}
                    disabled={loadingShippingProfiles || shippingProfiles.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        loadingShippingProfiles
                          ? "Kargo profilleri yükleniyor..."
                          : shippingProfiles.length === 0
                          ? "Kargo profili bulunamadı"
                          : "Kargo profili seçin"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {shippingProfiles.map((profile) => (
                        <SelectItem
                          key={profile.shipping_profile_id}
                          value={profile.shipping_profile_id.toString()}
                        >
                          {profile.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Fiziksel Özellikler */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Fiziksel Özellikler</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryColor" className="block mb-1">
                    Ana Renk
                  </Label>
                  <Input
                    id="primaryColor"
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="Örn: Mavi"
                  />
                </div>
                
                <div>
                  <Label htmlFor="secondaryColor" className="block mb-1">
                    İkincil Renk
                  </Label>
                  <Input
                    id="secondaryColor"
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    placeholder="Örn: Beyaz"
                  />
                </div>
                
                <div className="col-span-2">
                  <Label className="block mb-2">
                    Boyutlar
                  </Label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center flex-grow">
                      <Label htmlFor="width" className="mr-2 whitespace-nowrap">Genişlik:</Label>
                      <Input
                        id="width"
                        type="number"
                        value={width || ""}
                        onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                        className="mr-2"
                      />
                      <Select value={widthUnit} onValueChange={setWidthUnit}>
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="Birim" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cm">cm</SelectItem>
                          <SelectItem value="mm">mm</SelectItem>
                          <SelectItem value="m">m</SelectItem>
                          <SelectItem value="in">inç</SelectItem>
                          <SelectItem value="ft">ft</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <span className="mx-2">×</span>
                    <div className="flex items-center flex-grow">
                      <Label htmlFor="height" className="mr-2 whitespace-nowrap">Yükseklik:</Label>
                      <Input
                        id="height"
                        type="number"
                        value={height || ""}
                        onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                        className="mr-2"
                      />
                      <Select value={heightUnit} onValueChange={setHeightUnit}>
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="Birim" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cm">cm</SelectItem>
                          <SelectItem value="mm">mm</SelectItem>
                          <SelectItem value="m">m</SelectItem>
                          <SelectItem value="in">inç</SelectItem>
                          <SelectItem value="ft">ft</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator />
            
            {/* Varyasyonlar */}
            <VariationsSection />

            <Separator />

            {/* Kişiselleştirme Ayarları (Sabit ve Değiştirilemez) */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Kişiselleştirme</h3>
              <div className="p-4 border rounded-md bg-slate-50 space-y-4">
                {/* Kişiselleştirme Her Zaman Aktif ve Değiştirilemez */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isPersonalizable"
                    checked={true}
                    disabled={true}
                  />
                  <label
                    htmlFor="isPersonalizable"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Bu ürün kişiselleştirilebilir (Her zaman aktif)
                  </label>
                </div>
                {/* Kişiselleştirme Her Zaman İsteğe Bağlı ve Değiştirilemez */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="personalizationRequired"
                    checked={false}
                    disabled={true}
                  />
                  <label
                    htmlFor="personalizationRequired"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Kişiselleştirme zorunlu olsun (Her zaman isteğe bağlı)
                  </label>
                </div>
                {/* Talimat Metni Sabit ve Değiştirilemez */}
                <div>
                  <Label htmlFor="personalizationInstructions" className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Alıcı için talimatlar (Sabit Metin)
                  </Label>
                  <Textarea
                    id="personalizationInstructions"
                    value={PERSONALIZATION_INSTRUCTIONS}
                    readOnly={true}
                    className="mt-1 bg-gray-100 cursor-not-allowed"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between mt-6">
            <div>
              <Button variant="outline" onClick={handleCloseModal}>İptal</Button>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                onClick={() => handleSubmit("draft")} 
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Taslak Kaydediliyor...
                  </>
                ) : (
                  "Taslak Olarak Kaydet"
                )}
              </Button>
              <Button 
                onClick={() => handleSubmit("active")} 
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Yayınlanıyor...
                  </>
                ) : (
                  "Yayınla"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kaydedilmemiş değişiklikler</AlertDialogTitle>
            <AlertDialogDescription>
              Kaydedilmemiş değişiklikleriniz var. Devam ederseniz, bu değişiklikler kaybolacak.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowUnsavedChangesDialog(false)
              onClose()
            }}>
              Değişiklikleri Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}