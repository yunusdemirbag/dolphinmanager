"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Clock, 
  Play, 
  Pause, 
  RotateCcw, 
  Trash2, 
  Settings, 
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Zap,
  Timer,
  BarChart3
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface QueueItem {
  id: string
  user_id?: string
  shop_id?: string
  product_data?: any
  state: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  scheduled_at: string
  processed_at?: string
  listing_id?: number
  error_message?: string
  title?: string
}

interface QueueStats {
  total: number
  pending: number
  processing: number
  completed: number
  failed: number
  average_duration?: number
}

interface QueueSettings {
  default_interval: number
}

export function QueueManagementPanel() {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([])
  const [queueStats, setQueueStats] = useState<QueueStats>({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0
  })
  const [queueSettings, setQueueSettings] = useState<QueueSettings>({
    default_interval: 15
  })
  const [loading, setLoading] = useState(true)
  const [processorRunning, setProcessorRunning] = useState(false)
  const [activeTab, setActiveTab] = useState("queue")
  const [countdown, setCountdown] = useState<number | null>(null)

  useEffect(() => {
    const fetchQueueData = async () => {
      try {
        const response = await fetch('/api/etsy/listings/queue/debug')
        if (response.ok) {
          const data = await response.json()
          console.log('API Yanıtı:', data) // Debug için
          
          // API'den gelen verileri doğru şekilde map et
          setQueueItems(data.recent_items || [])
          setQueueStats({
            total: data.stats?.total || 0,
            pending: data.stats?.pending || 0,
            processing: data.stats?.processing || 0,
            completed: data.stats?.completed || 0,
            failed: data.stats?.failed || 0
          })
        }
      } catch (error) {
        console.error('Kuyruk verileri alınamadı:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchQueueData()
    const interval = setInterval(fetchQueueData, 5000)
    return () => clearInterval(interval)
  }, [])

  // Countdown timer için useEffect
  useEffect(() => {
    const firstPendingItem = queueItems.find(item => item.state === 'pending')
    
    if (firstPendingItem && processorRunning) {
      const calculateCountdown = () => {
        const now = new Date().getTime()
        const scheduledTime = new Date(firstPendingItem.scheduled_at).getTime()
        
        // Debug için loglar
        console.log('Countdown Debug:', {
          now: new Date(now).toISOString(),
          scheduled: firstPendingItem.scheduled_at,
          scheduledTime: new Date(scheduledTime).toISOString(),
          interval: queueSettings.default_interval
        })
        
        const nextProcessTime = scheduledTime + (queueSettings.default_interval * 1000)
        const timeLeft = Math.max(0, Math.ceil((nextProcessTime - now) / 1000))
        
        setCountdown(timeLeft)
        
        if (timeLeft === 0) {
          setCountdown(null)
        }
      }
      
      calculateCountdown()
      const timer = setInterval(calculateCountdown, 1000)
      
      return () => clearInterval(timer)
    } else {
      setCountdown(null)
    }
  }, [queueItems, queueSettings.default_interval, processorRunning])

  const handleStartQueue = async () => {
    try {
      const response = await fetch('/api/etsy/queue-processor/start', { method: 'POST' })
      if (response.ok) {
        setProcessorRunning(true)
        toast({ title: "✅ Kuyruk Başlatıldı", description: "Ürünler işlenmeye başladı" })
      }
    } catch (error) {
      toast({ title: "❌ Hata", description: "Kuyruk başlatılamadı", variant: "destructive" })
    }
  }

  const handlePauseQueue = async () => {
    try {
      const response = await fetch('/api/etsy/queue-processor/stop', { method: 'POST' })
      if (response.ok) {
        setProcessorRunning(false)
        toast({ title: "⏸️ Kuyruk Durduruldu", description: "İşlem geçici olarak durduruldu" })
      }
    } catch (error) {
      toast({ title: "❌ Hata", description: "Kuyruk durdurulamadı", variant: "destructive" })
    }
  }

  const handleClearQueue = async () => {
    try {
      const response = await fetch('/api/etsy/listings/queue/clear', { method: 'POST' })
      if (response.ok) {
        setQueueItems([])
        setQueueStats({ total: 0, pending: 0, processing: 0, completed: 0, failed: 0 })
        toast({ title: "🗑️ Kuyruk Temizlendi", description: "Tüm kuyruk öğeleri silindi" })
      }
    } catch (error) {
      toast({ title: "❌ Hata", description: "Kuyruk temizlenemedi", variant: "destructive" })
    }
  }

  const handleProcessNow = async () => {
    try {
      const response = await fetch('/api/etsy/listings/queue/process-now', { method: 'POST' })
      if (response.ok) {
        toast({ title: "⚡ Hemen İşleniyor", description: "Kuyruk hemen işlenmeye başladı" })
      }
    } catch (error) {
      toast({ title: "❌ Hata", description: "Hemen işleme başarısız", variant: "destructive" })
    }
  }

  const handleUpdateSettings = async (newSettings: Partial<QueueSettings>) => {
    const updatedSettings = { ...queueSettings, ...newSettings }
    setQueueSettings(updatedSettings)
    toast({ title: "⚙️ Ayarlar Güncellendi", description: "Kuyruk ayarları başarıyla kaydedildi" })
  }

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'failed': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'pending': return <Clock className="w-3 h-3" />
      case 'processing': return <Loader2 className="w-3 h-3 animate-spin" />
      case 'completed': return <CheckCircle className="w-3 h-3" />
      case 'failed': return <XCircle className="w-3 h-3" />
      default: return <AlertCircle className="w-3 h-3" />
    }
  }

  const formatInterval = (seconds: number) => {
    if (seconds < 60) return `${seconds}sn`
    return `${Math.floor(seconds / 60)}dk`
  }

  const formatCountdown = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}sn`
    }
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}dk ${secs}sn`
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Özet Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-yellow-400">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bekleyen</p>
                <p className="text-2xl font-bold text-yellow-600">{queueStats.pending}</p>
                {countdown !== null && queueStats.pending > 0 && (
                  <p className="text-xs text-yellow-500 mt-1 font-mono">
                    ⏱️ {formatCountdown(countdown)}
                  </p>
                )}
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-400">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">İşleniyor</p>
                <p className="text-2xl font-bold text-blue-600">{queueStats.processing}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-400">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tamamlanan</p>
                <p className="text-2xl font-bold text-green-600">{queueStats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-400">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Hatalı</p>
                <p className="text-2xl font-bold text-red-600">{queueStats.failed}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-gray-400">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam</p>
                <p className="text-2xl font-bold text-gray-600">{queueStats.total}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kontrol Paneli */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Kuyruk Kontrolü
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={processorRunning ? handlePauseQueue : handleStartQueue}
              variant={processorRunning ? "secondary" : "default"}
              className="flex items-center gap-2"
            >
              {processorRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  Duraklat
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Başlat
                </>
              )}
            </Button>

            <Button onClick={handleProcessNow} variant="outline" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Hemen İşle
            </Button>

            <Button onClick={handleClearQueue} variant="destructive" className="flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Kuyruğu Temizle
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="queue">Kuyruk Listesi</TabsTrigger>
          <TabsTrigger value="settings">Ayarlar</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Canlı Kuyruk</CardTitle>
            </CardHeader>
            <CardContent>
              {queueItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Kuyrukta ürün yok
                </div>
              ) : (
                <div className="space-y-3">
                  {queueItems.map((item, index) => {
                    const isFirstPending = item.state === 'pending' && index === queueItems.findIndex(i => i.state === 'pending')
                    
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            {getStatusIcon(item.state)}
                          </div>
                          <div>
                            <h4 className="font-medium">
                              {item.title || item.product_data?.title || 'Başlıksız Ürün'}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {new Date(item.created_at).toLocaleString('tr-TR')}
                            </p>
                            {/* Countdown timer sadece ilk pending item'da göster */}
                            {isFirstPending && countdown !== null && processorRunning && (
                              <div className="flex items-center gap-1 mt-2">
                                <Timer className="w-3 h-3 text-orange-500" />
                                <span className="text-xs text-orange-600 font-mono bg-orange-50 px-2 py-1 rounded">
                                  {formatCountdown(countdown)} kaldı
                                </span>
                              </div>
                            )}
                            {item.error_message && (
                              <p className="text-sm text-red-600 mt-1">
                                {item.error_message}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(item.state)}>
                            {item.state === 'pending' && 'Bekliyor'}
                            {item.state === 'processing' && 'İşleniyor'}
                            {item.state === 'completed' && 'Tamamlandı'}
                            {item.state === 'failed' && 'Hatalı'}
                          </Badge>
                          {item.listing_id && (
                            <Badge variant="outline">
                              ID: {item.listing_id}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="w-5 h-5" />
                İşlem Aralığı Ayarı
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">
                    İşlem Aralığı: {formatInterval(queueSettings.default_interval)}
                  </Label>
                  <p className="text-xs text-gray-500 mb-3">
                    Kuyrukta bekleyen ürünler bu süre aralıklarında işlenir
                  </p>
                  <Slider
                    value={[queueSettings.default_interval]}
                    onValueChange={([value]) => 
                      handleUpdateSettings({ default_interval: value })
                    }
                    max={120}
                    min={15}
                    step={15}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>15sn</span>
                    <span>2dk</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}