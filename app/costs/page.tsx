"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calculator, DollarSign, Combine, Plus, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase"

interface Variation {
  id: string
  name: string
  type: "size" | "color" | "style" | "material"
  values: string[]
  isCommon: boolean
}

interface CostItem {
  id: string
  variationId: string
  variationValue: string
  productionCost: number
  shippingCost: number
  etsyCommission: number
  notes?: string
}

interface ExchangeRate {
  usd: number
  lastUpdated: string
}

export default function CostsPage() {
  const [variations, setVariations] = useState<Variation[]>([])
  const [costItems, setCostItems] = useState<CostItem[]>([])
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate>({ usd: 34.5, lastUpdated: new Date().toISOString() })
  const [selectedVariations, setSelectedVariations] = useState<string[]>([])
  const [newCost, setNewCost] = useState({
    variationId: "",
    variationValue: "",
    productionCost: 0,
    shippingCost: 0,
    etsyCommission: 6.5,
  })

  useEffect(() => {
    loadVariations()
    loadCostItems()
    loadExchangeRate()
  }, [])

  const loadVariations = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      // Mağazadaki tüm ürünlerden varyasyonları çek
      const { data: products } = await supabase.from("products").select("tags").eq("user_id", user.id)

      // Canvas wall art için tipik varyasyonlar
      const commonVariations: Variation[] = [
        {
          id: "size",
          name: "Boyut",
          type: "size",
          values: ["8x10 inch", "12x16 inch", "16x20 inch", "18x24 inch", "24x36 inch", "30x40 inch"],
          isCommon: true,
        },
        {
          id: "frame",
          name: "Çerçeve",
          type: "style",
          values: ["Çerçevesiz", "Siyah Çerçeve", "Beyaz Çerçeve", "Ahşap Çerçeve", "Altın Çerçeve"],
          isCommon: true,
        },
        {
          id: "material",
          name: "Malzeme",
          type: "material",
          values: ["Canvas", "Poster Kağıt", "Premium Canvas", "Metal Print", "Akrilik"],
          isCommon: true,
        },
        {
          id: "orientation",
          name: "Yönelim",
          type: "style",
          values: ["Dikey", "Yatay", "Kare"],
          isCommon: true,
        },
      ]

      setVariations(commonVariations)
    }
  }

  const loadCostItems = async () => {
    // Örnek maliyet verileri
    const sampleCosts: CostItem[] = [
      {
        id: "1",
        variationId: "size",
        variationValue: "8x10 inch",
        productionCost: 3.5,
        shippingCost: 2.0,
        etsyCommission: 6.5,
      },
      {
        id: "2",
        variationId: "size",
        variationValue: "16x20 inch",
        productionCost: 8.0,
        shippingCost: 4.5,
        etsyCommission: 6.5,
      },
    ]
    setCostItems(sampleCosts)
  }

  const loadExchangeRate = async () => {
    try {
      // Gerçek API'den kur bilgisi al (örnek)
      setExchangeRate({
        usd: 34.5,
        lastUpdated: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Kur bilgisi alınamadı:", error)
    }
  }

  const addCostItem = () => {
    if (newCost.variationId && newCost.variationValue) {
      const costItem: CostItem = {
        id: Date.now().toString(),
        ...newCost,
      }
      setCostItems([...costItems, costItem])
      setNewCost({
        variationId: "",
        variationValue: "",
        productionCost: 0,
        shippingCost: 0,
        etsyCommission: 6.5,
      })
    }
  }

  const deleteCostItem = (id: string) => {
    setCostItems(costItems.filter((item) => item.id !== id))
  }

  const combineVariations = () => {
    if (selectedVariations.length >= 2) {
      // Seçilen varyasyonları birleştir
      const combinedName = selectedVariations.map((id) => variations.find((v) => v.id === id)?.name).join(" + ")

      alert(`${combinedName} varyasyonları birleştirildi!`)
      setSelectedVariations([])
    }
  }

  const calculateTotalCost = (item: CostItem) => {
    const total = item.productionCost + item.shippingCost
    return total
  }

  const calculateTotalCostTL = (item: CostItem) => {
    return calculateTotalCost(item) * exchangeRate.usd
  }

  const getVariationName = (id: string) => {
    return variations.find((v) => v.id === id)?.name || id
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Calculator className="h-8 w-8 text-orange-500" />
            Maliyet Yönetimi
          </h1>
          <p className="text-gray-600 mt-2">Varyasyonlara göre üretim, kargo ve komisyon maliyetleri</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">USD/TL Kuru</div>
          <div className="text-2xl font-bold text-green-600">₺{exchangeRate.usd}</div>
          <div className="text-xs text-gray-400">{new Date(exchangeRate.lastUpdated).toLocaleString("tr-TR")}</div>
        </div>
      </div>

      <Tabs defaultValue="costs" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="costs">Maliyet Tablosu</TabsTrigger>
          <TabsTrigger value="variations">Varyasyon Yönetimi</TabsTrigger>
          <TabsTrigger value="calculator">Kar Hesaplayıcı</TabsTrigger>
        </TabsList>

        <TabsContent value="costs" className="space-y-6">
          {/* Yeni Maliyet Ekleme */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-orange-500" />
                Yeni Maliyet Ekle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="variation">Varyasyon</Label>
                  <Select
                    value={newCost.variationId}
                    onValueChange={(value) => setNewCost({ ...newCost, variationId: value, variationValue: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {variations.map((variation) => (
                        <SelectItem key={variation.id} value={variation.id}>
                          {variation.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="value">Değer</Label>
                  <Select
                    value={newCost.variationValue}
                    onValueChange={(value) => setNewCost({ ...newCost, variationValue: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {newCost.variationId &&
                        variations
                          .find((v) => v.id === newCost.variationId)
                          ?.values.map((value) => (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="production">Üretim ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newCost.productionCost}
                    onChange={(e) => setNewCost({ ...newCost, productionCost: Number.parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="shipping">Kargo ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newCost.shippingCost}
                    onChange={(e) => setNewCost({ ...newCost, shippingCost: Number.parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={addCostItem} className="w-full bg-orange-500 hover:bg-orange-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Ekle
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Maliyet Tablosu */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-orange-500" />
                Maliyet Tablosu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Varyasyon</th>
                      <th className="text-left p-3">Değer</th>
                      <th className="text-right p-3">Üretim ($)</th>
                      <th className="text-right p-3">Kargo ($)</th>
                      <th className="text-right p-3">Etsy (%)</th>
                      <th className="text-right p-3">Toplam ($)</th>
                      <th className="text-right p-3">Toplam (₺)</th>
                      <th className="text-center p-3">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costItems.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <Badge variant="outline">{getVariationName(item.variationId)}</Badge>
                        </td>
                        <td className="p-3">{item.variationValue}</td>
                        <td className="text-right p-3">${item.productionCost.toFixed(2)}</td>
                        <td className="text-right p-3">${item.shippingCost.toFixed(2)}</td>
                        <td className="text-right p-3">{item.etsyCommission}%</td>
                        <td className="text-right p-3 font-semibold">${calculateTotalCost(item).toFixed(2)}</td>
                        <td className="text-right p-3 font-semibold text-green-600">
                          ₺{calculateTotalCostTL(item).toFixed(2)}
                        </td>
                        <td className="text-center p-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteCostItem(item.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Combine className="h-5 w-5 text-orange-500" />
                Varyasyon Birleştirme
              </CardTitle>
              <CardDescription>Ortak varyasyonları birleştirerek yeni kombinasyonlar oluşturun</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {variations.map((variation) => (
                    <div key={variation.id} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={variation.id}
                          checked={selectedVariations.includes(variation.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedVariations([...selectedVariations, variation.id])
                            } else {
                              setSelectedVariations(selectedVariations.filter((id) => id !== variation.id))
                            }
                          }}
                        />
                        <Label htmlFor={variation.id} className="font-semibold">
                          {variation.name}
                        </Label>
                      </div>
                      <div className="text-sm text-gray-600">
                        {variation.values.slice(0, 3).join(", ")}
                        {variation.values.length > 3 && "..."}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedVariations.length >= 2 && (
                  <Button onClick={combineVariations} className="bg-orange-500 hover:bg-orange-600">
                    <Combine className="h-4 w-4 mr-2" />
                    Seçilen Varyasyonları Birleştir ({selectedVariations.length})
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-orange-500" />
                Kar Hesaplayıcı
              </CardTitle>
              <CardDescription>Satış fiyatı ve kar marjı hesaplamaları</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Maliyet Bilgileri</h3>
                  <div className="space-y-2">
                    <Label>Üretim Maliyeti ($)</Label>
                    <Input type="number" step="0.01" placeholder="5.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Kargo Maliyeti ($)</Label>
                    <Input type="number" step="0.01" placeholder="3.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Hedef Kar Marjı (%)</Label>
                    <Input type="number" placeholder="40" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Hesaplanan Değerler</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span>Toplam Maliyet:</span>
                      <span className="font-semibold">$8.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Etsy Komisyonu (6.5%):</span>
                      <span className="font-semibold">$0.78</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Önerilen Satış Fiyatı:</span>
                      <span className="font-semibold text-green-600">$15.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Net Kar:</span>
                      <span className="font-semibold text-green-600">$6.22</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kar Marjı:</span>
                      <span className="font-semibold text-green-600">41.5%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
