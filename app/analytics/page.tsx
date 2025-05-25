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
    
    // Mock analytics data
    const mockData: AnalyticsData = {
      totalRevenue: 2847.50,
      totalOrders: 142,
      totalViews: 8420,
      totalProducts: 25,
      revenueChange: 12.5,
      ordersChange: 8.3,
      viewsChange: -2.1,
      conversionRate: 1.69,
      averageOrderValue: 20.05,
      topProducts: [
        { name: "Minimalist Mountain Canvas", sales: 45, revenue: 1349.55 },
        { name: "Boho Sunset Canvas Print", sales: 32, revenue: 1119.68 },
        { name: "Abstract Geometric Art", sales: 18, revenue: 449.82 },
        { name: "Vintage Car Poster", sales: 12, revenue: 239.88 },
        { name: "Nature Photography Print", sales: 8, revenue: 199.92 },
      ],
      salesByMonth: [
        { month: "Oca", sales: 28, revenue: 560.50 },
        { month: "Şub", sales: 35, revenue: 742.30 },
        { month: "Mar", sales: 42, revenue: 891.20 },
        { month: "Nis", sales: 38, revenue: 653.50 },
      ]
    }

    setTimeout(() => {
      setAnalyticsData(mockData)
      setLoading(false)
    }, 1000)
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