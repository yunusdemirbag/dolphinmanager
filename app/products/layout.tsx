"use client"

import { useEffect, useState } from "react"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  
  useEffect(() => {
    console.log("🔄 [ProductsLayout] useEffect başladı")
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log(`🔒 [ProductsLayout] Auth durumu değişti: ${user ? 'Oturum açık' : 'Oturum kapalı'}`)
      
      if (!user) {
        console.log("⚠️ [ProductsLayout] Kullanıcı oturum açmamış, login sayfasına yönlendiriliyor")
        router.replace('/auth/login')
      } else {
        console.log(`✅ [ProductsLayout] Kullanıcı oturum açmış: ${user.uid}`)
        setUser(user)
      }
      
      setLoading(false)
    })
    
    return () => {
      console.log("🧹 [ProductsLayout] useEffect temizleniyor")
      unsubscribe()
    }
  }, [router])
  
  if (loading) {
    console.log("⏳ [ProductsLayout] Yükleniyor durumu gösteriliyor")
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Yükleniyor...</p>
        </div>
      </div>
    )
  }
  
  if (!user) {
    console.log("🚫 [ProductsLayout] Kullanıcı yok, null döndürülüyor (yönlendirme yapılıyor)")
    return null
  }
  
  console.log("🎯 [ProductsLayout] Sayfa içeriği gösteriliyor")
  return (
    <div className="bg-white">
      {children}
    </div>
  )
} 