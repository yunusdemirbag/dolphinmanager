"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { Loader2 } from "lucide-react"

export default function EtsyConnection() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { getAuthToken } = useAuth()

  const connectEtsy = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const token = await getAuthToken()
      
      if (!token) {
        throw new Error("Kimlik doğrulama hatası. Lütfen tekrar giriş yapın.")
      }
      
      // Etsy auth URL'ini al
      const response = await fetch("/api/etsy/auth", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Etsy bağlantısı başlatılamadı")
      }
      
      const data = await response.json()
      
      if (!data.url) {
        throw new Error("Etsy auth URL alınamadı")
      }
      
      // Kullanıcıyı Etsy OAuth sayfasına yönlendir
      window.location.href = data.url
      
    } catch (err) {
      console.error("Etsy bağlantı hatası:", err)
      setError(err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu")
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Etsy Mağazanızı Bağlayın</h2>
      <p className="text-gray-600 mb-6 text-center">
        Etsy mağazanızı bağlayarak ürünlerinizi senkronize edebilir ve siparişlerinizi yönetebilirsiniz.
      </p>
      
      {error && (
        <div className="w-full p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}
      
      <Button 
        onClick={connectEtsy} 
        disabled={loading} 
        className="flex items-center bg-[#F56400] hover:bg-[#E55400] text-white"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Bağlanıyor...
          </>
        ) : (
          "Etsy Mağazanızı Bağlayın"
        )}
      </Button>
    </div>
  )
}
