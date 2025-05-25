"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, TrendingUp, Target, Lightbulb, AlertTriangle, Tag, Plus, Zap, Eye, ShoppingCart } from "lucide-react"

interface ProductNeedingOptimization {
  id: string
  title: string
  current_seo_score: number
  issues: string[]
  views: number
  sales: number
  last_sale: string | null
  tags: string[]
  needs_title_change: boolean
  needs_tag_change: boolean
  no_sales: boolean
  low_traffic: boolean
}

export default function SEOOptimizerPage() {
  const [productTitle, setProductTitle] = useState("")
  const [productTags, setProductTags] = useState("")
  const [productDescription, setProductDescription] = useState("")
  const [analyzing, setAnalyzing] = useState(false)
  const [productsNeedingHelp, setProductsNeedingHelp] = useState<ProductNeedingOptimization[]>([])

  useEffect(() => {
    loadProductsNeedingOptimization()
  }, [])

  const loadProductsNeedingOptimization = () => {
    // Demo veri kaldırıldı - gerçek API'den veri çekilecek
    setProductsNeedingHelp([])
  }

  // Demo veriler kaldırıldı - gerçek veriler API'den gelecek
  const seoScore = 0
  const keywordData: any[] = []
  const tagSuggestions: any[] = []

  const handleAnalyze = () => {
    setAnalyzing(true)
    setTimeout(() => setAnalyzing(false), 2000)
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-50 border-green-200"
    if (score >= 60) return "bg-yellow-50 border-yellow-200"
    return "bg-red-50 border-red-200"
  }

  const getPriorityColor = (score: number) => {
    if (score < 30) return "bg-red-100 text-red-800"
    if (score < 50) return "bg-yellow-100 text-yellow-800"
    return "bg-blue-100 text-blue-800"
  }

  const getPriorityText = (score: number) => {
    if (score < 30) return "Acil"
    if (score < 50) return "Yüksek"
    return "Orta"
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">SEO Optimizer</h1>
                <p className="text-sm text-gray-600">Canvas wall art ürünlerinizi Etsy'de daha görünür hale getirin</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-orange-600 border-orange-300">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {productsNeedingHelp.length} ürün yardım bekliyor
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="needs-help" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="needs-help">Yardım Gerekli</TabsTrigger>
            <TabsTrigger value="keywords">Anahtar Kelimeler</TabsTrigger>
            <TabsTrigger value="tags">Tag Önerileri</TabsTrigger>
            <TabsTrigger value="analyzer">SEO Analiz</TabsTrigger>
          </TabsList>

          <TabsContent value="needs-help">
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-red-200">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {productsNeedingHelp.filter((p) => p.no_sales).length}
                    </div>
                    <div className="text-sm text-gray-600">Hiç Satış Yok</div>
                  </CardContent>
                </Card>
                <Card className="border-yellow-200">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {productsNeedingHelp.filter((p) => p.low_traffic).length}
                    </div>
                    <div className="text-sm text-gray-600">Düşük Trafik</div>
                  </CardContent>
                </Card>
                <Card className="border-blue-200">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {productsNeedingHelp.filter((p) => p.needs_title_change).length}
                    </div>
                    <div className="text-sm text-gray-600">Başlık Değişmeli</div>
                  </CardContent>
                </Card>
                <Card className="border-purple-200">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {productsNeedingHelp.filter((p) => p.needs_tag_change).length}
                    </div>
                    <div className="text-sm text-gray-600">Tag Güncellenmeli</div>
                  </CardContent>
                </Card>
              </div>

              {/* Products Needing Help */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
                    SEO Yardımı Gereken Canvas'lar
                  </CardTitle>
                  <CardDescription>Bu ürünler acil optimizasyon gerektiriyor</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {productsNeedingHelp.map((product) => (
                      <Card key={product.id} className="border-l-4 border-l-red-500">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="font-semibold text-lg">{product.title}</h3>
                                <Badge className={getPriorityColor(product.current_seo_score)}>
                                  {getPriorityText(product.current_seo_score)} Öncelik
                                </Badge>
                                <Badge
                                  className={getScoreBg(product.current_seo_score)
                                    .replace("bg-", "")
                                    .replace("border-", "")}
                                >
                                  SEO: {product.current_seo_score}/100
                                </Badge>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                                <div className="flex items-center">
                                  <Eye className="w-4 h-4 mr-1" />
                                  {product.views} görüntülenme
                                </div>
                                <div className="flex items-center">
                                  <ShoppingCart className="w-4 h-4 mr-1" />
                                  {product.sales} satış
                                </div>
                                <div className="text-sm">
                                  Son satış:{" "}
                                  {product.last_sale ? new Date(product.last_sale).toLocaleDateString("tr-TR") : "Hiç"}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {product.tags.slice(0, 3).map((tag, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-2">
                                <h4 className="font-medium text-red-800">Tespit Edilen Sorunlar:</h4>
                                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                                  {product.issues.map((issue, index) => (
                                    <li key={index}>{issue}</li>
                                  ))}
                                </ul>
                              </div>

                              <div className="flex flex-wrap gap-2 mt-3">
                                {product.no_sales && (
                                  <Badge variant="outline" className="text-red-600 border-red-300">
                                    Satış Yok
                                  </Badge>
                                )}
                                {product.low_traffic && (
                                  <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                                    Düşük Trafik
                                  </Badge>
                                )}
                                {product.needs_title_change && (
                                  <Badge variant="outline" className="text-blue-600 border-blue-300">
                                    Başlık Değişmeli
                                  </Badge>
                                )}
                                {product.needs_tag_change && (
                                  <Badge variant="outline" className="text-purple-600 border-purple-300">
                                    Tag Güncellemeli
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col space-y-2 ml-4">
                              <Button className="bg-orange-500 hover:bg-orange-600">
                                <Zap className="w-4 h-4 mr-2" />
                                AI ile Optimize Et
                              </Button>
                              <Button variant="outline" size="sm">
                                Detayları Gör
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="keywords">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                  Canvas Wall Art Anahtar Kelime Analizi
                </CardTitle>
                <CardDescription>En popüler canvas wall art arama terimlerini keşfedin</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {keywordData.map((keyword, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{keyword.keyword}</h4>
                          {keyword.trend === "up" && <TrendingUp className="w-4 h-4 text-green-600" />}
                        </div>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                          <span>Arama: {keyword.volume.toLocaleString()}/ay</span>
                          <Badge
                            variant="outline"
                            className={
                              keyword.competition === "Low"
                                ? "border-green-300 text-green-700"
                                : keyword.competition === "Medium"
                                  ? "border-yellow-300 text-yellow-700"
                                  : "border-red-300 text-red-700"
                            }
                          >
                            {keyword.competition}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Zorluk</div>
                        <div className="flex items-center space-x-2">
                          <Progress value={keyword.difficulty} className="w-16 h-2" />
                          <span className="text-sm font-medium">{keyword.difficulty}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tags">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Tag className="w-5 h-5 mr-2 text-purple-600" />
                  Canvas Wall Art için En İyi Taglar
                </CardTitle>
                <CardDescription>AI destekli tag önerileri ile görünürlüğünüzü artırın</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tagSuggestions.map((suggestion, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{suggestion.tag}</span>
                        <div className="flex items-center space-x-2">
                          <div
                            className={`w-2 h-2 rounded-full ${getScoreColor(suggestion.score).replace("text", "bg")}`}
                          ></div>
                          <span className="text-sm font-medium">{suggestion.score}/100</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{suggestion.reason}</p>
                      <Button size="sm" variant="outline" className="w-full">
                        <Plus className="w-3 h-3 mr-1" />
                        Tag'i Kullan
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analyzer">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Input Form */}
              <div className="lg:col-span-1 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Target className="w-5 h-5 mr-2 text-orange-600" />
                      Canvas Ürün Bilgileri
                    </CardTitle>
                    <CardDescription>SEO analizi için canvas ürün bilgilerinizi girin</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Canvas Başlığı</label>
                      <Input
                        value={productTitle}
                        onChange={(e) => setProductTitle(e.target.value)}
                        placeholder="Minimalist Mountain Canvas Wall Art 16x20"
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">{productTitle.length}/140 karakter</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Tags (virgülle ayırın)</label>
                      <Input
                        value={productTags}
                        onChange={(e) => setProductTags(e.target.value)}
                        placeholder="wall art, canvas print, home decor, 16x20"
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {productTags.split(",").filter((t) => t.trim()).length}/13 tag
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Canvas Açıklaması</label>
                      <Textarea
                        value={productDescription}
                        onChange={(e) => setProductDescription(e.target.value)}
                        placeholder="Beautiful minimalist mountain landscape canvas perfect for modern home decor..."
                        rows={4}
                        className="mt-1"
                      />
                    </div>

                    <Button
                      onClick={handleAnalyze}
                      disabled={analyzing}
                      className="w-full bg-orange-600 hover:bg-orange-700"
                    >
                      {analyzing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Canvas Analiz Ediliyor...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          Canvas SEO Analizi Yap
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* SEO Score */}
                <Card className={getScoreBg(seoScore)}>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-4">
                        <div className="relative w-20 h-20">
                          <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#E5E7EB"
                              strokeWidth="2"
                            />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#F97316"
                              strokeWidth="2"
                              strokeDasharray={`${seoScore}, 100`}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-xl font-bold ${getScoreColor(seoScore)}`}>{seoScore}</span>
                          </div>
                        </div>
                      </div>
                      <h3 className="font-semibold text-lg">Canvas SEO Skoru</h3>
                      <p className="text-sm text-gray-600">
                        {seoScore >= 80
                          ? "Mükemmel canvas SEO!"
                          : seoScore >= 60
                            ? "İyi, ama daha da iyi olabilir"
                            : "Canvas'ın optimizasyon gerekli"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Canvas Specific Tips */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Lightbulb className="w-5 h-5 mr-2 text-orange-500" />
                      Canvas Wall Art SEO İpuçları
                    </CardTitle>
                    <CardDescription>Etsy'de canvas satışlarını artırmak için özel ipuçları</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="p-4 bg-orange-50 rounded-lg">
                          <h4 className="font-semibold text-orange-800 mb-2">🎯 Başlık Optimizasyonu</h4>
                          <ul className="text-sm text-orange-700 space-y-1">
                            <li>• "Canvas Wall Art" mutlaka kullan</li>
                            <li>• Boyutu belirt (16x20, 24x36 vs.)</li>
                            <li>• Stili ekle (Minimalist, Boho, Modern)</li>
                            <li>• "Print" kelimesini dahil et</li>
                          </ul>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <h4 className="font-semibold text-blue-800 mb-2">🏷️ En İyi Canvas Tagları</h4>
                          <ul className="text-sm text-blue-700 space-y-1">
                            <li>• wall art (en önemli)</li>
                            <li>• canvas print</li>
                            <li>• home decor</li>
                            <li>• [boyut] inch (16x20 inch)</li>
                            <li>• living room art</li>
                          </ul>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="p-4 bg-green-50 rounded-lg">
                          <h4 className="font-semibold text-green-800 mb-2">📝 Açıklama İpuçları</h4>
                          <ul className="text-sm text-green-700 space-y-1">
                            <li>• Malzeme kalitesini vurgula</li>
                            <li>• Hangi odaya uygun olduğunu söyle</li>
                            <li>• Asma talimatları ver</li>
                            <li>• Boyut seçeneklerini belirt</li>
                          </ul>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-lg">
                          <h4 className="font-semibold text-purple-800 mb-2">🎨 Canvas Kategorileri</h4>
                          <ul className="text-sm text-purple-700 space-y-1">
                            <li>• Abstract Canvas Art</li>
                            <li>• Nature & Landscape</li>
                            <li>• Minimalist Wall Art</li>
                            <li>• Boho Home Decor</li>
                            <li>• Modern Art Print</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
