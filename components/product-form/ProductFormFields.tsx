'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  X, 
  Plus, 
  RefreshCw, 
  Wand2,
  Loader2,
  Tag as TagIcon 
} from 'lucide-react';
import { predefinedVariations } from '@/lib/etsy-variation-presets';

interface ShopSection {
  shop_section_id: number;
  title: string;
}

interface ShippingProfile {
  shipping_profile_id: number;
  title: string;
}

interface Variation {
  size: string;
  pattern: string;
  price: number;
  is_active: boolean;
}

interface ProductFormFieldsProps {
  // Basic fields
  title: string;
  description: string;
  price: number;
  quantity: number;
  tags: string[];
  
  // Advanced fields
  isPersonalizable: boolean;
  personalizationRequired: boolean;
  personalizationInstructions: string;
  taxonomyId: number;
  
  // Variations
  hasVariations: boolean;
  variations: Variation[];
  
  // Shop data
  selectedShopSection: string;
  shippingProfileId: string;
  shopSections?: ShopSection[]; // Optional prop from parent
  
  // Loading states
  autoTitleLoading: boolean;
  autoDescriptionLoading: boolean;
  autoTagsLoading: boolean;
  loadingShopSections: boolean;
  loadingShippingProfiles: boolean;
  isSubmitting: boolean;
  isDigital?: boolean;
  digitalFiles?: File[];
  
  // Handlers
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onPriceChange: (price: number) => void;
  onQuantityChange: (quantity: number) => void;
  onTagsChange: (tags: string[]) => void;
  onPersonalizableChange: (personalizable: boolean) => void;
  onPersonalizationRequiredChange: (required: boolean) => void;
  onPersonalizationInstructionsChange: (instructions: string) => void;
  onTaxonomyIdChange: (taxonomyId: number) => void;
  onHasVariationsChange: (hasVariations: boolean) => void;
  onVariationsChange: (variations: Variation[]) => void;
  onShopSectionChange: (sectionId: string) => void;
  onShippingProfileChange: (profileId: string) => void;
  
  // Auto generation handlers
  onGenerateTitle?: () => void;
  onGenerateDescription?: () => void;
  onGenerateTags?: () => void;
  
  // Shop sections callback to sync with parent
  onShopSectionsLoaded?: (sections: ShopSection[]) => void;
}

export default function ProductFormFields({
  title,
  description,
  price,
  quantity,
  tags,
  isPersonalizable,
  personalizationRequired,
  personalizationInstructions,
  taxonomyId,
  hasVariations,
  variations,
  selectedShopSection,
  shippingProfileId,
  shopSections: shopSectionsFromProps,
  autoTitleLoading,
  autoDescriptionLoading,
  autoTagsLoading,
  loadingShopSections,
  loadingShippingProfiles,
  isSubmitting,
  isDigital = false,
  digitalFiles,
  onTitleChange,
  onDescriptionChange,
  onPriceChange,
  onQuantityChange,
  onTagsChange,
  onPersonalizableChange,
  onPersonalizationRequiredChange,
  onPersonalizationInstructionsChange,
  onTaxonomyIdChange,
  onHasVariationsChange,
  onVariationsChange,
  onShopSectionChange,
  onShippingProfileChange,
  onGenerateTitle,
  onGenerateDescription,
  onGenerateTags,
  onShopSectionsLoaded
}: ProductFormFieldsProps) {
  const [newTag, setNewTag] = useState('');
  const [shopSections, setShopSections] = useState<ShopSection[]>([]);
  const [shippingProfiles, setShippingProfiles] = useState<ShippingProfile[]>([]);

  // Use shop sections from props or load internally (for backwards compatibility)
  useEffect(() => {
    if (shopSectionsFromProps && shopSectionsFromProps.length > 0) {
      console.log('🏪 Shop sections props\'tan alındı:', shopSectionsFromProps.length, 'adet');
      setShopSections(shopSectionsFromProps);
      
      // Don't auto-select from props, let AI choose
      if (!selectedShopSection) {
        console.log('🏪 Props\'tan shop sections yüklendi, AI seçimi bekleniyor...');
        // Don't auto-select, let AI choose the category
      }
    } else {
      // Fallback to loading internally if no props provided
      const loadShopSections = async () => {
        try {
          console.log('🏪 Props boş, internal yükleme yapılıyor...');
          const response = await fetch('/api/etsy/shop-sections');
          if (response.ok) {
            const data = await response.json();
            const sections = data.sections || data;
            setShopSections(sections);
            
            // Auto-select first section if none selected - WAIT FOR AI SELECTION
            if (sections.length > 0 && !selectedShopSection) {
              console.log('🏪 Shop sections yüklendi, AI seçimi bekleniyor...:', sections.length, 'adet');
              // Don't auto-select, let AI choose the category
            }
            
            // Notify parent component about loaded sections
            if (onShopSectionsLoaded && sections.length > 0) {
              console.log('🔄 Parent component\'ı shop sections ile güncelleniyor:', sections.length, 'adet');
              onShopSectionsLoaded(sections);
            }
          }
        } catch (error) {
          console.error('Shop sections yüklenemedi:', error);
        }
      };
      
      loadShopSections();
    }
  }, [shopSectionsFromProps, selectedShopSection, onShopSectionChange]);

  // Load shipping profiles
  useEffect(() => {
    const loadShippingProfiles = async () => {
      try {
        console.log('🚚 Shipping profiles yükleniyor, current shippingProfileId:', shippingProfileId);
        const response = await fetch('/api/etsy/shipping-profiles');
        if (response.ok) {
          const profiles = await response.json();
          console.log('📦 Shipping profiles yüklendi:', profiles);
          setShippingProfiles(profiles);
          
          // Auto-select first profile if none selected - AGGRESSIVE FORCE SELECTION
          if (profiles.length > 0) {
            console.log('🚚 Otomatik kargo profili seçiliyor (zorla):', profiles[0]);
            onShippingProfileChange(profiles[0].shipping_profile_id.toString());
            
            // Force update after a delay to ensure state is set
            setTimeout(() => {
              onShippingProfileChange(profiles[0].shipping_profile_id.toString());
            }, 100);
          }
        }
      } catch (error) {
        console.error('Shipping profiles yüklenemedi:', error);
      }
    };
    
    loadShippingProfiles();
  }, []); // Dependency array'ı boşalt

  const handleAddTag = useCallback(() => {
    if (newTag.trim() && !tags.includes(newTag.trim()) && tags.length < 13) {
      onTagsChange([...tags, newTag.trim()]);
      setNewTag('');
    }
  }, [newTag, tags, onTagsChange]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  }, [tags, onTagsChange]);

  const handleVariationToggle = useCallback((index: number) => {
    const newVariations = [...variations];
    newVariations[index] = {
      ...newVariations[index],
      is_active: !newVariations[index].is_active
    };
    onVariationsChange(newVariations);
  }, [variations, onVariationsChange]);

  const handleVariationPriceChange = useCallback((index: number, newPrice: number) => {
    const newVariations = [...variations];
    newVariations[index] = {
      ...newVariations[index],
      price: newPrice
    };
    onVariationsChange(newVariations);
  }, [variations, onVariationsChange]);

  return (
    <div className="space-y-6">
      {/* Title Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="title" className="text-sm font-medium">
            Ürün Başlığı *
          </Label>
          {onGenerateTitle && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onGenerateTitle}
              disabled={autoTitleLoading || isSubmitting}
              className="h-7 px-2"
            >
              {autoTitleLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Wand2 className="w-3 h-3" />
              )}
            </Button>
          )}
        </div>
        <Input
          id="title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Ürün başlığını girin..."
          className="text-sm"
          disabled={isSubmitting || autoTitleLoading}
        />
        <div className="text-xs text-gray-500">{title.length}/140 karakter</div>
      </div>

      {/* Description Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="description" className="text-sm font-medium">
            Açıklama
          </Label>
          {onGenerateDescription && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onGenerateDescription}
              disabled={autoDescriptionLoading || isSubmitting}
              className="h-7 px-2"
            >
              {autoDescriptionLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
            </Button>
          )}
        </div>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={8}
          placeholder="Ürün açıklamasını girin..."
          className="text-sm resize-none"
          disabled={isSubmitting}
        />
        <div className="text-xs text-gray-500">{description.length} karakter</div>
      </div>

      {/* Price and Quantity */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price" className="text-sm font-medium">
            Fiyat (USD) *
          </Label>
          <Input
            id="price"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => onPriceChange(parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            className="text-sm"
            disabled={isSubmitting}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="quantity" className="text-sm font-medium">
            Stok Miktarı *
          </Label>
          <Input
            id="quantity"
            type="number"
            min="0"
            value={quantity}
            onChange={(e) => onQuantityChange(parseInt(e.target.value) || 0)}
            placeholder="999"
            className="text-sm"
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Tags Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Etiketler ({tags.length}/13)</Label>
          {onGenerateTags && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onGenerateTags}
              disabled={autoTagsLoading || isSubmitting || !title}
              className="h-7 px-2"
            >
              {autoTagsLoading ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <RefreshCw className="w-3 h-3 mr-1" />
              )}
              {autoTagsLoading ? 'Üretiyor...' : 'Yeni Etiket'}
            </Button>
          )}
        </div>
        
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Yeni etiket..."
            className="text-sm"
            disabled={isSubmitting || tags.length >= 13}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddTag}
            disabled={!newTag.trim() || tags.length >= 13 || isSubmitting}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-1">
          {tags.map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 hover:text-red-500"
                disabled={isSubmitting}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Shop Section - Hidden for Digital Products */}
      {!isDigital && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Kanvas Kategorisi
            {selectedShopSection && (
              <span className="text-green-600 text-xs font-normal ml-2">
                (AI seçti: {shopSections?.find(s => s.shop_section_id.toString() === selectedShopSection.toString())?.title || 'Loading...'})
              </span>
            )}
          </Label>
          <Select
            key={`shop-section-${selectedShopSection}-${shopSections?.length || 0}-${Date.now()}`}
            value={selectedShopSection ? selectedShopSection.toString() : ''}
            onValueChange={onShopSectionChange}
            disabled={isSubmitting || loadingShopSections}
          >
            <SelectTrigger className={selectedShopSection ? 'border-green-500 bg-green-50' : ''}>
              <SelectValue placeholder="Kategori seçin...">
                {selectedShopSection && shopSections?.find(s => s.shop_section_id.toString() === selectedShopSection.toString())?.title || 'Kategori seçin...'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {shopSections && shopSections.length > 0 ? shopSections.map((section) => (
                <SelectItem
                  key={section.shop_section_id}
                  value={section.shop_section_id.toString()}
                  className={selectedShopSection === section.shop_section_id.toString() ? 'bg-green-50 font-medium' : ''}
                >
                  {section.title}
                  {selectedShopSection === section.shop_section_id.toString() && (
                    <span className="ml-2 text-green-600">✓</span>
                  )}
                </SelectItem>
              )) : (
                <SelectItem value="loading" disabled>Kategoriler yükleniyor...</SelectItem>
              )}
            </SelectContent>
          </Select>
          <div className="text-xs text-gray-500">
            {shopSections ? shopSections.length : 0} kategori mevcut
            {selectedShopSection && shopSections?.find(s => s.shop_section_id.toString() === selectedShopSection.toString()) && (
              <span className="text-green-600 font-medium ml-2">
                ✓ {shopSections.find(s => s.shop_section_id.toString() === selectedShopSection.toString())?.title} seçildi
              </span>
            )}
          </div>
        </div>
      )}

      {/* Digital Products Info */}
      {isDigital && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-blue-600">
              📁 Digital Ürün Kategorisi
            </Label>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm font-medium text-blue-800">Digital Prints (2078)</div>
              <div className="text-xs text-blue-600 mt-1">Digital ürünler otomatik olarak bu kategoriye atanır</div>
            </div>
          </div>

          {/* Digital Files Display */}
          {digitalFiles && digitalFiles.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-green-600">
                📥 İndirilebilir Dosyalar ({digitalFiles.length}/5)
              </Label>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="space-y-2">
                  {digitalFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                          <span className="text-xs font-medium text-green-600">
                            {file.name.split('.').pop()?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-800">{file.name}</div>
                          <div className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        Dijital Dosya
                      </Badge>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-green-600 mt-2">
                  Bu dosyalar müşteri satın aldıktan sonra indirebilecek
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Shipping Profile */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Kargo Profili</Label>
        <Select 
          value={shippingProfileId} 
          onValueChange={onShippingProfileChange}
          disabled={isSubmitting || loadingShippingProfiles}
        >
          <SelectTrigger>
            <SelectValue placeholder="Kargo profili seçin..." />
          </SelectTrigger>
          <SelectContent>
            {shippingProfiles && shippingProfiles.length > 0 ? shippingProfiles.map((profile) => (
              <SelectItem key={profile.shipping_profile_id} value={profile.shipping_profile_id.toString()}>
                {profile.title}
              </SelectItem>
            )) : (
              <SelectItem value="loading" disabled>Kargo profilleri yükleniyor...</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Personalization - Hidden for Digital Products */}
      {!isDigital && (
        <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
          <div className="flex items-center space-x-2">
            <Switch
              id="personalizable"
              checked={isPersonalizable}
              onCheckedChange={onPersonalizableChange}
              disabled={isSubmitting}
            />
            <Label htmlFor="personalizable" className="text-sm font-medium">
              Kişiselleştirilebilir
            </Label>
          </div>
          
          {isPersonalizable && (
            <>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="personalization-required"
                  checked={personalizationRequired}
                  onCheckedChange={onPersonalizationRequiredChange}
                  disabled={isSubmitting}
                />
                <Label htmlFor="personalization-required" className="text-sm">
                  Kişiselleştirme zorunlu
                </Label>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Kişiselleştirme Talimatları</Label>
                <Textarea
                  value={personalizationInstructions}
                  onChange={(e) => onPersonalizationInstructionsChange(e.target.value)}
                  placeholder="Kişiselleştirme talimatlarını girin..."
                  className="text-sm"
                  rows={2}
                  disabled={isSubmitting}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Variations - Hidden for Digital Products */}
      {!isDigital && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="has-variations"
              checked={hasVariations}
              onCheckedChange={onHasVariationsChange}
              disabled={isSubmitting}
            />
            <Label htmlFor="has-variations" className="text-sm font-medium">
              Varyasyonlar var
            </Label>
          </div>
        
        {hasVariations && (
          <div className="border rounded-lg p-4">
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Ürün Varyasyonları</h3>
              <p className="text-xs text-gray-500">
                Boyut ve çerçeve seçeneklerini yönetin. Aktif olanlar Etsy'de görünecek.
              </p>
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Aktif</TableHead>
                    <TableHead>Boyut</TableHead>
                    <TableHead>Çerçeve</TableHead>
                    <TableHead className="w-24">Fiyat ($)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variations.map((variation, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Checkbox
                          checked={variation.is_active}
                          onCheckedChange={() => handleVariationToggle(index)}
                          disabled={isSubmitting}
                        />
                      </TableCell>
                      <TableCell className="text-sm">{variation.size}</TableCell>
                      <TableCell className="text-sm">{variation.pattern}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={variation.price}
                          onChange={(e) => handleVariationPriceChange(index, parseFloat(e.target.value) || 0)}
                          className="w-20 text-xs"
                          disabled={isSubmitting}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-3 text-xs text-gray-500">
              {variations.filter(v => v.is_active).length} aktif varyasyon
            </div>
          </div>
        )}
        </div>
      )}

      {/* Digital Product Info */}
      {isDigital && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-blue-600">
            💰 Digital Ürün Fiyatı
          </Label>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm font-medium text-blue-800">$9.00 Sabit Fiyat</div>
            <div className="text-xs text-blue-600 mt-1">Digital ürünler için varyasyon bulunmaz</div>
          </div>
        </div>
      )}
    </div>
  );
}