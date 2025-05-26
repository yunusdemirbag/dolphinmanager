"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  ShoppingCart,
  Users,
  Package,
  Calendar,
  Download,
} from "lucide-react"
import CurrentStoreNameBadge from "../components/CurrentStoreNameBadge"

interface AnalyticsData {
  totalRevenue: number
  totalOrders: number
  totalViews: number
  totalProducts: number
  revenueChange: number
  ordersChange: number
  viewsChange: number
  conversionRate: number
  averageOrderValue: number
  topProducts: Array<{
    name: string
    sales: number
    revenue: number
  }>
  salesByMonth: Array<{
    month: string
    sales: number
    revenue: number
  }>
}

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [timeRange, setTimeRange] = useState("30d")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalyticsData()
  }, [timeRange])

  const loadAnalyticsData = async () => {
    setLoading(true)
    
    try {
      // Gerçek analytics verilerini API'den çek
      const response = await fetch('/api/analytics')
      
      if (response.ok) {
        const data = await response.json()
        setAnalyticsData(data)
      } else {
        // API hatası - boş veri göster
        setAnalyticsData({
          totalRevenue: 0,
          totalOrders: 0,
          totalViews: 0,
          totalProducts: 0,
          revenueChange: 0,
          ordersChange: 0,
          viewsChange: 0,
          conversionRate: 0,
          averageOrderValue: 0,
          topProducts: [],
          salesByMonth: []
        })
      }
    } catch (error) {
      console.error("Analytics API error:", error)
      // Hata durumunda boş veri göster
      setAnalyticsData({
        totalRevenue: 0,
        totalOrders: 0,
        totalViews: 0,
        totalProducts: 0,
        revenueChange: 0,
        ordersChange: 0,
        viewsChange: 0,
        conversionRate: 0,
        averageOrderValue: 0,
        topProducts: [],
        salesByMonth: []
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  if (loading || !analyticsData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-8 w-8 animate-pulse mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Analitik veriler yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <h1 className="text-2xl font-bold">Analytics</h1>
          <CurrentStoreNameBadge />
          <div className="text-gray-500 text-base mt-2 mb-2">Mağazanızın Performansını Analiz Edin Ve Büyüme Fırsatlarını Keşfedin.</div>
        </div>
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analitikler</h1>
            <p className="text-gray-600 mt-2">Mağaza performansınızı takip edin</p>
          </div>
          <div className="flex items-center space-x-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Son 7 gün</SelectItem>
                <SelectItem value="30d">Son 30 gün</SelectItem>
                <SelectItem value="90d">Son 90 gün</SelectItem>
                <SelectItem value="1y">Son 1 yıl</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Rapor İndir
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Toplam Gelir
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(analyticsData.totalRevenue)}</div>
              <div className={`text-sm flex items-center mt-1 ${
                analyticsData.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {analyticsData.revenueChange >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {formatPercentage(analyticsData.revenueChange)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Toplam Sipariş
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.totalOrders}</div>
              <div className={`text-sm flex items-center mt-1 ${
                analyticsData.ordersChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {analyticsData.ordersChange >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {formatPercentage(analyticsData.ordersChange)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <Eye className="h-4 w-4 mr-2" />
                Toplam Görüntülenme
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.totalViews.toLocaleString()}</div>
              <div className={`text-sm flex items-center mt-1 ${
                analyticsData.viewsChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {analyticsData.viewsChange >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {formatPercentage(analyticsData.viewsChange)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <Package className="h-4 w-4 mr-2" />
                Dönüşüm Oranı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.conversionRate}%</div>
              <div className="text-sm text-gray-500 mt-1">
                Ort. Sipariş: {formatCurrency(analyticsData.averageOrderValue)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle>En Çok Satan Ürünler</CardTitle>
              <CardDescription>Son {timeRange === '7d' ? '7 gün' : timeRange === '30d' ? '30 gün' : timeRange === '90d' ? '90 gün' : '1 yıl'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.sales} satış</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(product.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sales by Month */}
          <Card>
            <CardHeader>
              <CardTitle>Aylık Satış Trendi</CardTitle>
              <CardDescription>Son 4 ayın performansı</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.salesByMonth.map((month, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{month.month}</p>
                        <p className="text-sm text-gray-500">{month.sales} sipariş</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(month.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
} 