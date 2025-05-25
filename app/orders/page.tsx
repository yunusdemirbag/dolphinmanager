"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ShoppingCart,
  Package,
  Truck,
  CheckCircle,
  Clock,
  DollarSign,
  User,
  MapPin,
  Calendar,
  Eye,
  MessageSquare,
} from "lucide-react"

interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  product_title: string
  product_image: string
  quantity: number
  price: number
  total: number
  status: "new" | "in_production" | "shipped" | "delivered"
  order_date: string
  estimated_delivery: string
  shipping_address: string
  store_name: string
  notes?: string
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterStore, setFilterStore] = useState("all")

  useEffect(() => {
    loadOrders()
  }, [])

  useEffect(() => {
    filterOrders()
  }, [orders, filterStatus, filterStore])

  const loadOrders = async () => {
    try {
      // Gerçek sipariş verilerini API'den çek
      const response = await fetch('/api/etsy/orders')
      
      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders || [])
      } else {
        // API hatası - boş liste göster
        setOrders([])
      }
    } catch (error) {
      console.error("Orders API error:", error)
      // Hata durumunda boş liste göster
      setOrders([])
    }
  }

  const filterOrders = () => {
    let filtered = orders

    if (filterStatus !== "all") {
      filtered = filtered.filter((order) => order.status === filterStatus)
    }

    if (filterStore !== "all") {
      filtered = filtered.filter((order) => order.store_name === filterStore)
    }

    setFilteredOrders(filtered)
  }

  const updateOrderStatus = (orderId: string, newStatus: Order["status"]) => {
    setOrders(orders.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order)))
  }

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800"
      case "in_production":
        return "bg-yellow-100 text-yellow-800"
      case "shipped":
        return "bg-purple-100 text-purple-800"
      case "delivered":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: Order["status"]) => {
    switch (status) {
      case "new":
        return "Yeni Sipariş"
      case "in_production":
        return "Üretime Eklendi"
      case "shipped":
        return "Kargoda"
      case "delivered":
        return "Teslim Edildi"
      default:
        return "Bilinmiyor"
    }
  }

  const getStatusIcon = (status: Order["status"]) => {
    switch (status) {
      case "new":
        return <Clock className="h-4 w-4" />
      case "in_production":
        return <Package className="h-4 w-4" />
      case "shipped":
        return <Truck className="h-4 w-4" />
      case "delivered":
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getNextStatus = (currentStatus: Order["status"]): Order["status"] | null => {
    switch (currentStatus) {
      case "new":
        return "in_production"
      case "in_production":
        return "shipped"
      case "shipped":
        return "delivered"
      default:
        return null
    }
  }

  const getNextStatusText = (currentStatus: Order["status"]): string => {
    const nextStatus = getNextStatus(currentStatus)
    return nextStatus ? getStatusText(nextStatus) : ""
  }

  const orderStats = {
    total: orders.length,
    new: orders.filter((o) => o.status === "new").length,
    in_production: orders.filter((o) => o.status === "in_production").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    total_revenue: orders.reduce((sum, order) => sum + order.total, 0),
  }

  const stores = [...new Set(orders.map((order) => order.store_name))]

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="h-8 w-8 text-orange-500" />
            Sipariş Yönetimi
          </h1>
          <p className="text-gray-600 mt-2">Tüm mağazalarınızın siparişlerini takip edin</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="border-orange-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{orderStats.total}</div>
            <div className="text-sm text-gray-600">Toplam</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{orderStats.new}</div>
            <div className="text-sm text-gray-600">Yeni</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{orderStats.in_production}</div>
            <div className="text-sm text-gray-600">Üretimde</div>
          </CardContent>
        </Card>
        <Card className="border-purple-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{orderStats.shipped}</div>
            <div className="text-sm text-gray-600">Kargoda</div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{orderStats.delivered}</div>
            <div className="text-sm text-gray-600">Teslim</div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">${orderStats.total_revenue.toFixed(2)}</div>
            <div className="text-sm text-gray-600">Toplam</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Durum filtrele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value="new">Yeni Sipariş</SelectItem>
                <SelectItem value="in_production">Üretime Eklendi</SelectItem>
                <SelectItem value="shipped">Kargoda</SelectItem>
                <SelectItem value="delivered">Teslim Edildi</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStore} onValueChange={setFilterStore}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Mağaza filtrele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Mağazalar</SelectItem>
                {stores.map((store) => (
                  <SelectItem key={store} value={store}>
                    {store}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.map((order) => (
          <Card key={order.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Product Info */}
                <div className="flex items-start space-x-4 flex-1">
                  <img
                    src={order.product_image || "/placeholder.svg"}
                    alt={order.product_title}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{order.product_title}</h3>
                        <p className="text-gray-600">Sipariş: {order.order_number}</p>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1">{getStatusText(order.status)}</span>
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {order.customer_name}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {order.shipping_address}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(order.order_date).toLocaleDateString("tr-TR")}
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />${order.total}
                      </div>
                    </div>
                    {order.notes && (
                      <div className="mt-2 p-2 bg-yellow-50 rounded text-sm text-yellow-800">
                        <MessageSquare className="h-3 w-3 inline mr-1" />
                        {order.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col space-y-2 lg:w-48">
                  <Badge variant="outline" className="justify-center">
                    {order.store_name}
                  </Badge>
                  {getNextStatus(order.status) && (
                    <Button
                      onClick={() => updateOrderStatus(order.id, getNextStatus(order.status)!)}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {getNextStatusText(order.status)}
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    <Eye className="h-3 w-3 mr-1" />
                    Detaylar
                  </Button>
                  <Button variant="outline" size="sm">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Mesaj Gönder
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
