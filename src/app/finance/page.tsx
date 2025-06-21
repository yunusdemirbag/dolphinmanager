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
import CurrentStoreNameBadge from "../components/CurrentStoreNameBadge"

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
  const [currentStore, setCurrentStore] = useState<{ shop_name: string; shop_id: number } | null>(null)
  const [isClient, setIsClient] = useState(false);
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
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<{
    totalRevenue: number
    totalOrders: number
    averageOrderValue: number
    profitMargin: number
  }>({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    profitMargin: 0
  })

  useEffect(() => {
    setIsClient(true);
    loadCurrentStore()
    loadFinanceData()
    fetchExchangeRate()
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

  const loadFinanceData = async () => {
    setLoading(true)
    try {
      // Gerçek Etsy finansal verilerini çek
      const response = await fetch('/api/etsy/stats')
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.connected && data.store) {
          // Etsy verilerinden store finance objesi oluştur
          const storeFinance: StoreFinance = {
            id: data.store.shop_id.toString(),
            storeName: data.store.shop_name,
            totalSales: data.revenue || 0,
            etsyCommissions: data.fees || 0,
            productionCosts: 0, // Bu veri Etsy'de yok, ayrı hesaplanmalı
            shippingCosts: 0, // Bu veri Etsy'de yok, ayrı hesaplanmalı
            netProfit: data.net_revenue || 0,
            profitMargin: data.revenue > 0 ? ((data.net_revenue || 0) / data.revenue * 100) : 0,
            status: (data.net_revenue || 0) > 0 ? "profit" : (data.net_revenue || 0) < 0 ? "loss" : "neutral",
            expectedPayment: data.net_revenue || 0,
            nextPaymentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 gün sonra
            pendingOrders: data.orders || 0
          }

          setStoreFinances([storeFinance])

          // Genel özet güncelle
          setSummary(prev => ({
            ...prev,
            totalBalance: data.net_revenue || 0,
            expectedIncome: data.revenue || 0,
            pendingExpenses: data.fees || 0,
            netPosition: data.net_revenue || 0
          }))
        } else {
          // Etsy bağlı değil - boş veri
          setStoreFinances([])
          setSummary(prev => ({
            ...prev,
            totalBalance: 0,
            expectedIncome: 0,
            pendingExpenses: 0,
            netPosition: 0
          }))
        }
      } else {
        console.error('Failed to fetch financial data')
        setStoreFinances([])
      }
    } catch (error) {
      console.error('Error loading financial data:', error)
      setStoreFinances([])
    } finally {
      setLoading(false)
    }
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Finans</h1>
          <div className="flex items-start gap-2 mt-2">
            {isClient && <CurrentStoreNameBadge shopName={currentStore?.shop_name} />}
          </div>
          <div className="text-gray-500 text-base mt-2 mb-2">Mağazanızın Finansal Performansını Detaylıca İnceleyin.</div>
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
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}