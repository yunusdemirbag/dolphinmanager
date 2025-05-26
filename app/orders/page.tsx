"use client"

import React, { useState, useEffect } from "react"
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
  Search,
  Download,
  FilterIcon,
  RefreshCw,
  XCircle,
  Edit,
  MoreHorizontal,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import CurrentStoreNameBadge from "../components/CurrentStoreNameBadge"

// Düzenlenebilir hücreler için interface'ler
interface EditableCellProps {
  value: string | number;
  onChange: (value: string) => void;
}

interface EditableLinkProps {
  text: string;
  href: string;
  onChange: (text: string, href: string) => void;
}

// Düzenlenebilir hücreler için component
const EditableCell = ({ value, onChange }: EditableCellProps) => {
  const [editing, setEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(String(value || ""));
  
  const handleEdit = () => {
    setEditing(true);
  };
  
  const handleBlur = () => {
    setEditing(false);
    if (currentValue !== String(value)) {
      onChange(currentValue);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  };
  
  return editing ? (
    <input
      className="w-full p-1 border rounded"
      value={currentValue}
      onChange={(e) => setCurrentValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      autoFocus
    />
  ) : (
    <div onClick={handleEdit} className="cursor-pointer hover:bg-gray-100 p-1 rounded">
      {currentValue || "-"}
    </div>
  );
};

// Düzenlenebilir link component'i
const EditableLink = ({ text, href, onChange }: EditableLinkProps) => {
  const [editing, setEditing] = useState(false);
  const [currentText, setCurrentText] = useState(text || "Link");
  const [currentHref, setCurrentHref] = useState(href || "#");
  
  const handleEdit = () => {
    setEditing(true);
  };
  
  const handleBlur = () => {
    setEditing(false);
    if (currentText !== text || currentHref !== href) {
      onChange(currentText, currentHref);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  };
  
  return editing ? (
    <div className="space-y-1">
      <input
        className="w-full p-1 border rounded text-sm"
        value={currentText}
        onChange={(e) => setCurrentText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Link Metni"
      />
      <input
        className="w-full p-1 border rounded text-sm"
        value={currentHref}
        onChange={(e) => setCurrentHref(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="URL (https://...)"
        autoFocus
      />
    </div>
  ) : (
    <a 
      href={currentHref} 
      className="text-blue-600 hover:underline"
      onClick={(e: React.MouseEvent) => {
        e.preventDefault();
        handleEdit();
      }}
    >
      {currentText}
    </a>
  );
};

// Sipariş türü tanımı - yeni API formatı ile uyumlu
interface Order {
  order_id: number
  shop_id: number
  buyer_name: string
  order_total: number
  currency_code: string
  status: string
  created_at: string
  updated_at: string
  items_count: number
  shipping_address: string
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedOrders, setSelectedOrders] = useState<number[]>([])
  const [dataSource, setDataSource] = useState<string>("loading")
  
  // Durum değiştirme için state
  const [statusChangeOrder, setStatusChangeOrder] = useState<Order | null>(null)
  const [showStatusDialog, setShowStatusDialog] = useState(false)

  // Değişiklikler için state ekleyelim
  const [editedOrders, setEditedOrders] = useState({});
  
  // Bir hücreyi güncelleme fonksiyonu
  const updateOrderField = (orderId, field, value) => {
    setEditedOrders(prev => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        [field]: value
      }
    }));
    
    console.log(`Sipariş #${orderId} güncellendi - ${field}: ${value}`);
    // Burada backend'e değişiklikleri gönderebilirsiniz
  };
  
  // Link güncelleme fonksiyonu
  const updateOrderLink = (orderId, field, text, href) => {
    setEditedOrders(prev => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        [`${field}_text`]: text,
        [`${field}_href`]: href
      }
    }));
    
    console.log(`Sipariş #${orderId} link güncellendi - ${field}: ${text} (${href})`);
  };

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      // Şu an için shopId'yi manuel veriyoruz, ileride dinamik alınabilir
      const shopId = 1
      const res = await fetch(`/api/etsy/orders?shopId=${shopId}`)
      
      if (!res.ok) {
        throw new Error(`HTTP error: ${res.status}`)
      }
      
      const data = await res.json()
      
      // Yeni API yapısına uygun veri işleme
      if (data.orders && Array.isArray(data.orders)) {
        console.log(`Loaded ${data.orders.length} orders from ${data.source || 'unknown'} source`)
        setOrders(data.orders)
        setDataSource(data.source || 'api')
      } else if (data.receipts && Array.isArray(data.receipts)) {
        // Eski API formatı için geriye dönük uyumluluk
        console.log(`Loaded ${data.receipts.length} receipts from legacy API`)
        
        // Eski formatı yeniye dönüştür
        const convertedOrders = data.receipts.map((receipt: any) => ({
          order_id: receipt.receipt_id,
          shop_id: receipt.seller_user_id || 1,
          buyer_name: receipt.name || "Anonim Müşteri",
          order_total: receipt.grandtotal ? receipt.grandtotal.amount / receipt.grandtotal.divisor : 0,
          currency_code: receipt.grandtotal ? receipt.grandtotal.currency_code : "USD",
          status: !receipt.is_paid ? "pending" : 
                  (receipt.is_paid && !receipt.is_shipped ? "paid" : "completed"),
          created_at: receipt.create_timestamp ? new Date(receipt.create_timestamp * 1000).toISOString() : new Date().toISOString(),
          updated_at: receipt.update_timestamp ? new Date(receipt.update_timestamp * 1000).toISOString() : new Date().toISOString(),
          items_count: 1,
          shipping_address: receipt.formatted_address || `${receipt.first_line || ""}, ${receipt.city || ""}, ${receipt.country_iso || ""}`
        }))
        
        setOrders(convertedOrders)
        setDataSource('legacy_api')
      } else {
        console.error("Unexpected data format:", data)
        setOrders([])
        setDataSource('error')
      }
    } catch (e) {
      console.error("Error fetching orders:", e)
      setOrders([])
      setDataSource('error')
    }
    setLoading(false)
  }

  const getStatus = (order: Order) => {
    if (order.status === "pending") return { text: "Beklemede", color: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-4 w-4" /> }
    if (order.status === "paid") return { text: "Ödendi", color: "bg-blue-100 text-blue-800", icon: <CheckCircle className="h-4 w-4" /> }
    if (order.status === "completed") return { text: "Tamamlandı", color: "bg-green-100 text-green-800", icon: <Truck className="h-4 w-4" /> }
    if (order.status === "cancelled") return { text: "İptal Edildi", color: "bg-red-100 text-red-800", icon: <XCircle className="h-4 w-4" /> }
    return { text: "Bilinmiyor", color: "bg-gray-100 text-gray-800", icon: <Clock className="h-4 w-4" /> }
  }

  const toggleOrderSelection = (orderId: number) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId))
    } else {
      setSelectedOrders([...selectedOrders, orderId])
    }
  }

  const handleBulkAction = (action: string) => {
    if (action === "mark-shipped") {
      // Seçili siparişleri gönderildi olarak işaretle
      console.log("Marking as shipped:", selectedOrders)
    } else if (action === "export-csv") {
      // Seçili siparişleri CSV olarak dışa aktar
      console.log("Exporting to CSV:", selectedOrders)
    }
  }

  const markAsShipped = async (orderId: number) => {
    console.log("Sipariş gönderildi olarak işaretlendi:", orderId)
    // API çağrısı yapılacak
  }

  const handleStatusChange = (order: Order) => {
    setStatusChangeOrder(order)
    setShowStatusDialog(true)
  }

  const updateOrderStatus = (newStatus: string) => {
    if (!statusChangeOrder) return
    
    // Siparişin durumunu güncelle
    const updatedOrders = orders.map(order => 
      order.order_id === statusChangeOrder.order_id 
        ? { ...order, status: newStatus } 
        : order
    )
    
    setOrders(updatedOrders)
    
    // Eğer seçili sipariş buysa, onu da güncelle
    if (selectedOrder && selectedOrder.order_id === statusChangeOrder.order_id) {
      setSelectedOrder({ ...selectedOrder, status: newStatus })
    }
    
    // Durum değiştirme modal'ını kapat
    setShowStatusDialog(false)
    setStatusChangeOrder(null)
    
    // TODO: API çağrısı yapılabilir (şu an sadece UI'da güncelleniyor)
    console.log(`Sipariş #${statusChangeOrder.order_id} durumu güncellendi: ${newStatus}`)
  }

  const filteredOrders = orders
    .filter(order => {
      if (statusFilter === "all") return true
      return order.status === statusFilter
    })
    .filter(order => {
      if (!searchTerm) return true
      const searchLower = searchTerm.toLowerCase()
      return (
        order.order_id.toString().includes(searchLower) ||
        order.buyer_name.toLowerCase().includes(searchLower) ||
        order.shipping_address.toLowerCase().includes(searchLower)
      )
    })

  // Sipariş istatistikleri
  const orderStats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    paid: orders.filter(o => o.status === "paid").length,
    completed: orders.filter(o => o.status === "completed").length,
    totalRevenue: orders.reduce((sum, o) => sum + o.order_total, 0),
    currency: orders[0]?.currency_code || "USD"
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center mb-6">
        <h1 className="text-2xl font-bold">Siparişler</h1>
        <CurrentStoreNameBadge />
        <div className="text-gray-500 text-base mt-2 mb-2">Tüm Etsy Siparişlerinizi Tek Ekrandan Takip Edin Ve Yönetin.</div>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{orderStats.total}</div>
            <div className="text-sm text-gray-600">Toplam Sipariş</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{orderStats.pending}</div>
            <div className="text-sm text-gray-600">Beklemede</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{orderStats.paid}</div>
            <div className="text-sm text-gray-600">Ödendi</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{orderStats.completed}</div>
            <div className="text-sm text-gray-600">Tamamlandı</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {orderStats.totalRevenue.toFixed(2)} {orderStats.currency}
            </div>
            <div className="text-sm text-gray-600">Toplam Gelir</div>
          </CardContent>
        </Card>
      </div>

      {/* Arama ve Filtreleme */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Sipariş, müşteri, e-posta ara..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Durum Filtrele" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  <SelectItem value="pending">Beklemede</SelectItem>
                  <SelectItem value="paid">Ödendi</SelectItem>
                  <SelectItem value="completed">Tamamlandı</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => setSelectedOrders([])}>
                <FilterIcon className="h-4 w-4 mr-2" />
                Temizle
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Toplu İşlemler */}
      {selectedOrders.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">
                {selectedOrders.length} sipariş seçildi
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleBulkAction("mark-shipped")}
                >
                  <Truck className="h-4 w-4 mr-2" />
                  Gönderildi Yap
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleBulkAction("export-csv")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV Dışa Aktar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sipariş Listesi */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Siparişler yükleniyor...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Hiç sipariş bulunamadı.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="py-3 px-4 text-left w-10">
                      <input
                        type="checkbox"
                        checked={selectedOrders.length === filteredOrders.length}
                        onChange={() => {
                          if (selectedOrders.length === filteredOrders.length) {
                            setSelectedOrders([])
                          } else {
                            setSelectedOrders(filteredOrders.map(o => o.order_id))
                          }
                        }}
                        className="rounded"
                      />
                    </th>
                    <th className="py-3 px-4 text-left">Tarih</th>
                    <th className="py-3 px-4 text-left">Ürün İsmi</th>
                    <th className="py-3 px-4 text-left">Boyut</th>
                    <th className="py-3 px-4 text-left">Çerçeve</th>
                    <th className="py-3 px-4 text-left">Drive Link</th>
                    <th className="py-3 px-4 text-left">Link</th>
                    <th className="py-3 px-4 text-left">KK No</th>
                    <th className="py-3 px-4 text-left">Sipariş No</th>
                    <th className="py-3 px-4 text-left">Müşteri İsim</th>
                    <th className="py-3 px-4 text-left">Sipariş Ücreti</th>
                    <th className="py-3 px-4 text-left">Üretim Ücreti</th>
                    <th className="py-3 px-4 text-left">Üretim Firma</th>
                    <th className="py-3 px-4 text-left">Ücret Ödendi Mi?</th>
                    <th className="py-3 px-4 text-left">Durum</th>
                    <th className="py-3 px-4 text-left">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const status = getStatus(order)
                    const editedOrder = editedOrders[order.order_id] || {}
                    return (
                      <tr key={order.order_id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedOrders.includes(order.order_id)}
                            onChange={() => toggleOrderSelection(order.order_id)}
                            className="rounded"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <EditableCell 
                            value={new Date(order.created_at).toLocaleDateString("tr-TR")} 
                            onChange={(value) => updateOrderField(order.order_id, 'created_at', value)}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <EditableCell 
                            value={editedOrder.product_name || order.items_count > 0 ? `Ürün ${order.order_id}` : "-"} 
                            onChange={(value) => updateOrderField(order.order_id, 'product_name', value)}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <EditableCell 
                            value={editedOrder.size || (order.items_count > 0 ? "35x50 cm" : "-")} 
                            onChange={(value) => updateOrderField(order.order_id, 'size', value)}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <EditableCell 
                            value={editedOrder.frame || (order.items_count > 0 ? "Çerçeve Yok" : "-")} 
                            onChange={(value) => updateOrderField(order.order_id, 'frame', value)}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <EditableLink 
                            text={editedOrder.drive_link_text || "Drive Link"} 
                            href={editedOrder.drive_link_href || "#"} 
                            onChange={(text, href) => updateOrderLink(order.order_id, 'drive_link', text, href)}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <EditableLink 
                            text={editedOrder.link_text || "Link"} 
                            href={editedOrder.link_href || "#"} 
                            onChange={(text, href) => updateOrderLink(order.order_id, 'link', text, href)}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <EditableCell 
                            value={editedOrder.kk_no || String(order.order_id).padStart(6, '0')} 
                            onChange={(value) => updateOrderField(order.order_id, 'kk_no', value)}
                          />
                        </td>
                        <td className="py-3 px-4 font-medium">
                          <EditableCell 
                            value={editedOrder.order_id || order.order_id} 
                            onChange={(value) => updateOrderField(order.order_id, 'order_id', value)}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <EditableCell 
                            value={editedOrder.buyer_name || order.buyer_name} 
                            onChange={(value) => updateOrderField(order.order_id, 'buyer_name', value)}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <EditableCell 
                            value={editedOrder.order_total || `$${order.order_total.toFixed(2)}`} 
                            onChange={(value) => updateOrderField(order.order_id, 'order_total', value)}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <EditableCell 
                            value={editedOrder.production_cost || "$160.00"} 
                            onChange={(value) => updateOrderField(order.order_id, 'production_cost', value)}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <select className="border rounded p-1 w-full">
                            <option>Yasin</option>
                            <option>Diğer</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <select 
                            className="border rounded p-1 w-full bg-white"
                            onChange={(e) => updateOrderField(order.order_id, 'payment_status', e.target.value)}
                            defaultValue={editedOrder.payment_status || "not_paid"}
                          >
                            <option value="not_paid" className="bg-red-100">Ödenmedi</option>
                            <option value="partially_paid" className="bg-yellow-100">Kısmen Ödendi</option>
                            <option value="paid" className="bg-green-100">Ödendi</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <select 
                            className={`border rounded p-1 w-full ${
                              status.text === "Beklemede" ? "bg-yellow-100" : 
                              status.text === "Ödendi" ? "bg-blue-100" : 
                              status.text === "Tamamlandı" ? "bg-green-100" : 
                              status.text === "İptal Edildi" ? "bg-red-100" : "bg-gray-100"
                            }`}
                            onChange={(e) => updateOrderStatus(e.target.value)}
                            defaultValue={order.status}
                          >
                            <option value="pending">Beklemede</option>
                            <option value="paid">Ödendi</option>
                            <option value="completed">Tamamlandı</option>
                            <option value="cancelled">İptal Edildi</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => setSelectedOrder(order)}>
                              <Eye className="h-3 w-3 mr-1" />
                              Detay
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sipariş Detay Modalı */}
      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <ShoppingCart className="h-5 w-5" />
                Sipariş #{selectedOrder.order_id}
              </DialogTitle>
              <DialogDescription>
                {new Date(selectedOrder.created_at).toLocaleDateString("tr-TR")}{" "}
                tarihinde oluşturuldu
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Sipariş Detayları</TabsTrigger>
                <TabsTrigger value="customer">Müşteri Bilgileri</TabsTrigger>
                <TabsTrigger value="notes">Notlar</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-gray-500 mb-2">Sipariş Bilgileri</h3>
                    <Card>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Durumu</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`${getStatus(selectedOrder).color} border-none`}>
                              {getStatus(selectedOrder).text}
                            </Badge>
                            <Button size="sm" variant="ghost" onClick={() => handleStatusChange(selectedOrder)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Toplam</span>
                          <span className="font-medium">
                            {selectedOrder.order_total.toFixed(2)} {selectedOrder.currency_code}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Kargo Ücreti</span>
                          <span>
                            {(selectedOrder.order_total / 100).toFixed(2)} {selectedOrder.currency_code}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-500 mb-2">Kargo Bilgileri</h3>
                    <Card>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Kargo Durumu</span>
                          <span>{selectedOrder.status === "completed" ? "Gönderildi" : "Bekliyor"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Adres</span>
                          <span className="text-right">{selectedOrder.shipping_address}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                
                {/* Ürünler burada listelenecek ancak API verisinde ürün bilgisi yok */}
                <div>
                  <h3 className="font-medium text-gray-500 mb-2">Ürünler</h3>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-gray-500 text-center py-2">
                        Ürün bilgileri ayrı bir API çağrısı gerektirir.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="customer" className="space-y-4 pt-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-gray-500" />
                        </div>
                        <div>
                          <h3 className="font-bold">{selectedOrder.buyer_name}</h3>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <h4 className="font-medium text-gray-500 mb-2">İletişim Bilgileri</h4>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-500 mb-2">Teslimat Adresi</h4>
                          <p>{selectedOrder.shipping_address}</p>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <h4 className="font-medium text-gray-500 mb-2">Sipariş Geçmişi</h4>
                        <p className="text-gray-500 text-center py-4">
                          Bu müşterinin sipariş geçmişi ayrı bir API çağrısı gerektirir.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="notes" className="space-y-4 pt-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-500 mb-2">Müşteri Mesajı</h4>
                        <p className="bg-gray-50 p-3 rounded">
                          Bu sipariş için müşteri mesajı bulunmuyor.
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-500 mb-2">Satıcı Notu</h4>
                        <p className="bg-gray-50 p-3 rounded">
                          Bu sipariş için satıcı notu bulunmuyor.
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-500 mb-2">Yeni Not Ekle</h4>
                        <textarea 
                          className="w-full p-3 border rounded-md" 
                          rows={4} 
                          placeholder="Sipariş hakkında not ekleyin..."
                        />
                        <Button className="mt-2">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Not Ekle
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <DialogFooter className="flex justify-between">
              {!selectedOrder.status.includes("completed") && selectedOrder.status.includes("paid") && (
                <Button onClick={() => markAsShipped(selectedOrder.order_id)}>
                  <Truck className="h-4 w-4 mr-2" />
                  Gönderildi Olarak İşaretle
                </Button>
              )}
              <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                Kapat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Durum Değiştirme Dialogı */}
      {showStatusDialog && (
        <Dialog open={showStatusDialog} onOpenChange={(open) => setShowStatusDialog(open)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <ShoppingCart className="h-5 w-5" />
                Sipariş #{statusChangeOrder?.order_id} Durumunu Değiştir
              </DialogTitle>
              <DialogDescription>
                {statusChangeOrder && new Date(statusChangeOrder.created_at).toLocaleDateString("tr-TR")}{" "}
                tarihinde oluşturuldu
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => updateOrderStatus("pending")}>
                  <Clock className="h-4 w-4 mr-2" />
                  Beklemede
                </Button>
                <Button variant="outline" onClick={() => updateOrderStatus("paid")}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Ödendi
                </Button>
                <Button variant="outline" onClick={() => updateOrderStatus("completed")}>
                  <Truck className="h-4 w-4 mr-2" />
                  Tamamlandı
                </Button>
                <Button variant="outline" onClick={() => updateOrderStatus("cancelled")}>
                  <XCircle className="h-4 w-4 mr-2" />
                  İptal Edildi
                </Button>
              </div>
            </div>

            <DialogFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
                İptal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
