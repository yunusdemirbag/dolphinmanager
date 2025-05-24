"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts"
import { TrendingUp, TrendingDown, Star, DollarSign, Eye, ShoppingBag, ArrowRight, Users, Package } from "lucide-react"
import { useRouter } from "next/navigation"

export default function StoreAnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30d")
  const router = useRouter()

  // Enhanced mock data with more realistic Etsy store information
  const stores = [
    {
      id: "1",
      shop_name: "ArtisanCrafts",
      listing_active_count: 45,
      num_favorers: 1250,
      review_average: 4.8,
      review_count: 156,
      revenue: 12450,
      views: 8900,
      favorites: 234,
      orders: 89,
      conversion_rate: 1.2,
      trend: "up",
      category: "Home & Living",
      avg_order_value: 140,
      return_rate: 2.1,
    },
    {
      id: "2",
      shop_name: "VintageFinds",
      listing_active_count: 32,
      num_favorers: 890,
      review_average: 4.6,
      review_count: 98,
      revenue: 8750,
      views: 5600,
      favorites: 167,
      orders: 56,
      conversion_rate: 1.0,
      trend: "down",
      category: "Clothing",
      avg_order_value: 156,
      return_rate: 3.2,
    },
    {
      id: "3",
      shop_name: "HandmadeJewelry",
      listing_active_count: 28,
      num_favorers: 2100,
      review_average: 4.9,
      review_count: 203,
      revenue: 15600,
      views: 12300,
      favorites: 445,
      orders: 112,
      conversion_rate: 0.9,
      trend: "up",
      category: "Jewelry",
      avg_order_value: 139,
      return_rate: 1.8,
    },
    {
      id: "4",
      shop_name: "CeramicStudio",
      listing_active_count: 67,
      num_favorers: 1580,
      review_average: 4.7,
      review_count: 234,
      revenue: 18900,
      views: 15600,
      favorites: 567,
      orders: 145,
      conversion_rate: 1.4,
      trend: "up",
      category: "Home & Living",
      avg_order_value: 130,
      return_rate: 2.5,
    },
    {
      id: "5",
      shop_name: "WoodworkShop",
      listing_active_count: 23,
      num_favorers: 456,
      review_average: 4.5,
      review_count: 67,
      revenue: 5200,
      views: 3400,
      favorites: 89,
      orders: 23,
      conversion_rate: 0.7,
      trend: "down",
      category: "Home & Living",
      avg_order_value: 226,
      return_rate: 1.2,
    },
  ]

  const chartData = stores.map((store) => ({
    name: store.shop_name,
    revenue: store.revenue,
    orders: store.orders,
    views: store.views,
    conversion: store.conversion_rate,
    avg_order: store.avg_order_value,
  }))

  const pieData = stores.map((store) => ({
    name: store.shop_name,
    value: store.revenue,
  }))

  const trendData = [
    { month: "Oca", total_revenue: 45000, total_orders: 320 },
    { month: "Şub", total_revenue: 52000, total_orders: 380 },
    { month: "Mar", total_revenue: 48000, total_orders: 350 },
    { month: "Nis", total_revenue: 61000, total_orders: 425 },
    { month: "May", total_revenue: 55000, total_orders: 390 },
    { month: "Haz", total_revenue: 67000, total_orders: 465 },
  ]

  const COLORS = ["#F97316", "#3B82F6", "#10B981", "#8B5CF6", "#EF4444"]

  const totalRevenue = stores.reduce((sum, store) => sum + store.revenue, 0)
  const totalOrders = stores.reduce((sum, store) => sum + store.orders, 0)
  const totalViews = stores.reduce((sum, store) => sum + store.views, 0)
  const avgConversion = stores.reduce((sum, store) => sum + store.conversion_rate, 0) / stores.length
  const totalProducts = stores.reduce((sum, store) => sum + store.listing_active_count, 0)
  const totalFollowers = stores.reduce((sum, store) => sum + store.num_favorers, 0)

  const handleSwitchToStore = (storeId: string) => {
    localStorage.setItem("selectedStore", storeId)
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 flex items-center justify-center">
                <img src="/dolphin-logo.svg" alt="Dolphin Manager" className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Tüm Mağaza Analitikleri</h1>
                <p className="text-sm text-gray-600">{stores.length} mağaza karşılaştırması ve trend analizi</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="7d">Son 7 Gün</option>
                <option value="30d">Son 30 Gün</option>
                <option value="90d">Son 90 Gün</option>
                <option value="1y">Son 1 Yıl</option>
              </select>
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                Dashboard'a Dön
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <Card className="border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Gelir</p>
                  <p className="text-2xl font-bold text-gray-900">₺{totalRevenue.toLocaleString()}</p>
                  <p className="text-sm text-green-600">+12% bu ay</p>
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
                  <p className="text-sm font-medium text-gray-600">Toplam Sipariş</p>
                  <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
                  <p className="text-sm text-blue-600">+8% bu ay</p>
                </div>
                <div className="p-3 rounded-full bg-blue-50">
                  <ShoppingBag className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Görüntülenme</p>
                  <p className="text-2xl font-bold text-gray-900">{totalViews.toLocaleString()}</p>
                  <p className="text-sm text-purple-600">+15% bu ay</p>
                </div>
                <div className="p-3 rounded-full bg-purple-50">
                  <Eye className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ortalama Dönüşüm</p>
                  <p className="text-2xl font-bold text-gray-900">%{avgConversion.toFixed(1)}</p>
                  <p className="text-sm text-orange-600">-0.2% bu ay</p>
                </div>
                <div className="p-3 rounded-full bg-green-50">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-indigo-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Ürün</p>
                  <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
                  <p className="text-sm text-indigo-600">5 mağaza</p>
                </div>
                <div className="p-3 rounded-full bg-indigo-50">
                  <Package className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-pink-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Takipçi</p>
                  <p className="text-2xl font-bold text-gray-900">{totalFollowers.toLocaleString()}</p>
                  <p className="text-sm text-pink-600">+3% bu ay</p>
                </div>
                <div className="p-3 rounded-full bg-pink-50">
                  <Users className="w-6 h-6 text-pink-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
            <TabsTrigger value="performance">Performans</TabsTrigger>
            <TabsTrigger value="comparison">Karşılaştırma</TabsTrigger>
            <TabsTrigger value="trends">Trendler</TabsTrigger>
            <TabsTrigger value="stores">Mağazalar</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Store Performance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stores.map((store, index) => (
                <Card key={store.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-orange-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                          <img src="/dolphin-logo.svg" alt="Store" className="w-6 h-6 opacity-70" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{store.shop_name}</h3>
                          <p className="text-sm text-gray-600">{store.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {store.trend === "up" ? (
                          <TrendingUp className="w-5 h-5 text-green-600" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-600" />
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleSwitchToStore(store.id)}
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                          <ArrowRight className="w-3 h-3 mr-1" />
                          Geç
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-lg font-semibold text-green-900">₺{store.revenue.toLocaleString()}</p>
                        <p className="text-xs text-green-600">Gelir</p>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-lg font-semibold text-blue-900">{store.orders}</p>
                        <p className="text-xs text-blue-600">Sipariş</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Görüntülenme:</span>
                        <span className="font-medium">{store.views.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Dönüşüm:</span>
                        <span className="font-medium">%{store.conversion_rate}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Ortalama Sipariş:</span>
                        <span className="font-medium">₺{store.avg_order_value}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Değerlendirme:</span>
                        <div className="flex items-center space-x-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-current" />
                          <span className="font-medium">{store.review_average}</span>
                          <span className="text-gray-500">({store.review_count})</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gelir Dağılımı</CardTitle>
                  <CardDescription>Mağazalar arası gelir karşılaştırması</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`₺${value.toLocaleString()}`, "Gelir"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performans Karşılaştırması</CardTitle>
                  <CardDescription>Mağaza bazlı sipariş analizi</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="orders" fill="#F97316" name="Siparişler" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Dönüşüm Oranları</CardTitle>
                  <CardDescription>Mağaza bazlı dönüşüm performansı</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="conversion" stroke="#10B981" strokeWidth={2} name="Dönüşüm %" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ortalama Sipariş Değeri</CardTitle>
                  <CardDescription>Mağaza bazlı AOV karşılaştırması</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`₺${value}`, "AOV"]} />
                      <Bar dataKey="avg_order" fill="#8B5CF6" name="Ortalama Sipariş" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="comparison">
            <Card>
              <CardHeader>
                <CardTitle>Detaylı Karşılaştırma</CardTitle>
                <CardDescription>Tüm metriklerin yan yana karşılaştırması</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3">Mağaza</th>
                        <th className="text-center py-3">Gelir</th>
                        <th className="text-center py-3">Siparişler</th>
                        <th className="text-center py-3">Görüntülenme</th>
                        <th className="text-center py-3">Dönüşüm</th>
                        <th className="text-center py-3">AOV</th>
                        <th className="text-center py-3">Değerlendirme</th>
                        <th className="text-center py-3">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stores.map((store) => (
                        <tr key={store.id} className="border-b hover:bg-gray-50">
                          <td className="py-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                <img src="/dolphin-logo.svg" alt="Store" className="w-5 h-5 opacity-70" />
                              </div>
                              <div>
                                <span className="font-medium">{store.shop_name}</span>
                                <p className="text-xs text-gray-500">{store.category}</p>
                              </div>
                            </div>
                          </td>
                          <td className="text-center py-3 font-semibold">₺{store.revenue.toLocaleString()}</td>
                          <td className="text-center py-3">{store.orders}</td>
                          <td className="text-center py-3">{store.views.toLocaleString()}</td>
                          <td className="text-center py-3">%{store.conversion_rate}</td>
                          <td className="text-center py-3">₺{store.avg_order_value}</td>
                          <td className="text-center py-3">
                            <div className="flex items-center justify-center space-x-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              <span>{store.review_average}</span>
                            </div>
                          </td>
                          <td className="text-center py-3">
                            <Button
                              size="sm"
                              onClick={() => handleSwitchToStore(store.id)}
                              className="bg-orange-600 hover:bg-orange-700 text-white"
                            >
                              <ArrowRight className="w-3 h-3 mr-1" />
                              Geç
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

          <TabsContent value="trends">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>6 Aylık Trend Analizi</CardTitle>
                  <CardDescription>Tüm mağazaların toplam performans trendi</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="total_revenue"
                        stackId="1"
                        stroke="#F97316"
                        fill="#F97316"
                        fillOpacity={0.6}
                        name="Gelir"
                      />
                      <Area
                        type="monotone"
                        dataKey="total_orders"
                        stackId="2"
                        stroke="#3B82F6"
                        fill="#3B82F6"
                        fillOpacity={0.6}
                        name="Siparişler"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>En İyi Performans</CardTitle>
                    <CardDescription>Bu ayki en başarılı mağazalar</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {stores
                        .sort((a, b) => b.revenue - a.revenue)
                        .slice(0, 3)
                        .map((store, index) => (
                          <div key={store.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                                  index === 0 ? "bg-yellow-500" : index === 1 ? "bg-gray-400" : "bg-orange-500"
                                }`}
                              >
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium">{store.shop_name}</p>
                                <p className="text-sm text-gray-600">₺{store.revenue.toLocaleString()}</p>
                              </div>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => handleSwitchToStore(store.id)}>
                              <ArrowRight className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Gelişim Gereken Alanlar</CardTitle>
                    <CardDescription>Dikkat edilmesi gereken mağazalar</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {stores
                        .filter((store) => store.trend === "down" || store.conversion_rate < 1.0)
                        .map((store) => (
                          <div key={store.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <TrendingDown className="w-6 h-6 text-red-600" />
                              <div>
                                <p className="font-medium">{store.shop_name}</p>
                                <p className="text-sm text-red-600">Dönüşüm: %{store.conversion_rate}</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSwitchToStore(store.id)}
                              className="border-red-300 text-red-700 hover:bg-red-50"
                            >
                              <ArrowRight className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stores">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stores.map((store) => (
                <Card key={store.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                          <img src="/dolphin-logo.svg" alt="Store" className="w-6 h-6 opacity-70" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{store.shop_name}</h3>
                          <p className="text-sm text-gray-600">{store.category}</p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`${
                          store.trend === "up" ? "border-green-300 text-green-700" : "border-red-300 text-red-700"
                        }`}
                      >
                        {store.trend === "up" ? "Yükseliş" : "Düşüş"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-2 bg-orange-50 rounded-lg">
                        <p className="text-lg font-bold text-orange-900">₺{store.revenue.toLocaleString()}</p>
                        <p className="text-xs text-orange-600">Gelir</p>
                      </div>
                      <div className="text-center p-2 bg-blue-50 rounded-lg">
                        <p className="text-lg font-bold text-blue-900">{store.orders}</p>
                        <p className="text-xs text-blue-600">Sipariş</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Ürünler:</span>
                        <span className="font-medium">{store.listing_active_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Takipçiler:</span>
                        <span className="font-medium">{store.num_favorers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Dönüşüm:</span>
                        <span className="font-medium">%{store.conversion_rate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>İade Oranı:</span>
                        <span className="font-medium">%{store.return_rate}</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleSwitchToStore(store.id)}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Bu Mağazaya Geç
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
