"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Users,
  MessageCircle,
  Star,
  Heart,
  ShoppingBag,
  Mail,
  MapPin,
  Calendar,
  TrendingUp,
  Filter,
  Search,
  Send,
} from "lucide-react"

export default function CustomerManagementPage() {
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [messageText, setMessageText] = useState("")

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    try {
      // Gerçek müşteri verilerini API'den çek
      const response = await fetch('/api/etsy/customers')
      
      if (response.ok) {
        const data = await response.json()
        setCustomers(data.customers || [])
      } else {
        // API hatası - boş liste göster
        setCustomers([])
      }
    } catch (error) {
      console.error("Customers API error:", error)
      // Hata durumunda boş liste göster
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const recentMessages = [
    {
      id: "1",
      customer_id: "1",
      customer_name: "Sarah Johnson",
      message: "Hi! I love the ring I ordered. Do you have it in gold as well?",
      timestamp: "2024-01-22 14:30",
      status: "unread",
      type: "question",
    },
    {
      id: "2",
      customer_id: "3",
      customer_name: "Emma Wilson",
      message: "Thank you for the beautiful vintage bag! The quality is amazing.",
      timestamp: "2024-01-25 09:15",
      status: "read",
      type: "compliment",
    },
    {
      id: "3",
      customer_id: "2",
      customer_name: "Michael Chen",
      message: "When will my ceramic mug be shipped?",
      timestamp: "2024-01-19 16:45",
      status: "replied",
      type: "shipping",
    },
  ]

  const reviews = [
    {
      id: "1",
      customer_id: "1",
      customer_name: "Sarah Johnson",
      product: "Handmade Silver Ring",
      rating: 5,
      review: "Absolutely beautiful! The craftsmanship is incredible and it fits perfectly.",
      date: "2024-01-21",
      helpful_votes: 8,
      store: "ArtisanCrafts",
    },
    {
      id: "2",
      customer_id: "3",
      customer_name: "Emma Wilson",
      product: "Vintage Leather Bag",
      rating: 5,
      review: "This bag exceeded my expectations. The leather quality is outstanding and the vintage style is perfect.",
      date: "2024-01-20",
      helpful_votes: 12,
      store: "VintageFinds",
    },
    {
      id: "3",
      customer_id: "2",
      customer_name: "Michael Chen",
      product: "Ceramic Coffee Mug",
      rating: 4,
      review: "Great mug, love the design. Shipping was a bit slow but worth the wait.",
      date: "2024-01-18",
      helpful_votes: 3,
      store: "CeramicStudio",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "vip":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "regular":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "new":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "vip":
        return "VIP Müşteri"
      case "regular":
        return "Düzenli Müşteri"
      case "new":
        return "Yeni Müşteri"
      default:
        return "Müşteri"
    }
  }

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case "question":
        return "bg-yellow-100 text-yellow-800"
      case "compliment":
        return "bg-green-100 text-green-800"
      case "shipping":
        return "bg-blue-100 text-blue-800"
      case "complaint":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const totalCustomers = customers.length
  const vipCustomers = customers.filter((c) => c.status === "vip").length
  const totalRevenue = customers.reduce((sum, c) => sum + c.total_spent, 0)
  const avgOrderValue = totalRevenue / customers.reduce((sum, c) => sum + c.total_orders, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Müşteri Yönetimi</h1>
                <p className="text-sm text-gray-600">Müşteri ilişkilerinizi güçlendirin</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Filtrele
              </Button>
              <Button className="bg-orange-600 hover:bg-orange-700">
                <Mail className="w-4 h-4 mr-2" />
                Toplu Mesaj
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
                  <p className="text-sm font-medium text-gray-600">Toplam Müşteri</p>
                  <p className="text-2xl font-bold text-gray-900">{totalCustomers}</p>
                </div>
                <div className="p-3 rounded-full bg-orange-50">
                  <Users className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">VIP Müşteri</p>
                  <p className="text-2xl font-bold text-gray-900">{vipCustomers}</p>
                </div>
                <div className="p-3 rounded-full bg-purple-50">
                  <Star className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Gelir</p>
                  <p className="text-2xl font-bold text-gray-900">₺{totalRevenue.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-full bg-green-50">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ortalama Sipariş</p>
                  <p className="text-2xl font-bold text-gray-900">₺{Math.round(avgOrderValue)}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-50">
                  <ShoppingBag className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="customers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="customers">Müşteri Listesi</TabsTrigger>
            <TabsTrigger value="messages">Mesajlar</TabsTrigger>
            <TabsTrigger value="reviews">Değerlendirmeler</TabsTrigger>
            <TabsTrigger value="segments">Segmentasyon</TabsTrigger>
          </TabsList>

          <TabsContent value="customers">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Müşteri Listesi</CardTitle>
                    <CardDescription>Tüm müşterilerinizin detaylı bilgileri</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input placeholder="Müşteri ara..." className="pl-10 w-64" />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {customers.map((customer) => (
                    <div
                      key={customer.id}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedCustomer(customer.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={customer.avatar || "/placeholder.svg"} />
                            <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold">{customer.name}</h3>
                              <Badge className={getStatusColor(customer.status)}>
                                {getStatusText(customer.status)}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{customer.email}</p>
                            <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                              <span className="flex items-center">
                                <MapPin className="w-3 h-3 mr-1" />
                                {customer.location}
                              </span>
                              <span className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                Üye: {new Date(customer.joined).toLocaleDateString("tr-TR")}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <p className="text-lg font-bold text-gray-900">{customer.total_orders}</p>
                              <p className="text-xs text-gray-600">Sipariş</p>
                            </div>
                            <div>
                              <p className="text-lg font-bold text-green-600">₺{customer.total_spent}</p>
                              <p className="text-xs text-gray-600">Toplam</p>
                            </div>
                            <div>
                              <div className="flex items-center justify-center space-x-1">
                                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                <span className="text-sm font-bold">{customer.avg_rating}</span>
                              </div>
                              <p className="text-xs text-gray-600">{customer.reviews} değerlendirme</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 mt-3">
                            <Button size="sm" variant="outline">
                              <MessageCircle className="w-3 h-3 mr-1" />
                              Mesaj
                            </Button>
                            <Button size="sm" variant="outline">
                              <Mail className="w-3 h-3 mr-1" />
                              E-posta
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {customer.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <MessageCircle className="w-5 h-5 mr-2 text-blue-600" />
                      Son Mesajlar
                    </CardTitle>
                    <CardDescription>Müşterilerinizden gelen son mesajlar</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentMessages.map((message) => (
                        <div key={message.id} className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>{message.customer_name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <h4 className="font-medium">{message.customer_name}</h4>
                                  <Badge className={getMessageTypeColor(message.type)} variant="secondary">
                                    {message.type}
                                  </Badge>
                                  <Badge
                                    variant={message.status === "unread" ? "destructive" : "secondary"}
                                    className="text-xs"
                                  >
                                    {message.status === "unread"
                                      ? "Okunmadı"
                                      : message.status === "read"
                                        ? "Okundu"
                                        : "Yanıtlandı"}
                                  </Badge>
                                </div>
                                <p className="text-gray-700 mt-1">{message.message}</p>
                                <p className="text-xs text-gray-500 mt-2">{message.timestamp}</p>
                              </div>
                            </div>
                            <Button size="sm" variant="outline">
                              <Send className="w-3 h-3 mr-1" />
                              Yanıtla
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Hızlı Yanıt</CardTitle>
                    <CardDescription>Müşterilere hızlı mesaj gönderin</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Müşteri Seç</label>
                      <select className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm">
                        <option value="">Müşteri seçin...</option>
                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Mesaj</label>
                      <Textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Mesajınızı yazın..."
                        rows={4}
                        className="mt-1"
                      />
                    </div>
                    <Button className="w-full bg-orange-600 hover:bg-orange-700">
                      <Send className="w-4 h-4 mr-2" />
                      Mesaj Gönder
                    </Button>

                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Hazır Şablonlar</h4>
                      <div className="space-y-2">
                        <Button variant="outline" size="sm" className="w-full text-left justify-start">
                          Sipariş onayı
                        </Button>
                        <Button variant="outline" size="sm" className="w-full text-left justify-start">
                          Kargo bilgisi
                        </Button>
                        <Button variant="outline" size="sm" className="w-full text-left justify-start">
                          Teşekkür mesajı
                        </Button>
                        <Button variant="outline" size="sm" className="w-full text-left justify-start">
                          İndirim kodu
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reviews">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="w-5 h-5 mr-2 text-yellow-500" />
                  Müşteri Değerlendirmeleri
                </CardTitle>
                <CardDescription>Ürünleriniz hakkında yapılan değerlendirmeler</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>{review.customer_name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium">{review.customer_name}</h4>
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i < review.rating ? "text-yellow-500 fill-current" : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {review.product} • {review.store}
                            </p>
                            <p className="text-gray-700 mt-2">{review.review}</p>
                            <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                              <span>{review.date}</span>
                              <span className="flex items-center">
                                <Heart className="w-3 h-3 mr-1" />
                                {review.helpful_votes} kişi faydalı buldu
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          <MessageCircle className="w-3 h-3 mr-1" />
                          Yanıtla
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="segments">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Müşteri Segmentleri</CardTitle>
                  <CardDescription>Müşterilerinizi kategorilere ayırın</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-purple-900">VIP Müşteriler</h4>
                          <p className="text-sm text-purple-700">₺500+ harcama yapan müşteriler</p>
                        </div>
                        <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                          {customers.filter((c) => c.total_spent >= 500).length} müşteri
                        </Badge>
                      </div>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-green-900">Sadık Müşteriler</h4>
                          <p className="text-sm text-green-700">5+ sipariş veren müşteriler</p>
                        </div>
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          {customers.filter((c) => c.total_orders >= 5).length} müşteri
                        </Badge>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-blue-900">Yeni Müşteriler</h4>
                          <p className="text-sm text-blue-700">Son 30 günde katılan müşteriler</p>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                          {customers.filter((c) => c.status === "new").length} müşteri
                        </Badge>
                      </div>
                    </div>

                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-yellow-900">Risk Altındaki Müşteriler</h4>
                          <p className="text-sm text-yellow-700">60+ gün sipariş vermeyen müşteriler</p>
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                          {
                            customers.filter((c) => {
                              const daysSinceLastOrder = Math.floor(
                                (new Date().getTime() - new Date(c.last_order).getTime()) / (1000 * 60 * 60 * 24),
                              )
                              return daysSinceLastOrder > 60
                            }).length
                          }{" "}
                          müşteri
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Kategori Tercihleri</CardTitle>
                  <CardDescription>Müşterilerin favori kategorileri</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(
                      customers.reduce((acc, customer) => {
                        if (!acc[customer.favorite_category]) {
                          acc[customer.favorite_category] = 0
                        }
                        acc[customer.favorite_category]++
                        return acc
                      }, {} as any),
                    ).map(([category, count]: [string, any]) => (
                      <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium">{category}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-orange-600 h-2 rounded-full"
                              style={{ width: `${(count / customers.length) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">{count} müşteri</span>
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
