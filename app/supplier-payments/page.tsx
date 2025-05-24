"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Package, CheckCircle, Clock, AlertTriangle, Calculator, CreditCard } from "lucide-react"

interface SupplierOrder {
  id: string
  order_number: string
  product_title: string
  size: string
  quantity: number
  unit_cost: number
  total_cost: number
  supplier: string
  order_date: string
  due_date: string
  status: "pending" | "paid" | "overdue"
  store_name: string
  customer_order_id: string
}

export default function SupplierPaymentsPage() {
  const [supplierOrders, setSupplierOrders] = useState<SupplierOrder[]>([])
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterSupplier, setFilterSupplier] = useState("all")
  const [exchangeRate] = useState(34.5) // USD/TL kuru

  useEffect(() => {
    loadSupplierOrders()
  }, [])

  const loadSupplierOrders = () => {
    // Maliyetler sayfasından boyut bilgilerini al ve sipariş verilerini oluştur
    const mockSupplierOrders: SupplierOrder[] = [
      {
        id: "1",
        order_number: "SUP-2024-001",
        product_title: "Minimalist Mountain Canvas",
        size: "16x20 inch",
        quantity: 5,
        unit_cost: 8.0,
        total_cost: 40.0,
        supplier: "Canvas Pro Printing",
        order_date: "2024-01-25",
        due_date: "2024-02-05",
        status: "pending",
        store_name: "ArtisanCrafts",
        customer_order_id: "ETY-2024-001",
      },
      {
        id: "2",
        order_number: "SUP-2024-002",
        product_title: "Boho Sunset Canvas",
        size: "24x36 inch",
        quantity: 3,
        unit_cost: 15.0,
        total_cost: 45.0,
        supplier: "Premium Canvas Co",
        order_date: "2024-01-24",
        due_date: "2024-02-03",
        status: "pending",
        store_name: "BohoArt",
        customer_order_id: "ETY-2024-002",
      },
      {
        id: "3",
        order_number: "SUP-2024-003",
        product_title: "Abstract Geometric Print",
        size: "12x16 inch",
        quantity: 2,
        unit_cost: 5.5,
        total_cost: 11.0,
        supplier: "Quick Print Solutions",
        order_date: "2024-01-22",
        due_date: "2024-01-30",
        status: "overdue",
        store_name: "ModernArt",
        customer_order_id: "ETY-2024-003",
      },
      {
        id: "4",
        order_number: "SUP-2024-004",
        product_title: "Vintage Car Poster",
        size: "8x10 inch",
        quantity: 10,
        unit_cost: 3.5,
        total_cost: 35.0,
        supplier: "Budget Print House",
        order_date: "2024-01-20",
        due_date: "2024-01-28",
        status: "paid",
        store_name: "VintageFinds",
        customer_order_id: "ETY-2024-004",
      },
      {
        id: "5",
        order_number: "SUP-2024-005",
        product_title: "Nature Landscape Canvas",
        size: "30x40 inch",
        quantity: 1,
        unit_cost: 25.0,
        total_cost: 25.0,
        supplier: "Premium Canvas Co",
        order_date: "2024-01-26",
        due_date: "2024-02-10",
        status: "pending",
        store_name: "NatureArt",
        customer_order_id: "ETY-2024-005",
      },
    ]

    setSupplierOrders(mockSupplierOrders)
  }

  const markAsPaid = (orderIds: string[]) => {
    setSupplierOrders(
      supplierOrders.map((order) => (orderIds.includes(order.id) ? { ...order, status: "paid" as const } : order)),
    )
    setSelectedOrders([])
  }

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders((prev) => (prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]))
  }

  const getStatusColor = (status: SupplierOrder["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "paid":
        return "bg-green-100 text-green-800"
      case "overdue":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: SupplierOrder["status"]) => {
    switch (status) {
      case "pending":
        return "Bekliyor"
      case "paid":
        return "Ödendi"
      case "overdue":
        return "Gecikmiş"
      default:
        return "Bilinmiyor"
    }
  }

  const getStatusIcon = (status: SupplierOrder["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />
      case "paid":
        return <CheckCircle className="h-4 w-4" />
      case "overdue":
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const filteredOrders = supplierOrders.filter((order) => {
    const statusMatch = filterStatus === "all" || order.status === filterStatus
    const supplierMatch = filterSupplier === "all" || order.supplier === filterSupplier
    return statusMatch && supplierMatch
  })

  const stats = {
    total_orders: supplierOrders.length,
    pending_orders: supplierOrders.filter((o) => o.status === "pending").length,
    overdue_orders: supplierOrders.filter((o) => o.status === "overdue").length,
    paid_orders: supplierOrders.filter((o) => o.status === "paid").length,
    total_debt_usd: supplierOrders
      .filter((o) => o.status === "pending" || o.status === "overdue")
      .reduce((sum, order) => sum + order.total_cost, 0),
    total_debt_tl: 0,
  }

  stats.total_debt_tl = stats.total_debt_usd * exchangeRate

  const suppliers = [...new Set(supplierOrders.map((order) => order.supplier))]

  const selectedOrdersTotal = supplierOrders
    .filter((order) => selectedOrders.includes(order.id))
    .reduce((sum, order) => sum + order.total_cost, 0)

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-8 w-8 text-orange-500" />
            Üretici Ödemeleri
          </h1>
          <p className="text-gray-600 mt-2">Tüm mağazalarınızın üretici borçlarını takip edin</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">USD/TL Kuru</div>
          <div className="text-2xl font-bold text-green-600">₺{exchangeRate}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-orange-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.total_orders}</div>
            <div className="text-sm text-gray-600">Toplam Sipariş</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending_orders}</div>
            <div className="text-sm text-gray-600">Bekleyen</div>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.overdue_orders}</div>
            <div className="text-sm text-gray-600">Gecikmiş</div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.paid_orders}</div>
            <div className="text-sm text-gray-600">Ödenen</div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-4 text-center">
            <div className="text-lg font-bold text-gray-900">${stats.total_debt_usd.toFixed(2)}</div>
            <div className="text-lg font-bold text-red-600">₺{stats.total_debt_tl.toFixed(2)}</div>
            <div className="text-sm text-gray-600">Toplam Borç</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-4">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Durum filtrele" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  <SelectItem value="pending">Bekleyen</SelectItem>
                  <SelectItem value="overdue">Gecikmiş</SelectItem>
                  <SelectItem value="paid">Ödenen</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterSupplier} onValueChange={setFilterSupplier}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Üretici filtrele" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Üreticiler</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier} value={supplier}>
                      {supplier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedOrders.length > 0 && (
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  Seçilen: {selectedOrders.length} sipariş (${selectedOrdersTotal.toFixed(2)})
                </div>
                <Button onClick={() => markAsPaid(selectedOrders)} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Ödendi İşaretle
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-500" />
            Üretici Siparişleri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">
                    <Checkbox
                      checked={
                        filteredOrders.length > 0 && filteredOrders.every((order) => selectedOrders.includes(order.id))
                      }
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedOrders(filteredOrders.map((order) => order.id))
                        } else {
                          setSelectedOrders([])
                        }
                      }}
                    />
                  </th>
                  <th className="text-left p-3">Sipariş</th>
                  <th className="text-left p-3">Ürün</th>
                  <th className="text-left p-3">Üretici</th>
                  <th className="text-center p-3">Adet</th>
                  <th className="text-right p-3">Birim ($)</th>
                  <th className="text-right p-3">Toplam ($)</th>
                  <th className="text-right p-3">Toplam (₺)</th>
                  <th className="text-center p-3">Vade</th>
                  <th className="text-center p-3">Durum</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <Checkbox
                        checked={selectedOrders.includes(order.id)}
                        onCheckedChange={() => toggleOrderSelection(order.id)}
                        disabled={order.status === "paid"}
                      />
                    </td>
                    <td className="p-3">
                      <div>
                        <div className="font-medium">{order.order_number}</div>
                        <div className="text-sm text-gray-600">{order.store_name}</div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div>
                        <div className="font-medium">{order.product_title}</div>
                        <div className="text-sm text-gray-600">{order.size}</div>
                      </div>
                    </td>
                    <td className="p-3">{order.supplier}</td>
                    <td className="text-center p-3">{order.quantity}</td>
                    <td className="text-right p-3">${order.unit_cost.toFixed(2)}</td>
                    <td className="text-right p-3 font-semibold">${order.total_cost.toFixed(2)}</td>
                    <td className="text-right p-3 font-semibold text-green-600">
                      ₺{(order.total_cost * exchangeRate).toFixed(2)}
                    </td>
                    <td className="text-center p-3">
                      <div className="text-sm">{new Date(order.due_date).toLocaleDateString("tr-TR")}</div>
                      {order.status === "overdue" && (
                        <div className="text-xs text-red-600">
                          {Math.ceil(
                            (new Date().getTime() - new Date(order.due_date).getTime()) / (1000 * 60 * 60 * 24),
                          )}{" "}
                          gün gecikmiş
                        </div>
                      )}
                    </td>
                    <td className="text-center p-3">
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1">{getStatusText(order.status)}</span>
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Supplier Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-orange-500" />
            Üretici Bazlı Özet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((supplier) => {
              const supplierOrders = filteredOrders.filter((order) => order.supplier === supplier)
              const totalDebt = supplierOrders
                .filter((order) => order.status !== "paid")
                .reduce((sum, order) => sum + order.total_cost, 0)
              const overdueCount = supplierOrders.filter((order) => order.status === "overdue").length

              return (
                <Card key={supplier} className="border-gray-200">
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2">{supplier}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Toplam Sipariş:</span>
                        <span>{supplierOrders.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bekleyen Borç:</span>
                        <span className="font-semibold">${totalDebt.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>TL Karşılığı:</span>
                        <span className="font-semibold text-green-600">₺{(totalDebt * exchangeRate).toFixed(2)}</span>
                      </div>
                      {overdueCount > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Gecikmiş:</span>
                          <span className="font-semibold">{overdueCount} sipariş</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
