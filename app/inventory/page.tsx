"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Package,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Plus,
  Edit,
  Eye,
  BarChart3,
  DollarSign,
} from "lucide-react"

export default function InventoryPage() {
  const [selectedStore, setSelectedStore] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [inventoryData, setInventoryData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadInventoryData()
  }, [])

  const loadInventoryData = async () => {
    try {
      // Gerçek envanter verilerini API'den çek
      const response = await fetch('/api/etsy/inventory')
      
      if (response.ok) {
        const data = await response.json()
        setInventoryData(data.inventory || [])
      } else {
        // API hatası - boş liste göster
        setInventoryData([])
      }
    } catch (error) {
      console.error("Inventory API error:", error)
      // Hata durumunda boş liste göster
      setInventoryData([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "out_of_stock":
        return "bg-red-100 text-red-800 border-red-200"
      case "low_stock":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "in_stock":
        return "bg-green-100 text-green-800 border-green-200"
      case "overstocked":
        return "bg-blue-100 text-blue-800 border-blue-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "out_of_stock":
        return "Stokta Yok"
      case "low_stock":
        return "Düşük Stok"
      case "in_stock":
        return "Stokta Var"
      case "overstocked":
        return "Fazla Stok"
      default:
        return "Bilinmiyor"
    }
  }

  const calculateReorderSuggestion = (item: any) => {
    const weeksToReorder = (item.reorder_point - item.current_stock) / item.sales_velocity
    const suggestedQuantity = Math.ceil(item.sales_velocity * (item.lead_time / 7) + item.reorder_point)
    return { weeksToReorder: Math.max(0, weeksToReorder), suggestedQuantity }
  }

  const lowStockItems = inventoryData.filter((item) => item.status === "low_stock" || item.status === "out_of_stock")
  const totalValue = inventoryData.reduce((sum, item) => sum + item.current_stock * item.cost_price, 0)
  const totalItems = inventoryData.reduce((sum, item) => sum + item.current_stock, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Stok Yönetimi</h1>
                <p className="text-sm text-gray-600">Tüm mağazalarınızın stok durumunu takip edin</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Stokları Senkronize Et
              </Button>
              <Button className="bg-orange-600 hover:bg-orange-700">
                <Plus className="w-4 h-4 mr-2" />
                Yeni Ürün Ekle
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Stok Değeri</p>
                  <p className="text-2xl font-bold text-gray-900">₺{totalValue.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-full bg-orange-50">
                  <DollarSign className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Ürün</p>
                  <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-50">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Düşük Stok Uyarısı</p>
                  <p className="text-2xl font-bold text-gray-900">{lowStockItems.length}</p>
                </div>
                <div className="p-3 rounded-full bg-red-50">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Aktif Mağaza</p>
                  <p className="text-2xl font-bold text-gray-900">5</p>
                </div>
                <div className="p-3 rounded-full bg-green-50">
                  <BarChart3 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Alerts */}
        {lowStockItems.length > 0 && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>{lowStockItems.length} ürününüzde stok sorunu var!</strong> Hemen sipariş vermeyi düşünün.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="inventory" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="inventory">Stok Listesi</TabsTrigger>
            <TabsTrigger value="alerts">Stok Uyarıları</TabsTrigger>
            <TabsTrigger value="reorder">Sipariş Önerileri</TabsTrigger>
            <TabsTrigger value="analytics">Stok Analitikleri</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Stok Envanteri</CardTitle>
                    <CardDescription>Tüm ürünlerinizin stok durumu</CardDescription>
                  </div>
                  <div className="flex items-center space-x-4">
                    <select
                      value={selectedStore}
                      onChange={(e) => setSelectedStore(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="all">Tüm Mağazalar</option>
                      <option value="ArtisanCrafts">ArtisanCrafts</option>
                      <option value="CeramicStudio">CeramicStudio</option>
                      <option value="VintageFinds">VintageFinds</option>
                      <option value="WoodworkShop">WoodworkShop</option>
                    </select>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="all">Tüm Durumlar</option>
                      <option value="out_of_stock">Stokta Yok</option>
                      <option value="low_stock">Düşük Stok</option>
                      <option value="in_stock">Stokta Var</option>
                      <option value="overstocked">Fazla Stok</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3">Ürün</th>
                        <th className="text-center py-3">Mağaza</th>
                        <th className="text-center py-3">Mevcut Stok</th>
                        <th className="text-center py-3">Rezerve</th>
                        <th className="text-center py-3">Müsait</th>
                        <th className="text-center py-3">Durum</th>
                        <th className="text-center py-3">Satış Hızı</th>
                        <th className="text-center py-3">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryData.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="py-3">
                            <div>
                              <p className="font-medium">{item.title}</p>
                              <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                            </div>
                          </td>
                          <td className="text-center py-3">
                            <Badge variant="outline">{item.store}</Badge>
                          </td>
                          <td className="text-center py-3">
                            <span className="font-semibold">{item.current_stock}</span>
                          </td>
                          <td className="text-center py-3">{item.reserved_stock}</td>
                          <td className="text-center py-3">
                            <span className="font-medium">{item.available_stock}</span>
                          </td>
                          <td className="text-center py-3">
                            <Badge className={getStatusColor(item.status)}>{getStatusText(item.status)}</Badge>
                          </td>
                          <td className="text-center py-3">
                            <div className="flex items-center justify-center space-x-1">
                              {item.sales_velocity > 3 ? (
                                <TrendingUp className="w-4 h-4 text-green-600" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-600" />
                              )}
                              <span>{item.sales_velocity}/hafta</span>
                            </div>
                          </td>
                          <td className="text-center py-3">
                            <div className="flex items-center justify-center space-x-2">
                              <Button size="sm" variant="outline">
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <Eye className="w-3 h-3" />
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

          <TabsContent value="alerts">
            <div className="space-y-4">
              {lowStockItems.map((item) => (
                <Card key={item.id} className="border-l-4 border-l-red-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <AlertTriangle className="w-8 h-8 text-red-600" />
                        <div>
                          <h3 className="font-semibold text-lg">{item.title}</h3>
                          <p className="text-gray-600">
                            {item.store} • SKU: {item.sku}
                          </p>
                          <div className="flex items-center space-x-4 mt-2">
                            <Badge className={getStatusColor(item.status)}>{getStatusText(item.status)}</Badge>
                            <span className="text-sm text-gray-600">
                              Mevcut: {item.current_stock} • Minimum: {item.reorder_point}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Button className="bg-orange-600 hover:bg-orange-700">
                          <Plus className="w-4 h-4 mr-2" />
                          Sipariş Ver
                        </Button>
                        <p className="text-sm text-gray-600 mt-2">
                          Önerilen: {calculateReorderSuggestion(item).suggestedQuantity} adet
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reorder">
            <Card>
              <CardHeader>
                <CardTitle>Akıllı Sipariş Önerileri</CardTitle>
                <CardDescription>AI destekli stok yenileme önerileri</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {inventoryData
                    .filter((item) => item.current_stock <= item.reorder_point)
                    .map((item) => {
                      const suggestion = calculateReorderSuggestion(item)
                      return (
                        <div key={item.id} className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{item.title}</h4>
                              <p className="text-sm text-gray-600">{item.store}</p>
                              <div className="flex items-center space-x-4 mt-2 text-sm">
                                <span>Mevcut Stok: {item.current_stock}</span>
                                <span>Satış Hızı: {item.sales_velocity}/hafta</span>
                                <span>Tedarik Süresi: {item.lead_time} gün</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-orange-600">
                                {suggestion.suggestedQuantity} adet
                              </div>
                              <p className="text-sm text-gray-600">
                                Maliyet: ₺{(suggestion.suggestedQuantity * item.cost_price).toLocaleString()}
                              </p>
                              <Button size="sm" className="mt-2 bg-orange-600 hover:bg-orange-700">
                                Sipariş Oluştur
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Stok Dönüş Hızı</CardTitle>
                  <CardDescription>Ürünlerinizin satış performansı</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {inventoryData
                      .sort((a, b) => b.sales_velocity - a.sales_velocity)
                      .map((item, index) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                                index < 2 ? "bg-green-500" : index < 4 ? "bg-yellow-500" : "bg-red-500"
                              }`}
                            >
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{item.title}</p>
                              <p className="text-sm text-gray-600">{item.store}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{item.sales_velocity}/hafta</p>
                            <p className="text-sm text-gray-600">Stok: {item.current_stock}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Kategori Bazlı Analiz</CardTitle>
                  <CardDescription>Kategorilere göre stok dağılımı</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(
                      inventoryData.reduce((acc, item) => {
                        if (!acc[item.category]) {
                          acc[item.category] = { count: 0, value: 0, items: [] }
                        }
                        acc[item.category].count += item.current_stock
                        acc[item.category].value += item.current_stock * item.cost_price
                        acc[item.category].items.push(item)
                        return acc
                      }, {} as any),
                    ).map(([category, data]: [string, any]) => (
                      <div key={category} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{category}</p>
                            <p className="text-sm text-gray-600">{data.items.length} ürün türü</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{data.count} adet</p>
                            <p className="text-sm text-gray-600">₺{data.value.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
