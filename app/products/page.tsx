"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Package,
  Search,
  Filter,
  Plus,
  Edit,
  Copy,
  Trash2,
  Sparkles,
  TrendingUp,
  Eye,
  ShoppingCart,
  Star,
  AlertTriangle,
  CheckCircle,
  Upload,
  BarChart3,
  Save,
  X,
  Image as ImageIcon
} from "lucide-react"
import { createClientSupabase } from "@/lib/supabase"

interface Product {
  listing_id: number
  title: string
  description: string
  price: {
    amount: number
    divisor: number
    currency_code: string
  }
  images: Array<{
    url_570xN: string
    alt_text: string
  }>
  tags: string[]
  state: "active" | "inactive" | "draft"
  views?: number
  quantity: number
  created_timestamp: number
  last_modified_timestamp: number
  shop_id: number
  url: string
}

interface CreateProductForm {
  title: string
  description: string
  price: number
  quantity: number
  tags: string[]
  materials: string[]
  who_made: "i_did" | "someone_else" | "collective"
  when_made: string
  taxonomy_id: number
}

interface TaxonomyNode {
  id: number
  name: string
  level: number
  path: string[]
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("created_timestamp")
  const [filterStatus, setFilterStatus] = useState("all")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState<Product | null>(null)
  const [taxonomyNodes, setTaxonomyNodes] = useState<TaxonomyNode[]>([])
  const [createForm, setCreateForm] = useState<CreateProductForm>({
    title: "",
    description: "",
    price: 0,
    quantity: 1,
    tags: [],
    materials: [],
    who_made: "i_did",
    when_made: "made_to_order",
    taxonomy_id: 1
  })
  const [tagInput, setTagInput] = useState("")
  const [materialInput, setMaterialInput] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadProducts()
    loadTaxonomy()
  }, [])

  useEffect(() => {
    filterAndSortProducts()
  }, [products, searchTerm, sortBy, filterStatus])

  const loadProducts = async () => {
    setLoading(true)

    const supabase = createClientSupabase()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      try {
        // Gerçek Etsy ürünlerini çekmeye çalış
        const response = await fetch('/api/etsy/products')
        
        if (response.ok) {
          const data = await response.json()
          if (data.products && data.products.length > 0) {
            setProducts(data.products)
          } else {
            setProducts([])
          }
        } else {
          setProducts([])
        }
      } catch (apiError) {
        console.log("API error:", apiError)
        setProducts([])
      }
    } else {
      setProducts([])
    }
    setLoading(false)
  }

  const loadTaxonomy = async () => {
    try {
      const response = await fetch('/api/etsy/taxonomy')
      if (response.ok) {
        const data = await response.json()
        if (data.taxonomy_nodes) {
          // Canvas/Art kategorilerini filtrele
          const artNodes = data.taxonomy_nodes.filter((node: TaxonomyNode) => 
            node.name.toLowerCase().includes('art') || 
            node.name.toLowerCase().includes('canvas') ||
            node.name.toLowerCase().includes('home') ||
            node.name.toLowerCase().includes('decor')
          )
          setTaxonomyNodes(artNodes.slice(0, 20)) // İlk 20 kategori
        }
      }
    } catch (error) {
      console.error("Taxonomy load error:", error)
    }
  }

  const filterAndSortProducts = () => {
    let filtered = [...products]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(product => 
        product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(product => product.state === filterStatus)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title)
        case "price":
          return (b.price.amount / b.price.divisor) - (a.price.amount / a.price.divisor)
        case "quantity":
          return b.quantity - a.quantity
        case "created_timestamp":
        default:
          return b.created_timestamp - a.created_timestamp
      }
    })

    setFilteredProducts(filtered)
  }

  const handleCreateProduct = async () => {
    if (!createForm.title || !createForm.description || createForm.price <= 0) {
      alert("Lütfen tüm gerekli alanları doldurun!")
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/etsy/listings/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...createForm,
          price: Math.round(createForm.price * 100), // USD cents'e çevir
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert("✅ Ürün başarıyla oluşturuldu!")
        setShowCreateModal(false)
        setCreateForm({
          title: "",
          description: "",
          price: 0,
          quantity: 1,
          tags: [],
          materials: [],
          who_made: "i_did",
          when_made: "made_to_order",
          taxonomy_id: 1
        })
        loadProducts() // Listeyi yenile
      } else {
        const errorData = await response.json()
        alert(`❌ Hata: ${errorData.details || errorData.error}`)
      }
    } catch (error) {
      console.error("Create product error:", error)
      alert("❌ Ürün oluşturulurken hata oluştu!")
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateProduct = async (product: Product) => {
    setSubmitting(true)
    try {
      const response = await fetch(`/api/etsy/listings/${product.listing_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: product.title,
          description: product.description,
          price: Math.round((product.price.amount / product.price.divisor) * 100),
          quantity: product.quantity,
          state: product.state
        })
      })

      if (response.ok) {
        alert("✅ Ürün başarıyla güncellendi!")
        setShowEditModal(null)
        loadProducts()
      } else {
        const errorData = await response.json()
        alert(`❌ Hata: ${errorData.details || errorData.error}`)
      }
    } catch (error) {
      console.error("Update product error:", error)
      alert("❌ Ürün güncellenirken hata oluştu!")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteProduct = async (listingId: number) => {
    if (!confirm("Bu ürünü silmek istediğinizden emin misiniz?")) {
      return
    }

    try {
      const response = await fetch(`/api/etsy/listings/${listingId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert("✅ Ürün başarıyla silindi!")
        loadProducts()
      } else {
        const errorData = await response.json()
        alert(`❌ Hata: ${errorData.details || errorData.error}`)
      }
    } catch (error) {
      console.error("Delete product error:", error)
      alert("❌ Ürün silinirken hata oluştu!")
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !createForm.tags.includes(tagInput.trim())) {
      setCreateForm(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setCreateForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const addMaterial = () => {
    if (materialInput.trim() && !createForm.materials.includes(materialInput.trim())) {
      setCreateForm(prev => ({
        ...prev,
        materials: [...prev.materials, materialInput.trim()]
      }))
      setMaterialInput("")
    }
  }

  const removeMaterial = (materialToRemove: string) => {
    setCreateForm(prev => ({
      ...prev,
      materials: prev.materials.filter(material => material !== materialToRemove)
    }))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800"
      case "inactive": return "bg-red-100 text-red-800"
      case "draft": return "bg-yellow-100 text-yellow-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const formatPrice = (price: { amount: number; divisor: number; currency_code: string }) => {
    return `${price.currency_code} ${(price.amount / price.divisor).toFixed(2)}`
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('tr-TR')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 animate-pulse text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Ürünler yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Package className="h-8 w-8 text-blue-600 mr-3" />
              Ürünler ({filteredProducts.length})
            </h1>
            <p className="text-gray-600 mt-2">Canvas wall art ürünlerinizi yönetin</p>
          </div>
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Yeni Ürün Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Yeni Ürün Oluştur</DialogTitle>
                <DialogDescription>
                  Etsy mağazanıza yeni bir canvas wall art ürünü ekleyin
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Ürün Başlığı *</Label>
                  <Input
                    id="title"
                    value={createForm.title}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Örn: Modern Abstract Canvas Wall Art"
                    maxLength={140}
                  />
                  <p className="text-xs text-gray-500 mt-1">{createForm.title.length}/140 karakter</p>
                </div>

                <div>
                  <Label htmlFor="description">Açıklama *</Label>
                  <Textarea
                    id="description"
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Ürününüzün detaylı açıklaması..."
                    rows={4}
                    maxLength={1000}
                  />
                  <p className="text-xs text-gray-500 mt-1">{createForm.description.length}/1000 karakter</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Fiyat (USD) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={createForm.price}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      placeholder="29.99"
                    />
                  </div>
                  <div>
                    <Label htmlFor="quantity">Stok Miktarı *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={createForm.quantity}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="who_made">Kim Yaptı? *</Label>
                    <Select value={createForm.who_made} onValueChange={(value: any) => setCreateForm(prev => ({ ...prev, who_made: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="i_did">Ben yaptım</SelectItem>
                        <SelectItem value="someone_else">Başkası yaptı</SelectItem>
                        <SelectItem value="collective">Kolektif çalışma</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="when_made">Ne Zaman Yapıldı? *</Label>
                    <Select value={createForm.when_made} onValueChange={(value) => setCreateForm(prev => ({ ...prev, when_made: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="made_to_order">Sipariş üzerine</SelectItem>
                        <SelectItem value="2020_2024">2020-2024</SelectItem>
                        <SelectItem value="2010_2019">2010-2019</SelectItem>
                        <SelectItem value="2000_2009">2000-2009</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="taxonomy">Kategori *</Label>
                  <Select value={createForm.taxonomy_id.toString()} onValueChange={(value) => setCreateForm(prev => ({ ...prev, taxonomy_id: parseInt(value) }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {taxonomyNodes.map((node) => (
                        <SelectItem key={node.id} value={node.id.toString()}>
                          {node.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Etiketler</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Etiket ekle..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" onClick={addTag} size="sm">Ekle</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {createForm.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                        {tag} <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Malzemeler</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={materialInput}
                      onChange={(e) => setMaterialInput(e.target.value)}
                      placeholder="Malzeme ekle..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMaterial())}
                    />
                    <Button type="button" onClick={addMaterial} size="sm">Ekle</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {createForm.materials.map((material, index) => (
                      <Badge key={index} variant="outline" className="cursor-pointer" onClick={() => removeMaterial(material)}>
                        {material} <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  İptal
                </Button>
                <Button onClick={handleCreateProduct} disabled={submitting}>
                  {submitting ? "Oluşturuluyor..." : "Ürün Oluştur"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Ürün ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sırala" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_timestamp">Yeni Eklenen</SelectItem>
                <SelectItem value="title">Başlık</SelectItem>
                <SelectItem value="price">Fiyat</SelectItem>
                <SelectItem value="quantity">Stok</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Pasif</SelectItem>
                <SelectItem value="draft">Taslak</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadProducts}>
              <Filter className="h-4 w-4 mr-2" />
              Yenile
            </Button>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Ürün bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500">
              {products.length === 0 
                ? "Henüz hiç ürününüz yok. İlk ürününüzü ekleyin!"
                : "Arama kriterlerinize uygun ürün bulunamadı."
              }
            </p>
            {products.length === 0 && (
              <div className="mt-6">
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  İlk Ürününüzü Ekleyin
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <Card key={product.listing_id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{product.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getStatusColor(product.state)}>
                          {product.state === 'active' ? 'Aktif' : product.state === 'inactive' ? 'Pasif' : 'Taslak'}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {formatDate(product.created_timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Product Image */}
                  {product.images && product.images.length > 0 ? (
                    <div className="aspect-square bg-gray-100 rounded-lg mb-4 overflow-hidden">
                      <img 
                        src={product.images[0].url_570xN} 
                        alt={product.images[0].alt_text || product.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-gray-400" />
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-green-600">
                        {formatPrice(product.price)}
                      </span>
                      <span className="text-sm text-gray-500">
                        Stok: {product.quantity}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 line-clamp-2">
                      {product.description}
                    </p>

                    {product.tags && product.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {product.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {product.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{product.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowEditModal(product)}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Düzenle
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(product.url, '_blank')}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Görüntüle
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteProduct(product.listing_id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && (
          <Dialog open={!!showEditModal} onOpenChange={() => setShowEditModal(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Ürün Düzenle</DialogTitle>
                <DialogDescription>
                  {showEditModal.title} ürününü düzenleyin
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-title">Ürün Başlığı</Label>
                  <Input
                    id="edit-title"
                    value={showEditModal.title}
                    onChange={(e) => setShowEditModal(prev => prev ? { ...prev, title: e.target.value } : null)}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-description">Açıklama</Label>
                  <Textarea
                    id="edit-description"
                    value={showEditModal.description}
                    onChange={(e) => setShowEditModal(prev => prev ? { ...prev, description: e.target.value } : null)}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-price">Fiyat (USD)</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      step="0.01"
                      value={showEditModal.price.amount / showEditModal.price.divisor}
                      onChange={(e) => setShowEditModal(prev => prev ? {
                        ...prev,
                        price: {
                          ...prev.price,
                          amount: Math.round(parseFloat(e.target.value) * prev.price.divisor)
                        }
                      } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-quantity">Stok</Label>
                    <Input
                      id="edit-quantity"
                      type="number"
                      value={showEditModal.quantity}
                      onChange={(e) => setShowEditModal(prev => prev ? { ...prev, quantity: parseInt(e.target.value) || 0 } : null)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-state">Durum</Label>
                  <Select 
                    value={showEditModal.state} 
                    onValueChange={(value: any) => setShowEditModal(prev => prev ? { ...prev, state: value } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Aktif</SelectItem>
                      <SelectItem value="inactive">Pasif</SelectItem>
                      <SelectItem value="draft">Taslak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditModal(null)}>
                  İptal
                </Button>
                <Button onClick={() => showEditModal && handleUpdateProduct(showEditModal)} disabled={submitting}>
                  {submitting ? "Güncelleniyor..." : "Güncelle"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  )
}
