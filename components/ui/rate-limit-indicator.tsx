"use client"

import { useState, useEffect } from "react"
import { AlertCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"

export function RateLimitIndicator() {
  const [rateLimit, setRateLimit] = useState({
    used: 0,
    limit: 40, // Günlük varsayılan limit
    resetAt: null as Date | null,
    percentage: 0
  })

  useEffect(() => {
    // API rate limit bilgisini al
    const fetchRateLimit = async () => {
      try {
        const response = await fetch("/api/etsy/rate-limit")
        if (response.ok) {
          const data = await response.json()
          if (data.limit) {
            // Yüzde hesapla
            const percentage = Math.min(Math.round((data.used / data.limit) * 100), 100)
            
            setRateLimit({
              used: data.used || 0,
              limit: data.limit || 40,
              resetAt: data.resetAt ? new Date(data.resetAt) : null,
              percentage
            })
          }
        }
      } catch (error) {
        console.error("Rate limit bilgisi alınamadı:", error)
      }
    }

    // Sayfa yüklendiğinde ve her 5 dakikada bir güncelle
    fetchRateLimit()
    const interval = setInterval(fetchRateLimit, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  // Kalan zamanı hesapla
  const getTimeRemaining = () => {
    if (!rateLimit.resetAt) return "Bilinmiyor"
    
    const now = new Date()
    const diff = rateLimit.resetAt.getTime() - now.getTime()
    
    if (diff <= 0) return "Sıfırlanıyor..."
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    return `${hours}s ${minutes}dk`
  }

  // Renkleri belirle
  const getColor = () => {
    const percentage = rateLimit.percentage
    if (percentage < 50) return "bg-green-500"
    if (percentage < 80) return "bg-yellow-500"
    return "bg-red-500"
  }

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <AlertCircle className="w-4 h-4 mr-2 text-gray-500" />
          <h3 className="text-sm font-medium">Etsy API Kullanım Limiti</h3>
        </div>
        <div className="text-xs text-gray-500">
          Kalan: {getTimeRemaining()}
        </div>
      </div>
      
      <div className="space-y-2">
        <Progress 
          value={rateLimit.percentage} 
          className="h-2 bg-gray-100"
          indicatorClassName={getColor()}
        />
        
        <div className="flex justify-between text-xs">
          <div className="text-gray-500">
            {rateLimit.used} / {rateLimit.limit} istek ({rateLimit.percentage}%)
          </div>
          <div className="text-gray-500">
            {rateLimit.percentage >= 80 ? (
              <span className="text-red-500 font-medium">Kritik seviye!</span>
            ) : rateLimit.percentage >= 50 ? (
              <span className="text-yellow-500">Dikkatli kullanın</span>
            ) : (
              <span className="text-green-500">İyi durumda</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 