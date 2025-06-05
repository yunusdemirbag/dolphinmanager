"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Loader2, Search, Tag, FileText, ArrowRight, TrendingUp, ExternalLink, AlertTriangle, Check, Copy } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

interface SeoProduct {
  id: string
  title: string
  current_seo_score: number
  issues: string[]
  views: number
  sales: number
  conversion_rate: number
  last_sale: string | null
  tags: string[]
  title_length: number
  description_length: number
  has_attributes: boolean
  is_optimized: boolean
  etsy_url?: string
}

export default function MarketingSeoPage() {
  const [products, setProducts] = useState<SeoProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [sorting, setSorting] = useState("score_asc")
  const [selectedStore, setSelectedStore] = useState<string>("all")
  const [stores, setStores] = useState<any[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadStores()
    loadSeoData()
  }, [])

  const loadStores = async () => {
    try {
      const response = await fetch("/api/etsy/stores")
      const data = await response.json()
      if (data.stores) {
        setStores(data.stores)
      }
    } catch (error) {
      console.error("Error loading stores:", error)
    }
  }

  const loadSeoData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/etsy/seo-data?store=${selectedStore}`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
      } else {
        setProducts([])
      }
    } catch (error) {
      console.error("Error loading SEO data:", error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const analyzeProducts = async () => {
    setAnalyzing(true)
    try {
      const response = await fetch("/api/etsy/analyze-seo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ store_id: selectedStore }),
      })
      if (response.ok) {
        toast({
          title: "Analiz tamamlandı",
          description: "Ürünlerinizin SEO analizi güncellendi",
        })
        loadSeoData()
      } else {
        toast({
          title: "Analiz hatası",
          description: "Ürünleriniz analiz edilirken bir hata oluştu",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error analyzing products:", error)
      toast({
        title: "Analiz hatası",
        description: "Bir bağlantı hatası oluştu",
        variant: "destructive",
      })
    } finally {
      setAnalyzing(false)
    }
  }

  const handleOptimizeProduct = async (productId: string) => {
    toast({
      title: "Optimize ediliyor",
      description: "Ürün SEO performansı optimize ediliyor...",
    })
    // Burada API çağrısı yapılacak
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 50) return "text-amber-600"
    return "text-red-600"
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-100"
    if (score >= 50) return "bg-amber-100"
    return "bg-red-100"
  }

  const filteredProducts = products
    .filter((product) => {
      if (selectedTab === "all") return true
      if (selectedTab === "low_score") return product.current_seo_score < 50
      if (selectedTab === "no_sales") return product.sales === 0
      if (selectedTab === "optimized") return product.is_optimized
      return true
    })
    .filter((product) =>
      product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      switch (sorting) {
        case "score_asc":
          return a.current_seo_score - b.current_seo_score
        case "score_desc":
          return b.current_seo_score - a.current_seo_score
        case "views_desc":
          return b.views - a.views
        case "sales_desc":
          return b.sales - a.sales
        default:
          return 0
      }
    })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SEO ve Pazarlama Optimizasyonu</h1>
              <p className="text-sm text-gray-600">Ürün performansınızı artıracak SEO ve pazarlama araçları</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                Dashboard'a Dön
              </Button>
              <Button onClick={analyzeProducts} disabled={analyzing}>
                {analyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                SEO Analizi Yap
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ortalama SEO Skoru</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {products.length > 0
                      ? Math.round(products.reduce((acc, p) => acc + p.current_seo_score, 0) / products.length)
                      : "--"}%
                  </p>
                </div>
                <div className="p-3 rounded-full bg-blue-100">
                  <Search className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">İyileştirme Gereken</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {products.filter((p) => p.current_seo_score < 50).length}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-amber-100">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Optimize Edilmiş</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {products.filter((p) => p.is_optimized).length}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-green-100">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Dönüşüm Oranı</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {products.length > 0
                      ? (products.reduce((acc, p) => acc + p.conversion_rate, 0) / products.length).toFixed(2)
                      : "--"}%
                  </p>
                </div>
                <div className="p-3 rounded-full bg-purple-100">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white rounded-lg border shadow-sm mb-6">
          <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Ürün veya etiket ara..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Mağaza seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Mağazalar</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id.toString()}>
                      {store.shop_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-3">
              <Select value={sorting} onValueChange={setSorting}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Sıralama" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="score_asc">Düşük Skordan Yükseğe</SelectItem>
                  <SelectItem value="score_desc">Yüksek Skordan Düşüğe</SelectItem>
                  <SelectItem value="views_desc">En Çok Görüntülenen</SelectItem>
                  <SelectItem value="sales_desc">En Çok Satan</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={loadSeoData}>
                Yenile
              </Button>
            </div>
          </div>
          <div className="border-t">
            <Tabs defaultValue="all" value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="p-0 h-12 bg-gray-50 border-b">
                <TabsTrigger value="all" className="flex-1 h-12 data-[state=active]:bg-white">
                  Tüm Ürünler ({products.length})
                </TabsTrigger>
                <TabsTrigger value="low_score" className="flex-1 h-12 data-[state=active]:bg-white">
                  Düşük Skorlu ({products.filter((p) => p.current_seo_score < 50).length})
                </TabsTrigger>
                <TabsTrigger value="no_sales" className="flex-1 h-12 data-[state=active]:bg-white">
                  Satışı Olmayan ({products.filter((p) => p.sales === 0).length})
                </TabsTrigger>
                <TabsTrigger value="optimized" className="flex-1 h-12 data-[state=active]:bg-white">
                  Optimize Edilmiş ({products.filter((p) => p.is_optimized).length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="p-0 m-0">
                {loading ? (
                  <div className="flex items-center justify-center p-10">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-sm text-gray-500">Ürünler yükleniyor...</span>
                  </div>
                ) : (
                  <div>
                    {filteredProducts.length === 0 ? (
                      <div className="p-10 text-center">
                        <p className="text-gray-500">Ürün bulunamadı.</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredProducts.map((product) => (
                          <div key={product.id} className="p-4 hover:bg-gray-50">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                              <div className="flex items-start space-x-4">
                                <div
                                  className={`w-12 h-12 flex items-center justify-center rounded-full font-semibold ${getScoreBg(
                                    product.current_seo_score
                                  )} ${getScoreColor(product.current_seo_score)}`}
                                >
                                  {product.current_seo_score}
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-medium text-gray-900 mb-1">{product.title}</h3>
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {product.tags.slice(0, 5).map((tag, i) => (
                                      <Badge key={i} variant="outline" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                    {product.tags.length > 5 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{product.tags.length - 5} daha
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                                    <span>Görüntülenme: {product.views}</span>
                                    <span>Satış: {product.sales}</span>
                                    <span>Dönüşüm: %{(product.conversion_rate * 100).toFixed(1)}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 md:mt-0 flex items-center space-x-2">
                                {product.etsy_url && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8"
                                    onClick={() => window.open(product.etsy_url, "_blank")}
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                                    Etsy
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8"
                                  onClick={() => handleOptimizeProduct(product.id)}
                                >
                                  <Search className="w-3.5 h-3.5 mr-1.5" />
                                  Optimize Et
                                </Button>
                              </div>
                            </div>

                            <div className="mt-3">
                              <div className="mb-1.5 flex items-center justify-between">
                                <span className="text-xs text-gray-500">SEO Skor</span>
                                <span className={`text-xs font-medium ${getScoreColor(product.current_seo_score)}`}>
                                  {product.current_seo_score}%
                                </span>
                              </div>
                              <Progress
                                value={product.current_seo_score}
                                className="h-1.5"
                                indicatorClassName={`${
                                  product.current_seo_score >= 80
                                    ? "bg-green-600"
                                    : product.current_seo_score >= 50
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                                }`}
                              />
                            </div>

                            {product.issues.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs font-medium text-red-600">İyileştirme Önerileri:</p>
                                <ul className="mt-1 space-y-1">
                                  {product.issues.map((issue, i) => (
                                    <li key={i} className="text-xs text-gray-600 flex items-start">
                                      <AlertTriangle className="w-3 h-3 text-amber-500 mr-1 mt-0.5 flex-shrink-0" />
                                      <span>{issue}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="low_score" className="p-0 m-0">
                {/* Aynı içerik filterlanmış olarak gösterilecek */}
              </TabsContent>

              <TabsContent value="no_sales" className="p-0 m-0">
                {/* Aynı içerik filterlanmış olarak gösterilecek */}
              </TabsContent>

              <TabsContent value="optimized" className="p-0 m-0">
                {/* Aynı içerik filterlanmış olarak gösterilecek */}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>En İyi SEO Etiketleri</CardTitle>
              <CardDescription>En çok dönüşüm alan etiketler</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Tag className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">canvas art</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-green-600">%4.2 dönüşüm</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Tag className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">wall decor</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-green-600">%3.8 dönüşüm</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Tag className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">custom portrait</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-green-600">%3.5 dönüşüm</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  <Copy className="w-4 h-4 mr-2" />
                  Başarılı Etiketleri Kopyala
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>En İyi Başlık Formatları</CardTitle>
              <CardDescription>Yüksek dönüşüm alan başlık formatları</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-sm">[Ürün Tipi] - [Materyal] [Renk] [Stil] - [Özellik]</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Örnek: "Canvas Wall Art - Black and White Abstract Minimalist - Gallery Wrapped"
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-sm">[Özel] [Ürün] - [Özellik] - [Kişiselleştirme]</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Örnek: "Custom Pet Portrait - Watercolor Style - With Personalized Name"
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-sm">[Anahtar Kelime] [Ürün] - [Boyut] - [Hedef Kitle]</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Örnek: "Nursery Wall Art - 8x10 Print Set - Perfect Baby Shower Gift"
                  </p>
                </div>
                <Button variant="outline" className="w-full">
                  <FileText className="w-4 h-4 mr-2" />
                  Başlık Rehberini Göster
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO İpuçları</CardTitle>
              <CardDescription>Etsy'de yüksek performans için öneriler</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 text-xs font-bold">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Başlıkta ana anahtar kelimeleri ilk 40 karakterde kullanın</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Etsy arama sonuçlarında başlıkların ilk 40 karakteri daha önemlidir
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 text-xs font-bold">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Tüm etiket alanlarını doldurarak maksimum 13 etiket kullanın</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Etiketleri tırnaklar içinde yazarak çok kelimeli etiketler oluşturun
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 text-xs font-bold">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Kaliteli ve detaylı ürün fotoğrafları ekleyin</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      En az 5 yüksek kaliteli görsel kullanarak dönüşüm oranınızı artırın
                    </p>
                  </div>
                </div>
                <Button className="w-full">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Tam SEO Rehberini Gör
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 