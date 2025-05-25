"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink } from "lucide-react"
import { createClientSupabase } from "@/lib/supabase"

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false)

  const handleEtsyConnect = async () => {
    setLoading(true)
    try {
      // Supabase oturumundan user_id al
      const supabase = createClientSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert("Oturum bulunamadı. Lütfen giriş yapın.")
        setLoading(false)
        return
      }

      // Session token'ını al
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        alert("Session token bulunamadı. Lütfen tekrar giriş yapın.")
        setLoading(false)
        return
      }

      console.log("Current user ID:", user.id)

      // /api/etsy/auth endpoint'ine POST request
      const response = await fetch("/api/etsy/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId: user.id }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error)
      }

      const { authUrl } = await response.json()
      console.log("Redirecting to Etsy auth:", authUrl)

      // Etsy'ye yönlendir
      window.location.href = authUrl

    } catch (error) {
      console.error("Etsy bağlantı hatası:", error)
      alert("Etsy bağlantı hatası: " + String(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <div className="h-24 w-24 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-bold text-2xl">D</span>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              Dolphin Manager'a Hoş Geldiniz
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Etsy mağazanızı profesyonelce yönetmek için ilk adımı atın. Mağazanızı bağlayarak başlayın!
            </p>
          </div>

          <Card className="max-w-md mx-auto shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-2xl">Etsy Mağazanızı Bağlayın</CardTitle>
              <CardDescription>
                Mağazanızı bağlayarak ürünlerinizi ve siparişlerinizi yönetin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                className="w-full" 
                onClick={handleEtsyConnect}
                disabled={loading}
              >
                {loading ? "Bağlanıyor..." : "Etsy Mağazamı Bağla"}
              </Button>
              <div className="text-xs text-center text-gray-500">
                Etsy'nin OAuth 2.0 güvenlik protokolü kullanılmaktadır. Şifrenizi paylaşmazsınız.
              </div>
            </CardContent>
          </Card>

          <div className="text-sm text-gray-500">
            <a 
              href="https://www.etsy.com" 
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 hover:underline"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Etsy'yi ziyaret edin
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
