"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Store,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard
} from "lucide-react"

interface StoreFinance {
  id: string
  storeName: string
  totalSales: number
  etsyCommissions: number
  productionCosts: number
  shippingCosts: number
  netProfit: number
  profitMargin: number
  status: "profit" | "loss" | "neutral"
  expectedPayment: number
  nextPaymentDate: string
  pendingOrders: number
}

interface FinancialSummary {
  totalBalance: number
  expectedIncome: number
  pendingExpenses: number
  netPosition: number
  usdToTry: number
}

export default function FinancePage() {
  const [storeFinances, setStoreFinances] = useState<StoreFinance[]>([])
  const [summary, setSummary] = useState<FinancialSummary>({
    totalBalance: 0,
    expectedIncome: 0,
    pendingExpenses: 0,
    netPosition: 0,
    usdToTry: 38.93
  })
  const [loading, setLoading] = useState(true)
  const [loadingRate, setLoadingRate] = useState(false)

  useEffect(() => {
    loadFinancialData()
    fetchExchangeRate()
  }, [])

  const loadFinancialData = () => {
    // Canvas wall art mağazaları için örnek finansal veriler
    const mockStoreData: StoreFinance[] = [
      {
        id: "1",
        storeName: "Canvas Dreams Studio",
        totalSales: 2450.80,
        etsyCommissions: 159.30,
        productionCosts: 980.50,
        shippingCosts: 245.20,
        netProfit: 1065.80,
        profitMargin: 43.5,
        status: "profit",
        expectedPayment: 1890.50,
        nextPaymentDate: "2024-12-28",
        pendingOrders: 12
      },
      {
        id: "2",
        storeName: "Modern Wall Art Co",
        totalSales: 1820.40,
        etsyCommissions: 118.30,
        productionCosts: 890.20,
        shippingCosts: 182.10,
        netProfit: 629.80,
        profitMargin: 34.6,
        status: "profit",
        expectedPayment: 1402.10,
        nextPaymentDate: "2024-12-30",
        pendingOrders: 8
      },
      {
        id: "3",
        storeName: "Minimalist Canvas",
        totalSales: 980.60,
        etsyCommissions: 63.74,
        productionCosts: 520.30,
        shippingCosts: 98.20,
        netProfit: 298.36,
        profitMargin: 30.4,
        status: "neutral",
        expectedPayment: 756.86,
        nextPaymentDate: "2025-01-02",
        pendingOrders: 5
      },
      {
        id: "4",
        storeName: "Vintage Prints Hub",
        totalSales: 650.20,
        etsyCommissions: 42.26,
        productionCosts: 480.80,
        shippingCosts: 85.40,
        netProfit: 41.74,
        profitMargin: 6.4,
        status: "loss",
        expectedPayment: 507.94,
        nextPaymentDate: "2025-01-05",
        pendingOrders: 3
      },
      {
        id: "5",
        storeName: "Nature Canvas Art",
        totalSales: 1560.90,
        etsyCommissions: 101.46,
        productionCosts: 720.40,
        shippingCosts: 156.20,
        netProfit: 582.84,
        profitMargin: 37.3,
        status: "profit",
        expectedPayment: 1204.44,
        nextPaymentDate: "2024-12-29",
        pendingOrders: 9
      }
    ]

    setStoreFinances(mockStoreData)

    // Genel özet hesapla
    const totalBalance = mockStoreData.reduce((sum, store) => sum + store.netProfit, 0)
    const expectedIncome = mockStoreData.reduce((sum, store) => sum + store.expectedPayment, 0)
    const pendingExpenses = mockStoreData.reduce((sum, store) => sum + store.productionCosts, 0) * 0.3 // Bekleyen üretici ödemeleri
    const netPosition = totalBalance + expectedIncome - pendingExpenses

    setSummary({
      totalBalance,
      expectedIncome,
      pendingExpenses,
      netPosition,
      usdToTry: 38.93
    })

    setLoading(false)
  }

  const fetchExchangeRate = async () => {
    setLoadingRate(true)
    try {
      const response = await fetch('/api/exchange-rate')
      if (response.ok) {
        const data = await response.json()
        setSummary(prev => ({ ...prev, usdToTry: data.rate }))
      }
    } catch (error) {
      console.error("Exchange rate fetch error:", error)
    } finally {
      setLoadingRate(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "profit": return "bg-green-100 text-green-800 border-green-200"
      case "loss": return "bg-red-100 text-red-800 border-red-200"
      case "neutral": return "bg-yellow-100 text-yellow-800 border-yellow-200"
      default: return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "profit": return <TrendingUp className="h-4 w-4" />
      case "loss": return <TrendingDown className="h-4 w-4" />
      case "neutral": return <Clock className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const formatCurrency = (amount: number, currency: "USD" | "TRY" = "USD") => {
    if (currency === "TRY") {
      return `₺${(amount * summary.usdToTry).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
    }
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  }

  const getDaysUntilPayment = (dateString: string) => {
    const paymentDate = new Date(dateString)
    const today = new Date()
    const diffTime = paymentDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <DollarSign className="h-12 w-12 animate-pulse text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Finansal veriler yükleniyor...</p>
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
              <DollarSign className="h-8 w-8 text-green-600 mr-3" />
              Finans
            </h1>
            <p className="text-gray-600 mt-2">Canvas wall art mağazalarınızın finansal durumu</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">USD/TRY Kuru</div>
            <div className="text-xl font-bold text-blue-600">₺{summary.usdToTry}</div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Toplam Bakiye</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalBalance)}</div>
              <div className="text-sm text-gray-500">{formatCurrency(summary.totalBalance, "TRY")}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Beklenen Gelir</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.expectedIncome)}</div>
              <div className="text-sm text-gray-500">{formatCurrency(summary.expectedIncome, "TRY")}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Bekleyen Giderler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.pendingExpenses)}</div>
              <div className="text-sm text-gray-500">{formatCurrency(summary.pendingExpenses, "TRY")}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Net Durum</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.netPosition >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.netPosition)}
              </div>
              <div className="text-sm text-gray-500">{formatCurrency(summary.netPosition, "TRY")}</div>
            </CardContent>
          </Card>
        </div>

        {/* Store-wise Financial Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {storeFinances.map((store) => (
            <Card key={store.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Store className="h-5 w-5 mr-2 text-blue-600" />
                    {store.storeName}
                  </CardTitle>
                  <Badge className={getStatusColor(store.status)}>
                    {getStatusIcon(store.status)}
                    <span className="ml-1">
                      {store.status === 'profit' ? 'Kârda' : store.status === 'loss' ? 'Zararda' : 'Nötr'}
                    </span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Financial Metrics */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Toplam Satış:</span>
                      <div className="font-semibold">{formatCurrency(store.totalSales)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Net Kâr:</span>
                      <div className={`font-semibold ${store.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(store.netProfit)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Etsy Komisyon:</span>
                      <div className="font-semibold text-red-600">{formatCurrency(store.etsyCommissions)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Kâr Marjı:</span>
                      <div className={`font-semibold ${store.profitMargin >= 30 ? 'text-green-600' : store.profitMargin >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {store.profitMargin.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Profit Margin Progress */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Kâr Marjı</span>
                      <span className="font-semibold">{store.profitMargin.toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={store.profitMargin} 
                      className="h-2"
                    />
                  </div>

                  {/* Expected Payment */}
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-600">Beklenen Ödeme</div>
                        <div className="font-semibold text-blue-600">{formatCurrency(store.expectedPayment)}</div>
                        <div className="text-xs text-gray-500">{formatCurrency(store.expectedPayment, "TRY")}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Tarih</div>
                        <div className="font-semibold">{new Date(store.nextPaymentDate).toLocaleDateString('tr-TR')}</div>
                        <div className="text-xs text-gray-500">
                          {getDaysUntilPayment(store.nextPaymentDate)} gün kaldı
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pending Orders */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Bekleyen Sipariş:</span>
                    <Badge variant="outline">{store.pendingOrders} adet</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Upcoming Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-purple-600" />
              Yaklaşan Ödemeler
            </CardTitle>
            <CardDescription>
              Bu hafta ve gelecek hafta beklenen Etsy ödemeleri
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {storeFinances
                .sort((a, b) => new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime())
                .map((store) => {
                  const daysUntil = getDaysUntilPayment(store.nextPaymentDate)
                  return (
                    <div key={store.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CreditCard className="h-5 w-5 text-green-600" />
                        <div>
                          <div className="font-semibold">{store.storeName}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(store.nextPaymentDate).toLocaleDateString('tr-TR')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">{formatCurrency(store.expectedPayment)}</div>
                        <div className="text-sm text-gray-500">
                          {daysUntil === 0 ? 'Bugün' : daysUntil === 1 ? 'Yarın' : `${daysUntil} gün`}
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
