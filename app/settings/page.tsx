"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Settings,
  DollarSign,
  Moon,
  Sun,
  RefreshCw,
  Save,
  Globe,
  Bell,
  Shield,
  User,
  Wifi
} from "lucide-react"
import { createClientSupabase } from "@/lib/supabase"

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [usdToTry, setUsdToTry] = useState(38.93)
  const [autoUpdateCurrency, setAutoUpdateCurrency] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [autoSync, setAutoSync] = useState(true)
  const [language, setLanguage] = useState("tr")
  const [lastCurrencyUpdate, setLastCurrencyUpdate] = useState<Date | null>(null)
  const supabase = createClientSupabase()

  useEffect(() => {
    loadSettings()
    if (autoUpdateCurrency) {
      fetchCurrentExchangeRate()
    }
  }, [])

  const loadSettings = () => {
    // LocalStorage'dan ayarları yükle
    const savedSettings = localStorage.getItem('dolphin-settings')
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      setUsdToTry(settings.usdToTry || 38.93)
      setAutoUpdateCurrency(settings.autoUpdateCurrency ?? true)
      setDarkMode(settings.darkMode ?? false)
      setNotifications(settings.notifications ?? true)
      setAutoSync(settings.autoSync ?? true)
      setLanguage(settings.language || "tr")
      if (settings.lastCurrencyUpdate) {
        setLastCurrencyUpdate(new Date(settings.lastCurrencyUpdate))
      }
    }
    
    // Dark mode'u uygula
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const settings = {
        usdToTry,
        autoUpdateCurrency,
        darkMode,
        notifications,
        autoSync,
        language,
        lastCurrencyUpdate: lastCurrencyUpdate?.toISOString()
      }
      
      localStorage.setItem('dolphin-settings', JSON.stringify(settings))
      
      // Dark mode'u uygula
      if (darkMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulated save
      alert("✅ Ayarlar başarıyla kaydedildi!")
    } catch (error) {
      console.error("Settings save error:", error)
      alert("❌ Ayarlar kaydedilirken hata oluştu!")
    } finally {
      setSaving(false)
    }
  }

  const fetchCurrentExchangeRate = async () => {
    setLoading(true)
    try {
      // Döviz.com'dan gerçek kur çek
      const response = await fetch('/api/exchange-rate')
      if (response.ok) {
        const data = await response.json()
        setUsdToTry(data.rate)
        setLastCurrencyUpdate(new Date())
      } else {
        // API başarısız olursa varsayılan değer kullan
        setUsdToTry(38.93)
        setLastCurrencyUpdate(new Date())
      }
    } catch (error) {
      console.error("Exchange rate fetch error:", error)
      // Hata durumunda varsayılan değer kullan
      setUsdToTry(38.93)
      setLastCurrencyUpdate(new Date())
    } finally {
      setLoading(false)
    }
  }

  const handleManualCurrencyUpdate = () => {
    if (autoUpdateCurrency) {
      fetchCurrentExchangeRate()
    }
  }

  const handleDarkModeToggle = (enabled: boolean) => {
    setDarkMode(enabled)
    if (enabled) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className={`text-3xl font-bold flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              <Settings className="h-8 w-8 text-blue-600 mr-3" />
              Ayarlar
            </h1>
            <p className={`mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Dolphin Manager tercihlerinizi yönetin</p>
          </div>
          <Button 
            onClick={saveSettings}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saving ? "Kaydediliyor..." : "Ayarları Kaydet"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Kur Ayarları */}
          <Card className={darkMode ? 'bg-gray-800 border-gray-700' : ''}>
            <CardHeader>
              <CardTitle className={`flex items-center ${darkMode ? 'text-white' : ''}`}>
                <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                Döviz Kuru Ayarları
              </CardTitle>
              <CardDescription className={darkMode ? 'text-gray-400' : ''}>
                USD/TRY kuru ayarlarını yönetin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-currency" className={darkMode ? 'text-gray-300' : ''}>Otomatik Kur Güncellemesi</Label>
                <Switch
                  id="auto-currency"
                  checked={autoUpdateCurrency}
                  onCheckedChange={setAutoUpdateCurrency}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="usd-try" className={darkMode ? 'text-gray-300' : ''}>USD/TRY Kuru</Label>
                <div className="flex space-x-2">
                  <Input
                    id="usd-try"
                    type="number"
                    step="0.01"
                    value={usdToTry}
                    onChange={(e) => setUsdToTry(Number(e.target.value))}
                    disabled={autoUpdateCurrency}
                    className={`flex-1 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                  />
                  <Button
                    onClick={handleManualCurrencyUpdate}
                    disabled={loading || !autoUpdateCurrency}
                    variant="outline"
                    className={darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : ''}
                  >
                    {loading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {lastCurrencyUpdate && (
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Son güncelleme: {lastCurrencyUpdate.toLocaleString('tr-TR')}
                  </p>
                )}
              </div>

              <div className={`p-3 rounded-lg ${darkMode ? 'bg-blue-900/50' : 'bg-blue-50'}`}>
                <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                  <strong>Güncel Kur:</strong> ₺{usdToTry} = $1.00
                </p>
                <p className={`text-xs mt-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  {autoUpdateCurrency ? "Döviz.com'dan otomatik güncelleniyor" : "Manuel olarak ayarlandı"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Görünüm Ayarları */}
          <Card className={darkMode ? 'bg-gray-800 border-gray-700' : ''}>
            <CardHeader>
              <CardTitle className={`flex items-center ${darkMode ? 'text-white' : ''}`}>
                {darkMode ? (
                  <Moon className="h-5 w-5 mr-2 text-indigo-400" />
                ) : (
                  <Sun className="h-5 w-5 mr-2 text-yellow-500" />
                )}
                Görünüm Ayarları
              </CardTitle>
              <CardDescription className={darkMode ? 'text-gray-400' : ''}>
                Arayüz tercihlerinizi ayarlayın
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="dark-mode" className={`flex items-center ${darkMode ? 'text-gray-300' : ''}`}>
                  {darkMode ? (
                    <Moon className="h-4 w-4 mr-2 text-indigo-400" />
                  ) : (
                    <Sun className="h-4 w-4 mr-2 text-yellow-500" />
                  )}
                  Gece Modu
                </Label>
                <Switch
                  id="dark-mode"
                  checked={darkMode}
                  onCheckedChange={handleDarkModeToggle}
                />
              </div>

              <div className={`p-3 rounded-lg ${darkMode ? 'bg-indigo-900/50' : 'bg-indigo-50'}`}>
                <p className={`text-sm ${darkMode ? 'text-indigo-300' : 'text-indigo-800'}`}>
                  <strong>Aktif Tema:</strong> {darkMode ? 'Gece Modu' : 'Gündüz Modu'}
                </p>
                <p className={`text-xs mt-1 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  Tema değişiklikleri anında uygulanır
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Bildirim Ayarları */}
          <Card className={darkMode ? 'bg-gray-800 border-gray-700' : ''}>
            <CardHeader>
              <CardTitle className={`flex items-center ${darkMode ? 'text-white' : ''}`}>
                <Bell className="h-5 w-5 mr-2 text-yellow-600" />
                Bildirim Ayarları
              </CardTitle>
              <CardDescription className={darkMode ? 'text-gray-400' : ''}>
                Bildirim tercihlerinizi yönetin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications" className={darkMode ? 'text-gray-300' : ''}>Bildirimleri Etkinleştir</Label>
                <Switch
                  id="notifications"
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="auto-sync" className={darkMode ? 'text-gray-300' : ''}>Otomatik Senkronizasyon</Label>
                <Switch
                  id="auto-sync"
                  checked={autoSync}
                  onCheckedChange={setAutoSync}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="language" className={darkMode ? 'text-gray-300' : ''}>Dil</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={darkMode ? 'bg-gray-700 border-gray-600' : ''}>
                    <SelectItem value="tr" className={darkMode ? 'text-white hover:bg-gray-600' : ''}>🇹🇷 Türkçe</SelectItem>
                    <SelectItem value="en" className={darkMode ? 'text-white hover:bg-gray-600' : ''}>🇺🇸 English</SelectItem>
                    <SelectItem value="de" className={darkMode ? 'text-white hover:bg-gray-600' : ''}>🇩🇪 Deutsch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Hesap Ayarları */}
          <Card className={darkMode ? 'bg-gray-800 border-gray-700' : ''}>
            <CardHeader>
              <CardTitle className={`flex items-center ${darkMode ? 'text-white' : ''}`}>
                <User className="h-5 w-5 mr-2 text-blue-600" />
                Hesap Ayarları
              </CardTitle>
              <CardDescription className={darkMode ? 'text-gray-400' : ''}>
                Hesap ve güvenlik ayarlarınız
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className={darkMode ? 'text-gray-300' : ''}>Hesap Durumu</Label>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="border-green-500 text-green-700">
                    <Shield className="h-3 w-3 mr-1" />
                    Aktif
                  </Badge>
                  <Badge variant="outline" className="border-blue-500 text-blue-700">
                    <Wifi className="h-3 w-3 mr-1" />
                    Bağlı
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label className={darkMode ? 'text-gray-300' : ''}>Plan</Label>
                <div className={`flex items-center justify-between p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div>
                    <p className={`font-medium ${darkMode ? 'text-white' : ''}`}>Ücretsiz Plan</p>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>5 mağaza, temel özellikler</p>
                  </div>
                  <Button variant="outline" size="sm" className={darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-600' : ''}>
                    Yükselt
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20">
                  Hesabı Sil
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kaydet Butonu - Alt */}
        <div className="mt-8 flex justify-center">
          <Button 
            onClick={saveSettings}
            disabled={saving}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 px-8"
          >
            {saving ? (
              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Save className="h-5 w-5 mr-2" />
            )}
            {saving ? "Kaydediliyor..." : "Tüm Ayarları Kaydet"}
          </Button>
        </div>
      </main>
    </div>
  )
} 