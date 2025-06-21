"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  Upload, 
  Image as ImageIcon, 
  Video, 
  Gift, 
  Calendar, 
  MapPin, 
  Info, 
  X,
  Clock
} from "lucide-react"
import { Product, CreateProductForm, TaxonomyNode } from "@/types/product"
import Link from "next/link"

interface ProductFormSectionsProps {
  editProduct: Product | null
  createForm: CreateProductForm
  setCreateForm: (form: CreateProductForm) => void
  tagInput: string
  setTagInput: (value: string) => void
  materialInput: string
  setMaterialInput: (value: string) => void
  taxonomyNodes: TaxonomyNode[]
  shippingProfiles: any[]
}

export function ProductFormSections({
  editProduct,
  createForm,
  setCreateForm,
  tagInput,
  setTagInput,
  materialInput,
  setMaterialInput,
  taxonomyNodes,
  shippingProfiles,
}: ProductFormSectionsProps) {
  // Fotoğraf yükleme işleyicisi
  const handleImageUpload = (files: FileList) => {
    const newFiles = Array.from(files)
    setCreateForm({
      ...createForm,
      images: [...createForm.images, ...newFiles]
    })
  }

  // Video yükleme işleyicisi
  const handleVideoUpload = (file: File) => {
    setCreateForm({
      ...createForm,
      video: file
    })
  }

  // Etiket ekleme
  const addTag = () => {
    if (tagInput.trim() && !createForm.tags.includes(tagInput.trim())) {
      setCreateForm({
        ...createForm,
        tags: [...createForm.tags, tagInput.trim()]
      })
      setTagInput("")
    }
  }

  // Etiket silme
  const removeTag = (tagToRemove: string) => {
    setCreateForm({
      ...createForm,
      tags: createForm.tags.filter(tag => tag !== tagToRemove)
    })
  }

  // Malzeme ekleme
  const addMaterial = () => {
    if (materialInput.trim() && !createForm.materials.includes(materialInput.trim())) {
      setCreateForm({
        ...createForm,
        materials: [...createForm.materials, materialInput.trim()]
      })
      setMaterialInput("")
    }
  }

  // Malzeme silme
  const removeMaterial = (materialToRemove: string) => {
    setCreateForm({
      ...createForm,
      materials: createForm.materials.filter(material => material !== materialToRemove)
    })
  }

  return (
    <div className="py-4 space-y-6">
      {/* Fotoğraflar ve Video */}
      <section className="space-y-4 border-b pb-6">
        <h3 className="text-lg font-semibold">Fotoğraflar ve Video</h3>
        
        {/* Fotoğraf Yükleme Alanı */}
        <div 
          className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-gray-50 transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            handleImageUpload(e.dataTransfer.files)
          }}
        >
          <div className="space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Fotoğrafları buraya sürükleyin</p>
              <p className="text-sm text-gray-500">veya</p>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                id="image-upload"
                onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
              />
              <Button 
                variant="link" 
                className="text-sm"
                onClick={() => document.getElementById('image-upload')?.click()}
              >
                Bilgisayardan Seçin
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              İlk fotoğraf kapak fotoğrafı olarak kullanılacak. Sürükleyerek sıralamayı değiştirebilirsiniz.
              <br />PNG, JPG veya GIF • Fotoğraf başına max. 20MB • Min. 2000px kenar uzunluğu
            </p>
          </div>
        </div>

        {/* Yüklenen Fotoğraflar */}
        {createForm.images.length > 0 && (
          <div className="grid grid-cols-4 gap-4">
            {createForm.images.map((file, index) => (
              <div key={index} className="relative group">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Ürün fotoğrafı ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Fotoğraf açıklaması..."
                  className="mt-1 w-full text-xs"
                  value={createForm.image_alt_texts[index] || ''}
                  onChange={(e) => {
                    const newAltTexts = [...createForm.image_alt_texts]
                    newAltTexts[index] = e.target.value
                    setCreateForm({
                      ...createForm,
                      image_alt_texts: newAltTexts
                    })
                  }}
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                    const newImages = createForm.images.filter((_, i) => i !== index)
                    const newAltTexts = createForm.image_alt_texts.filter((_, i) => i !== index)
                    setCreateForm({
                      ...createForm,
                      images: newImages,
                      image_alt_texts: newAltTexts
                    })
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Video Yükleme */}
        <div>
          <Label className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            Ürün Videosu (İsteğe bağlı)
          </Label>
          <div className="mt-2 border rounded-lg p-4 text-center">
            <input
              type="file"
              accept="video/mp4"
              className="hidden"
              id="video-upload"
              onChange={(e) => e.target.files?.[0] && handleVideoUpload(e.target.files[0])}
            />
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => document.getElementById('video-upload')?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Video Yükle
            </Button>
            <p className="text-xs text-gray-500 mt-2">MP4 formatı • Max. 5 dakika • Max. 100MB</p>
          </div>
          {createForm.video && (
            <div className="mt-2">
              <video
                src={URL.createObjectURL(createForm.video)}
                controls
                className="w-full rounded-lg"
              />
              <Button
                variant="destructive"
                size="sm"
                className="mt-2"
                onClick={() => setCreateForm({ ...createForm, video: null })}
              >
                <X className="w-4 h-4 mr-2" />
                Videoyu Kaldır
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Temel Bilgiler */}
      <section className="space-y-4 border-b pb-6">
        <h3 className="text-lg font-semibold">Temel Bilgiler</h3>
        <div>
          <Label htmlFor="title">Başlık</Label>
          <Input
            id="title"
            value={editProduct?.title || createForm.title}
            onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="description">Açıklama</Label>
          <Textarea
            id="description"
            value={editProduct?.description || createForm.description}
            onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
            required
          />
        </div>
      </section>

      {/* Fiyat & Envanter */}
      <section className="space-y-4 border-b pb-6">
        <h3 className="text-lg font-semibold">Fiyat & Envanter</h3>
        <div>
          <Label htmlFor="price">Fiyat (USD)</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            value={editProduct?.price?.amount && editProduct?.price?.divisor 
              ? editProduct.price.amount / editProduct.price.divisor 
              : createForm.price}
            onChange={(e) => setCreateForm({ ...createForm, price: parseFloat(e.target.value) })}
            required
          />
        </div>
        <div>
          <Label htmlFor="quantity">Miktar</Label>
          <Input
            id="quantity"
            type="number"
            step="1"
            value={editProduct?.quantity || createForm.quantity}
            onChange={(e) => setCreateForm({ ...createForm, quantity: parseInt(e.target.value) })}
            required
          />
        </div>
      </section>

      {/* Detaylar & Nitelikler */}
      <section className="space-y-4 border-b pb-6">
        <h3 className="text-lg font-semibold">Detaylar & Nitelikler</h3>
        
        {/* Kategori */}
        <div>
          <Label htmlFor="taxonomy_id">Kategori</Label>
          <Select
            value={editProduct?.taxonomy_id?.toString() || createForm.taxonomy_id?.toString()}
            onValueChange={(value) => setCreateForm({ ...createForm, taxonomy_id: parseInt(value) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Bir kategori seçin" />
            </SelectTrigger>
            <SelectContent>
              {taxonomyNodes.map(node => (
                <SelectItem key={node.id} value={node.id.toString()}>
                  {node.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Kim Yaptı */}
        <div>
          <Label htmlFor="who_made">Kim Yaptı?</Label>
          <Select
            value={editProduct?.who_made || createForm.who_made}
            onValueChange={(value: "i_did" | "someone_else" | "collective") => 
              setCreateForm({ ...createForm, who_made: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Ürünü kim yaptı?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="i_did">Ben yaptım</SelectItem>
              <SelectItem value="someone_else">Başka biri yaptı</SelectItem>
              <SelectItem value="collective">Bir kolektif yaptı</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Ne Zaman Yapıldı */}
        <div>
          <Label htmlFor="when_made">Ne Zaman Yapıldı?</Label>
          <Select
            value={editProduct?.when_made || createForm.when_made}
            onValueChange={(value) => setCreateForm({ ...createForm, when_made: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Ürün ne zaman yapıldı?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="made_to_order">Sipariş Üzerine Yapılacak</SelectItem>
              <SelectItem value="2020_2023">2020-2023</SelectItem>
              <SelectItem value="2010_2019">2010-2019</SelectItem>
              <SelectItem value="2004_2009">2004-2009</SelectItem>
              <SelectItem value="before_2004">2004'ten Önce</SelectItem>
              <SelectItem value="2000_2003">2000-2003</SelectItem>
              <SelectItem value="1990s">1990'lar</SelectItem>
              <SelectItem value="1980s">1980'ler</SelectItem>
              <SelectItem value="1970s">1970'ler</SelectItem>
              <SelectItem value="1960s">1960'ler</SelectItem>
              <SelectItem value="1950s">1950'ler</SelectItem>
              <SelectItem value="1940s">1940'lar</SelectItem>
              <SelectItem value="1930s">1930'lar</SelectItem>
              <SelectItem value="1920s">1920'ler</SelectItem>
              <SelectItem value="1910s">1910'lar</SelectItem>
              <SelectItem value="1900s">1900'ler</SelectItem>
              <SelectItem value="1800s">1800'ler</SelectItem>
              <SelectItem value="1700s">1700'ler</SelectItem>
              <SelectItem value="before_1700">1700'den Önce</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Boyutlar */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="width">Genişlik</Label>
            <div className="flex space-x-2">
              <Input
                id="width"
                type="number"
                step="0.1"
                value={editProduct?.width || createForm.width || ''}
                onChange={(e) => setCreateForm({ ...createForm, width: parseFloat(e.target.value) })}
              />
              <Select
                value={editProduct?.width_unit || createForm.width_unit}
                onValueChange={(value) => setCreateForm({ ...createForm, width_unit: value })}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Birim" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mm">mm</SelectItem>
                  <SelectItem value="cm">cm</SelectItem>
                  <SelectItem value="m">m</SelectItem>
                  <SelectItem value="in">inç</SelectItem>
                  <SelectItem value="ft">ft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="height">Yükseklik</Label>
            <div className="flex space-x-2">
              <Input
                id="height"
                type="number"
                step="0.1"
                value={editProduct?.height || createForm.height || ''}
                onChange={(e) => setCreateForm({ ...createForm, height: parseFloat(e.target.value) })}
              />
              <Select
                value={editProduct?.height_unit || createForm.height_unit}
                onValueChange={(value) => setCreateForm({ ...createForm, height_unit: value })}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Birim" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mm">mm</SelectItem>
                  <SelectItem value="cm">cm</SelectItem>
                  <SelectItem value="m">m</SelectItem>
                  <SelectItem value="in">inç</SelectItem>
                  <SelectItem value="ft">ft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Etiketler */}
        <div>
          <Label htmlFor="tags">Etiketler (Max 13)</Label>
          <div className="flex space-x-2">
            <Input
              id="tagInput"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Etiket ekle (örn: tablo, sanat)"
              onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
            />
            <Button type="button" onClick={addTag}>Ekle</Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(editProduct?.tags || createForm.tags).map(tag => (
              <Badge key={tag} variant="secondary">
                {tag} <button type="button" onClick={() => removeTag(tag)} className="ml-1 text-red-500"><X size={12} /></button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Malzemeler */}
        <div>
          <Label htmlFor="materials">Malzemeler (Max 13)</Label>
          <div className="flex space-x-2">
            <Input
              id="materialInput"
              value={materialInput}
              onChange={(e) => setMaterialInput(e.target.value)}
              placeholder="Malzeme ekle (örn: tuval, yağlı boya)"
              onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMaterial(); } }}
            />
            <Button type="button" onClick={addMaterial}>Ekle</Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(editProduct?.materials || createForm.materials).map(material => (
              <Badge key={material} variant="secondary">
                {material} <button type="button" onClick={() => removeMaterial(material)} className="ml-1 text-red-500"><X size={12} /></button>
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* SEO ve Pazarlama */}
      <section className="space-y-4 border-b pb-6">
        <h3 className="text-lg font-semibold">SEO ve Pazarlama</h3>

        {/* Mağaza Bölümü */}
        <div>
          <Label htmlFor="shop_section_id">Mağaza Bölümü</Label>
          <Select
            value={editProduct?.shop_section_id?.toString() || createForm.shop_section_id?.toString()}
            onValueChange={(value) => setCreateForm({ ...createForm, shop_section_id: parseInt(value) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Bir bölüm seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Duvar Sanatı</SelectItem>
              <SelectItem value="2">Tablolar</SelectItem>
              <SelectItem value="3">Özel Tasarımlar</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            Ürününüzü doğru bölümde göstererek müşterilerin bulmasını kolaylaştırın
          </p>
        </div>

        {/* Hedef Kitle ve Özel Durumlar */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="flex items-center gap-2">
              <Gift className="w-4 h-4" />
              Hediye İçin Mi?
            </Label>
            <Select
              value={editProduct?.occasion?.toString() || createForm.occasion?.toString()}
              onValueChange={(value) => setCreateForm({ ...createForm, occasion: [value] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="birthday">Doğum Günü</SelectItem>
                <SelectItem value="wedding">Düğün</SelectItem>
                <SelectItem value="anniversary">Yıldönümü</SelectItem>
                <SelectItem value="housewarming">Ev Hediyesi</SelectItem>
                <SelectItem value="graduation">Mezuniyet</SelectItem>
                <SelectItem value="baby_shower">Bebek Partisi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Tatil/Sezon
            </Label>
            <Select
              value={editProduct?.holiday || createForm.holiday}
              onValueChange={(value) => setCreateForm({ ...createForm, holiday: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="christmas">Yılbaşı</SelectItem>
                <SelectItem value="valentines">Sevgililer Günü</SelectItem>
                <SelectItem value="mothers_day">Anneler Günü</SelectItem>
                <SelectItem value="fathers_day">Babalar Günü</SelectItem>
                <SelectItem value="halloween">Cadılar Bayramı</SelectItem>
                <SelectItem value="easter">Paskalya</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stil Etiketleri */}
        <div>
          <Label className="flex items-center gap-2">Stil Etiketleri</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {[
              "Modern", "Vintage", "Minimalist", "Bohem", "Endüstriyel", 
              "Klasik", "Çağdaş", "Rustik", "Skandinav", "Eklektik",
              "Art Deco", "Retro", "Organik", "Geometrik", "Soyut"
            ].map(style => (
              <Button
                key={style}
                variant={createForm.style?.includes(style) ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  const newStyles = createForm.style?.includes(style)
                    ? createForm.style.filter(s => s !== style)
                    : [...(createForm.style || []), style]
                  setCreateForm({ ...createForm, style: newStyles })
                }}
              >
                {style}
              </Button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            En az 3 stil etiketi seçmenizi öneririz
          </p>
        </div>

        {/* Dijital Ürün */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_digital"
              checked={editProduct?.is_digital || createForm.is_digital}
              onCheckedChange={(checked) => setCreateForm({ ...createForm, is_digital: checked as boolean })}
            />
            <Label htmlFor="is_digital">Bu bir dijital ürün</Label>
          </div>

          {(editProduct?.is_digital || createForm.is_digital) && (
            <div className="pl-6 border-l space-y-4">
              <div>
                <Label>Dijital Dosyalar</Label>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  id="digital-files-upload"
                  onChange={(e) => {
                    if (e.target.files) {
                      setCreateForm({
                        ...createForm,
                        digital_files: [...createForm.digital_files, ...Array.from(e.target.files)]
                      })
                    }
                  }}
                />
                <Button 
                  variant="outline" 
                  className="w-full mt-2"
                  onClick={() => document.getElementById('digital-files-upload')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Dijital Dosyaları Yükle
                </Button>
                <p className="text-xs text-gray-500 mt-1">
                  ZIP, PDF, DOC, veya diğer dijital formatlar • Dosya başına max. 20MB
                </p>
              </div>

              {createForm.digital_files.length > 0 && (
                <div className="space-y-2">
                  {createForm.digital_files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm truncate">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newFiles = createForm.digital_files.filter((_, i) => i !== index)
                          setCreateForm({
                            ...createForm,
                            digital_files: newFiles
                          })
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Üretim ve Teslimat */}
      <section className="space-y-4 border-b pb-6">
        <h3 className="text-lg font-semibold">Üretim ve Teslimat</h3>

        {/* Kargo Profili */}
        <div>
          <Label htmlFor="shipping_profile_id" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Kargo Profili
          </Label>
          <Select
            value={editProduct?.shipping_profile_id?.toString() || createForm.shipping_profile_id?.toString()}
            onValueChange={(value) => setCreateForm({ ...createForm, shipping_profile_id: parseInt(value) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Kargo profili seçin" />
            </SelectTrigger>
            <SelectContent>
              {shippingProfiles?.length > 0 ? (
                shippingProfiles.map((profile) => (
                  <SelectItem 
                    key={profile.shipping_profile_id} 
                    value={profile.shipping_profile_id.toString()}
                  >
                    {profile.title} ({(profile.primary_cost.amount / profile.primary_cost.divisor).toFixed(2)} {profile.primary_cost.currency_code})
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-profile" disabled>
                  Etsy'den kargo profilleri yükleniyor...
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Üretim Süresi */}
        <div>
          <Label htmlFor="production_time" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Üretim Süresi
          </Label>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                type="number"
                id="min_processing_days"
                placeholder="Min. gün"
                value={editProduct?.min_processing_days || createForm.min_processing_days || ""}
                onChange={(e) => setCreateForm({ ...createForm, min_processing_days: parseInt(e.target.value) })}
              />
            </div>
            <div className="flex-1">
              <Input
                type="number"
                id="max_processing_days"
                placeholder="Max. gün"
                value={editProduct?.max_processing_days || createForm.max_processing_days || ""}
                onChange={(e) => setCreateForm({ ...createForm, max_processing_days: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </div>

        {/* Üretim Yeri */}
        <div>
          <Label htmlFor="production_location" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Üretim Yeri
          </Label>
          <Input
            type="text"
            id="production_location"
            placeholder="Örn: İstanbul, Türkiye"
            value={editProduct?.production_location || createForm.production_location || ""}
            onChange={(e) => setCreateForm({ ...createForm, production_location: e.target.value })}
          />
        </div>

        {/* Satış Sonrası Talimatlar */}
        <div>
          <Label className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            Satış Sonrası Talimatlar
          </Label>
          <Textarea
            value={editProduct?.care_instructions || createForm.care_instructions}
            onChange={(e) => setCreateForm({ ...createForm, care_instructions: e.target.value })}
            placeholder="Ürün bakımı, kullanımı veya montajı hakkında bilgiler..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Müşterilerinize ürünün bakımı, kullanımı veya montajı hakkında detaylı bilgi verin
          </p>
        </div>
      </section>
    </div>
  )
} 