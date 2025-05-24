"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CreditCard,
  Wallet,
  Building2,
  AlertCircle,
  CheckCircle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"

interface StoreFinance {
  storeId: string
  storeName: string
  totalSales: number
  etsyCommission: number
  supplierCosts: number
  netProfit: number
  pendingPayments: number
  lastPaymentDate: string
  status: "positive" | "negative" | "neutral"
  currency: "USD" | "TL"
}

interface FinanceSummary {
  totalBalance: number
  expectedIncome: number
  pendingExpenses: number
  netPosition: number
  exchangeRate: number
}

export default function FinancePage() {
  const [storeFinances, setStoreFinances] = useState<StoreFinance[]>([])
  const [summary, setSummary] = useState<FinanceSummary>({
    totalBalance: 0,
    expectedIncome: 0,
    pendingExpenses: 0,
    netPosition: 0,
    exchangeRate: 34.5,
  })
  const [selectedPeriod, setSelectedPeriod] = useState("thisMonth")

  useEffect(() => {
    loadFinanceData()
  }, [selectedPeriod])

  const loadFinanceData = async () => {
    // Örnek mağaza finansal verileri
    const mockStoreData: StoreFinance[] = [
      {
        storeId: "store1",
        storeName: "Canvas Dreams Studio",
        totalSales: 2450.0,
        etsyCommission: 159.25,
        supplierCosts: 980.0,
        netProfit: 1310.75,
        pendingPayments: 340.0,
        lastPaymentDate: "2025-01-20",
        status: "positive",
        currency: "USD",
      },
      {
        storeId: "store2",
        storeName: "Minimalist Wall Art",
        totalSales: 1890.0,
        etsyCommission: 122.85,
        supplierCosts: 756.0,
        netProfit: 1011.15,
        pendingPayments: 280.0,
        lastPaymentDate: "2025-01-18",
        status: "positive",
        currency: "USD",
      },
      {
        storeId: "store3",
        storeName: "Boho Canvas Co",
        totalSales: 890.0,
        etsyCommission: 57.85,
        supplierCosts: 445.0,
        netProfit: 387.15,
        pendingPayments: 120.0,
        lastPaymentDate: "2025-01-15",
        status: "positive",
        currency: "USD",
      },
      {
        storeId: "store4",
        storeName: "Abstract Art Hub",
        totalSales: 450.0,
        etsyCommission: 29.25,
        supplierCosts: 380.0,
        netProfit: 40.75,
        pendingPayments: 85.0,
        lastPaymentDate: "2025-01-10",
        status: "neutral",
        currency: "USD",
      },
      {
        storeId: "store5",
        storeName: "Vintage Canvas Store",
        totalSales: 320.0,
        etsyCommission: 20.8,
        supplierCosts: 340.0,
        netProfit: -40.8,
        pendingPayments: 45.0,
        lastPaymentDate: "2025-01-08",
        status: "negative",
        currency: "USD",
      },
    ]

    setStoreFinances(mockStoreData)

    // Özet hesaplama
    const totalSales = mockStoreData.reduce((sum, store) => sum + store.totalSales, 0)
    const totalCommissions = mockStoreData.reduce((sum, store) => sum + store.etsyCommission, 0)
    const totalCosts = mockStoreData.reduce((sum, store) => sum + store.supplierCosts, 0)
    const totalPending = mockStoreData.reduce((sum, store) => sum + store.pendingPayments, 0)
    const netProfit = mockStoreData.reduce((sum, store) => sum + store.netProfit, 0)

    setSummary({
      totalBalance: netProfit,
      expectedIncome: totalPending,
      pendingExpenses: 1250.0, // Bekleyen üretici ödemeleri
      netPosition: netProfit + totalPending - 1250.0,
      exchangeRate: 34.5,
    })
  }

  const formatCurrency = (amount: number, currency: "USD" | "TL" = "USD") => {
    if (currency === "USD") {
      return `$${amount.toFixed(2)}`
    }
    return `₺${(amount * summary.exchangeRate).toFixed(2)}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "positive":
        return "text-green-600 bg-green-50 border-green-200"
      case "negative":
        return "text-red-600 bg-red-50 border-red-200"
      default:
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "positive":
        return <TrendingUp className="w-4 h-4" />
      case "negative":
        return <TrendingDown className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  const positiveStores = storeFinances.filter((store) => store.status === "positive")
  const negativeStores = storeFinances.filter((store) => store.status === "negative")
  const neutralStores = storeFinances.filter((store) => store.status === "neutral")

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="h-8 w-8 text-green-500" />
            Finans Yönetimi
          </h1>
          <p className="text-gray-600 mt-2">Tüm mağazalarının finansal durumu ve beklenen gelirler</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm text-gray-500">USD/TL Kuru</div>
            <div className="text-xl font-bold text-blue-600">₺{summary.exchangeRate}</div>
          </div>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="thisMonth">Bu Ay</option>
            <option value="lastMonth">Geçen Ay</option>
            <option value="last3Months">Son 3 Ay</option>
            <option value="thisYear">Bu Yıl</option>
          </select>
        </div>
      </div>

      {/* Genel Özet */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Toplam Bakiye</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(summary.totalBalance)}</p>
                <p className="text-sm text-green-600">{formatCurrency(summary.totalBalance, "TL")}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <Wallet className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Beklenen Gelir</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(summary.expectedIncome)}</p>
                <p className="text-sm text-blue-600">{formatCurrency(summary.expectedIncome, "TL")}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Bekleyen Giderler</p>
                <p className="text-2xl font-bold text-orange-900">{formatCurrency(summary.pendingExpenses)}</p>
                <p className="text-sm text-orange-600">{formatCurrency(summary.pendingExpenses, "TL")}</p>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <CreditCard className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`border-2 ${summary.netPosition >= 0 ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${summary.netPosition >= 0 ? "text-green-700" : "text-red-700"}`}>
                  Net Durum
                </p>
                <p className={`text-2xl font-bold ${summary.netPosition >= 0 ? "text-green-900" : "text-red-900"}`}>
                  {formatCurrency(summary.netPosition)}
                </p>
                <p className={`text-sm ${summary.netPosition >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(summary.netPosition, "TL")}
                </p>
              </div>
              <div className={`p-3 rounded-full ${summary.netPosition >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                {summary.netPosition >= 0 ? (
                  <ArrowUpRight className="w-6 h-6 text-green-600" />
                ) : (
                  <ArrowDownRight className="w-6 h-6 text-red-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all-stores" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all-stores">Tüm Mağazalar ({storeFinances.length})</TabsTrigger>
          <TabsTrigger value="positive" className="text-green-600">
            Kârda ({positiveStores.length})
          </TabsTrigger>
          <TabsTrigger value="negative" className="text-red-600">
            Zararda ({negativeStores.length})
          </TabsTrigger>
          <TabsTrigger value="neutral" className="text-yellow-600">
            Nötr ({neutralStores.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all-stores">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {storeFinances.map((store) => (
              <Card key={store.storeId} className={`border-2 ${getStatusColor(store.status)}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-5 h-5" />
                      <CardTitle className="text-lg">{store.storeName}</CardTitle>
                    </div>
                    <Badge variant="outline" className={getStatusColor(store.status)}>
                      {getStatusIcon(store.status)}
                      <span className="ml-1">
                        {store.status === "positive" ? "Kârda" : store.status === "negative" ? "Zararda" : "Nötr"}
                      </span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Toplam Satış</p>
                      <p className="text-lg font-semibold">{formatCurrency(store.totalSales)}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(store.totalSales, "TL")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Net Kâr</p>
                      <p
                        className={`text-lg font-semibold ${store.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {formatCurrency(store.netProfit)}
                      </p>
                      <p className="text-xs text-gray-500">{formatCurrency(store.netProfit, "TL")}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Etsy Komisyonu:</span>
                      <span className="text-red-600">-{formatCurrency(store.etsyCommission)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Üretici Maliyeti:</span>
                      <span className="text-red-600">-{formatCurrency(store.supplierCosts)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-gray-600">Bekleyen Ödeme:</span>
                      <span className="text-blue-600">{formatCurrency(store.pendingPayments)}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Son Ödeme:</span>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span>{new Date(store.lastPaymentDate).toLocaleDateString("tr-TR")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Kar Marjı Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Kar Marjı</span>
                      <span className="font-medium">{((store.netProfit / store.totalSales) * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={Math.max(0, (store.netProfit / store.totalSales) * 100)} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="positive">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {positiveStores.map((store) => (
              <Card key={store.storeId} className="border-2 border-green-200 bg-green-50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <CardTitle className="text-lg text-green-900">{store.storeName}</CardTitle>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Kârda
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(store.netProfit)}</p>
                    <p className="text-sm text-green-700">Net Kâr</p>
                    <p className="text-xs text-gray-600 mt-1">{formatCurrency(store.netProfit, "TL")}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="negative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {negativeStores.map((store) => (
              <Card key={store.storeId} className="border-2 border-red-200 bg-red-50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <CardTitle className="text-lg text-red-900">{store.storeName}</CardTitle>
                    </div>
                    <Badge className="bg-red-100 text-red-800">
                      <TrendingDown className="w-3 h-3 mr-1" />
                      Zararda
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(Math.abs(store.netProfit))}</p>
                    <p className="text-sm text-red-700">Net Zarar</p>
                    <p className="text-xs text-gray-600 mt-1">{formatCurrency(Math.abs(store.netProfit), "TL")}</p>
                  </div>
                  <div className="mt-4 p-3 bg-red-100 rounded-lg">
                    <p className="text-xs text-red-700">
                      ⚠️ Bu mağaza için acil eylem gerekli! Maliyetleri gözden geçir veya fiyatları artır.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="neutral">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {neutralStores.map((store) => (
              <Card key={store.storeId} className="border-2 border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <CardTitle className="text-lg text-yellow-900">{store.storeName}</CardTitle>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Nötr
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">{formatCurrency(store.netProfit)}</p>
                    <p className="text-sm text-yellow-700">Düşük Kâr</p>
                    <p className="text-xs text-gray-600 mt-1">{formatCurrency(store.netProfit, "TL")}</p>
                  </div>
                  <div className="mt-4 p-3 bg-yellow-100 rounded-lg">
                    <p className="text-xs text-yellow-700">
                      💡 Bu mağaza için optimizasyon fırsatı var! SEO ve fiyat stratejisini gözden geçir.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Beklenen Gelirler Detayı */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Beklenen Gelirler Detayı
          </CardTitle>
          <CardDescription>Etsy'den gelecek ödemeler ve tahmini tarihler</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Bu Hafta</h4>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(485.0)}</p>
                <p className="text-sm text-blue-700">3 mağazadan</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-900 mb-2">Gelecek Hafta</h4>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(365.0)}</p>
                <p className="text-sm text-green-700">2 mağazadan</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="font-medium text-purple-900 mb-2">Ay Sonu</h4>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(summary.expectedIncome)}</p>
                <p className="text-sm text-purple-700">Toplam beklenen</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
