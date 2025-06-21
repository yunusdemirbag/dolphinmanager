"use client"

import { useEffect, useState } from "react"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { Loader2 } from "lucide-react"

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    console.log("🔄 [ProductsLayout] useEffect başladı")
    
    // Sadece yükleme durumunu kontrol et, oturum kontrolü yapma
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log(`🔒 [ProductsLayout] Auth durumu değişti: ${user ? 'Oturum açık' : 'Oturum kapalı'}`)
      
      // Kullanıcı durumu ne olursa olsun, sadece yükleme durumunu kapat
      setLoading(false)
    })
    
    return () => {
      console.log("🧹 [ProductsLayout] useEffect temizleniyor")
      unsubscribe()
    }
  }, [])
  
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
  
  console.log("🎯 [ProductsLayout] Sayfa içeriği gösteriliyor")
  return (
    <div className="bg-white">
      {children}
    </div>
  )
} 