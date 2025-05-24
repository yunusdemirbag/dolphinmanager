"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientSupabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Store,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  ArrowRight,
  Sparkles,
  BarChart3,
  Package,
  ShoppingBag,
} from "lucide-react"

export default function OnboardingPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [etsyLoading, setEtsyLoading] = useState(false)
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const router = useRouter()
  const supabase = createClientSupabase()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      setUser(user)

      // Get user profile
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      setProfile(profile)

      // Determine current step
      if (profile?.etsy_shop_name) {
        setCurrentStep(3) // Already connected
      } else {
        setCurrentStep(2) // Need to connect Etsy
      }
    } catch (error) {
      console.error("Error checking user:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEtsyConnect = async () => {
    setEtsyLoading(true)
    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setNotification({ type: "error", message: "Oturum bulunamadı. Lütfen tekrar giriş yapın." })
        return
      }

      const response = await fetch("/api/etsy/auth", {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })
      const data = await response.json()

      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        setNotification({ type: "error", message: "Etsy bağlantısı oluşturulamadı" })
      }
    } catch (error) {
      console.error("Etsy connect error:", error)
      setNotification({ type: "error", message: "Bağlantı hatası oluştu" })
    } finally {
      setEtsyLoading(false)
    }
  }

  const handleGoToDashboard = () => {
    router.push("/dashboard")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  const isEtsyConnected = !!profile?.etsy_shop_name
  const progress = isEtsyConnected ? 100 : 50

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">D</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Dolphin Manager</h1>
                <p className="text-sm text-gray-600">Kurulum Sihirbazı</p>
              </div>
            </div>
            <Badge variant="outline" className="text-blue-600 border-blue-200">
              {Math.round(progress)}% Tamamlandı
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Kurulum İlerlemesi</span>
            <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Notifications */}
        {notification && (
          <Alert variant={notification.type === "error" ? "destructive" : "default"} className="mb-6">
            {notification.type === "success" ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{notification.message}</AlertDescription>
          </Alert>
        )}

        {/* Welcome Step */}
        {currentStep === 1 && (
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-gray-900">
                Hoş Geldiniz, {profile?.full_name || user?.email}! 👋
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Dolphin Manager ile Etsy mağazanızı profesyonelce yönetmeye hazır mısınız? Hemen başlayalım!
              </p>
            </div>

            <Card className="max-w-md mx-auto shadow-lg border-0">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span>Hesabınız oluşturuldu</span>
                  </div>
                  <div className="flex items-center space-x-3 text-gray-400">
                    <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                    <span>Etsy mağazanızı bağlayın</span>
                  </div>
                  <div className="flex items-center space-x-3 text-gray-400">
                    <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                    <span>Dashboard'unuzu keşfedin</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button onClick={() => setCurrentStep(2)} size="lg" className="px-8">
              Başlayalım
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Etsy Connection Step */}
        {currentStep === 2 && (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-gray-900">Etsy Mağazanızı Bağlayın</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Mağazanızı bağlayarak ürünlerinizi, siparişlerinizi ve analitiklerinizi tek yerden yönetin.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Benefits */}
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Sparkles className="h-5 w-5 mr-2 text-yellow-500" />
                    Neler Kazanacaksınız?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Package className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Ürün Yönetimi</h4>
                      <p className="text-sm text-gray-600">Tüm ürünlerinizi tek yerden görüntüleyin ve yönetin</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <ShoppingBag className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Sipariş Takibi</h4>
                      <p className="text-sm text-gray-600">Siparişlerinizi takip edin ve müşterilerinizi yönetin</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <BarChart3 className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Analitik Raporlar</h4>
                      <p className="text-sm text-gray-600">Satış performansınızı analiz edin ve büyüyün</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Connection Card */}
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Store className="h-5 w-5 mr-2 text-orange-600" />
                    Etsy Bağlantısı
                  </CardTitle>
                  <CardDescription>Güvenli OAuth 2.0 ile bağlanın</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600">
                      <p className="font-medium mb-2">Bağlantı süreci:</p>
                      <ul className="space-y-1 text-xs">
                        <li>• Etsy'ye yönlendirileceksiniz</li>
                        <li>• Hesabınızla giriş yapın</li>
                        <li>• İzinleri onaylayın</li>
                        <li>• Otomatik olarak geri döneceksiniz</li>
                      </ul>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => {
                        window.location.href = "/api/etsy/login"
                      }}
                    >
                      Etsy Mağazamı Bağla
                    </Button>

                    <p className="text-xs text-gray-500 text-center">Güvenli bağlantı. Şifrenizi paylaşmayız.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Success Step */}
        {currentStep === 3 && isEtsyConnected && (
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <div className="mx-auto h-20 w-20 bg-green-600 rounded-full flex items-center justify-center">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-green-600 font-bold text-2xl">✓</span>
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Harika! Kurulum Tamamlandı 🎉</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                <strong>{profile.etsy_shop_name}</strong> mağazanız başarıyla bağlandı. Artık dashboard'unuzu kullanmaya
                başlayabilirsiniz.
              </p>
            </div>

            <Card className="max-w-md mx-auto shadow-lg border-0">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span>Hesabınız oluşturuldu</span>
                  </div>
                  <div className="flex items-center space-x-3 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span>Etsy mağazanız bağlandı</span>
                  </div>
                  <div className="flex items-center space-x-3 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span>Kurulum tamamlandı</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Button onClick={handleGoToDashboard} size="lg" className="px-8">
                Dashboard'a Git
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <div className="flex justify-center space-x-4 text-sm">
                <Button variant="ghost" asChild>
                  <a href="https://www.etsy.com/your/shops/me" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Etsy'de Görüntüle
                  </a>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
