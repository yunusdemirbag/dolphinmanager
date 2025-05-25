"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function OnboardingPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Onboarding sayfasına erişildiğinde otomatik olarak dashboard'a yönlendir
    router.replace("/dashboard")
  }, [router])
  
  // Boş bir içerik döndür - bu içerik gösterilmeyecek bile
  return null
}
