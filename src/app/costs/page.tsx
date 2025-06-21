"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DollarSign,
  Package,
  Truck,
  Calculator,
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  Save
} from "lucide-react"
import CurrentStoreNameBadge from "../components/CurrentStoreNameBadge"

interface Variation {
  id: string
  name: string
  type: "size" | "frame" | "material" | "orientation"
  values: string[]
}

interface CostItem {
  id: string
  variationCombination: string[]
  productionCost: number
  shippingCost: number
  etsyCommission: number
  totalCost: number
  sellingPrice?: number
  profit?: number
  profitMargin?: number
}

export default function CostsPage() {
  const [variations, setVariations] = useState<Variation[]>([])
  const [costItems, setCostItems] = useState<CostItem[]>([])
  const [usdToTry, setUsdToTry] = useState(38.93) // Güncel kur
  const [loadingRate, setLoadingRate] = useState(false)
  const [newVariation, setNewVariation] = useState({
    name: "",
    type: "size" as const,
    values: [""]
  })
  const [editingCost, setEditingCost] = useState<string | null>(null)
  const [currentStore, setCurrentStore] = useState<{ shop_name: string; shop_id: number } | null>(null)
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    loadCanvasVariations()
    loadCostData()
    fetchExchangeRate()
    loadCurrentStore()
  }, [])

  const loadCurrentStore = async () => {
    try {
      const response = await fetch('/api/etsy/stores')
      if (response.ok) {
        const data = await response.json()
        if (data.stores && data.stores.length > 0) {
          setCurrentStore(data.stores[0])
        }
      }
    } catch (error) {
      console.error("Error loading current store:", error)
    }
  }

  const fetchExchangeRate = async () => {
    setLoadingRate(true)
    try {
      const response = await fetch('/api/exchange-rate')
      if (response.ok) {
        const data = await response.json()
        setUsdToTry(data.rate)
      }
    } catch (error) {
      console.error("Exchange rate fetch error:", error)
    } finally {
      setLoadingRate(false)
    }
  }

  const loadCanvasVariations = () => {
    // Demo veri kaldırıldı - gerçek API'den veri çekilecek
    setVariations([])
  }

  const loadCostData = () => {
    // Demo veri kaldırıldı - gerçek API'den veri çekilecek
    setCostItems([])
  }

  const addNewVariation = () => {
    if (newVariation.name && newVariation.values[0]) {
      const variation: Variation = {
        id: Date.now().toString(),
        name: newVariation.name,
        type: newVariation.type,
        values: newVariation.values.filter(v => v.trim() !== "")
      }
      setVariations([...variations, variation])
      setNewVariation({ name: "", type: "size", values: [""] })
    }
  }

  const addValueToVariation = (variationId: string, value: string) => {
    setVariations(variations.map(v => 
      v.id === variationId 
        ? { ...v, values: [...v.values, value] }
        : v
    ))
  }

  const calculateTotalCost = (productionCost: number, shippingCost: number, sellingPrice: number) => {
    const etsyCommissionAmount = (sellingPrice * 6.5) / 100
    return productionCost + shippingCost + etsyCommissionAmount
  }

  const calculateProfit = (sellingPrice: number, totalCost: number) => {
    return sellingPrice - totalCost
  }

  const calculateProfitMargin = (profit: number, sellingPrice: number) => {
    return (profit / sellingPrice) * 100
  }

  const getProfitColor = (margin: number) => {
    if (margin >= 50) return "text-green-600"
    if (margin >= 30) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Maliyetler</h1>
          <div className="flex items-start gap-2 mt-2">
            {isClient && <CurrentStoreNameBadge shopName={currentStore?.shop_name} />}
          </div>
          <div className="text-gray-500 text-base mt-2 mb-2">Tüm Ürünlerinizin Maliyetlerini Kolayca Analiz Edin Ve Yönetin.</div>
        </div>

        <Tabs defaultValue="costs" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="costs">Maliyet Tablosu</TabsTrigger>
            <TabsTrigger value="variations">Varyasyonlar</TabsTrigger>
            <TabsTrigger value="calculator">Kar Hesaplayıcı</TabsTrigger>
          </TabsList>

          {/* Maliyet Tablosu */}
          <TabsContent value="costs">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2 text-blue-600" />
                  Varyasyon Bazlı Maliyetler
                </CardTitle>
                <CardDescription>
                  Tüm canvas wall art varyasyonları için detaylı maliyet analizi
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-4 py-2 text-left">Varyasyon</th>
                        <th className="border border-gray-200 px-4 py-2 text-left">Üretim ($)</th>
                        <th className="border border-gray-200 px-4 py-2 text-left">Kargo ($)</th>
                        <th className="border border-gray-200 px-4 py-2 text-left">Etsy Kom. ($)</th>
                        <th className="border border-gray-200 px-4 py-2 text-left">Toplam ($)</th>
                        <th className="border border-gray-200 px-4 py-2 text-left">Satış ($)</th>
                        <th className="border border-gray-200 px-4 py-2 text-left">Kar ($)</th>
                        <th className="border border-gray-200 px-4 py-2 text-left">Kar %</th>
                        <th className="border border-gray-200 px-4 py-2 text-left">TL Kar</th>
                        <th className="border border-gray-200 px-4 py-2 text-left">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-4 py-2">
                            <div className="space-y-1">
                              {item.variationCombination.map((variation, idx) => (
                                <Badge key={idx} variant="outline" className="mr-1">
                                  {variation}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="border border-gray-200 px-4 py-2">${item.productionCost}</td>
                          <td className="border border-gray-200 px-4 py-2">${item.shippingCost}</td>
                          <td className="border border-gray-200 px-4 py-2">
                            ${((item.sellingPrice || 0) * 6.5 / 100).toFixed(2)}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 font-semibold">
                            ${item.totalCost}
                          </td>
                          <td className="border border-gray-200 px-4 py-2">${item.sellingPrice}</td>
                          <td className="border border-gray-200 px-4 py-2 font-semibold">
                            ${item.profit}
                          </td>
                          <td className={`border border-gray-200 px-4 py-2 font-semibold ${getProfitColor(item.profitMargin || 0)}`}>
                            {item.profitMargin?.toFixed(1)}%
                          </td>
                          <td className="border border-gray-200 px-4 py-2 font-semibold text-green-600">
                            ₺{((item.profit || 0) * usdToTry).toFixed(2)}
                          </td>
                          <td className="border border-gray-200 px-4 py-2">
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline">
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Varyasyonlar */}
          <TabsContent value="variations">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Mevcut Varyasyonlar</CardTitle>
                  <CardDescription>Canvas wall art için tanımlı varyasyonlar</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {variations.map((variation) => (
                      <div key={variation.id} className="border rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">{variation.name}</h3>
                        <div className="flex flex-wrap gap-2">
                          {variation.values.map((value, idx) => (
                            <Badge key={idx} variant="secondary">
                              {value}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Yeni Varyasyon Ekle</CardTitle>
                  <CardDescription>Canvas için yeni varyasyon türü tanımlayın</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="variation-name">Varyasyon Adı</Label>
                      <Input
                        id="variation-name"
                        value={newVariation.name}
                        onChange={(e) => setNewVariation({...newVariation, name: e.target.value})}
                        placeholder="Örn: Boyut, Çerçeve, Malzeme"
                      />
                    </div>
                    <div>
                      <Label htmlFor="variation-type">Tür</Label>
                      <Select value={newVariation.type} onValueChange={(value: any) => setNewVariation({...newVariation, type: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="size">Boyut</SelectItem>
                          <SelectItem value="frame">Çerçeve</SelectItem>
                          <SelectItem value="material">Malzeme</SelectItem>
                          <SelectItem value="orientation">Yönelim</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="variation-values">Değerler (virgülle ayırın)</Label>
                      <Input
                        id="variation-values"
                        value={newVariation.values[0]}
                        onChange={(e) => setNewVariation({...newVariation, values: e.target.value.split(',')})}
                        placeholder="8x10 inch, 12x16 inch, 16x20 inch"
                      />
                    </div>
                    <Button onClick={addNewVariation} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Varyasyon Ekle
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Kar Hesaplayıcı */}
          <TabsContent value="calculator">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="h-5 w-5 mr-2 text-purple-600" />
                  Kar Hesaplayıcı
                </CardTitle>
                <CardDescription>
                  Yeni ürün için kar marjı hesaplayın
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Maliyet Bilgileri</h3>
                    <div>
                      <Label htmlFor="production-cost">Üretim Maliyeti ($)</Label>
                      <Input id="production-cost" type="number" placeholder="8.50" />
                    </div>
                    <div>
                      <Label htmlFor="shipping-cost">Kargo Maliyeti ($)</Label>
                      <Input id="shipping-cost" type="number" placeholder="3.20" />
                    </div>
                    <div>
                      <Label htmlFor="selling-price">Satış Fiyatı ($)</Label>
                      <Input id="selling-price" type="number" placeholder="25.99" />
                    </div>
                    <Button className="w-full">
                      <Calculator className="h-4 w-4 mr-2" />
                      Hesapla
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Hesaplama Sonuçları</h3>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                      <div className="flex justify-between">
                        <span>Etsy Komisyonu (6.5%):</span>
                        <span className="font-semibold">$1.69</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Toplam Maliyet:</span>
                        <span className="font-semibold">$13.39</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>Net Kar:</span>
                        <span className="font-semibold">$12.60</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>Kar Marjı:</span>
                        <span className="font-semibold">48.5%</span>
                      </div>
                      <div className="flex justify-between text-blue-600">
                        <span>TL Kar:</span>
                        <span className="font-semibold">₺434.70</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
