"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertCircle, ExternalLink, Copy, Globe } from "lucide-react"

export default function DeployCheckPage() {
  const [deployUrl, setDeployUrl] = useState("")
  const [envVars, setEnvVars] = useState({
    supabaseUrl: "",
    supabaseKey: "",
    appUrl: "",
  })

  useEffect(() => {
    // Get current URL for deploy info
    setDeployUrl(window.location.origin)

    // Check environment variables
    setEnvVars({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      appUrl: process.env.NEXT_PUBLIC_APP_URL || window.location.origin,
    })
  }, [])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const checks = [
    {
      name: "Vercel Deploy",
      status: deployUrl.includes("dolphin-app.vercel.app"),
      value: deployUrl,
    },
    {
      name: "Supabase URL",
      status: !!envVars.supabaseUrl,
      value: envVars.supabaseUrl,
    },
    {
      name: "Supabase Key",
      status: !!envVars.supabaseKey,
      value: envVars.supabaseKey ? "✓ Configured" : "❌ Missing",
    },
    {
      name: "App URL",
      status: !!envVars.appUrl,
      value: envVars.appUrl || "❌ Missing",
    },
  ]

  const allChecksPass = checks.every((check) => check.status)

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold text-xl">D</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Dolphin Manager Deploy Kontrol</h1>
          <p className="text-gray-600">Vercel deploy durumunu ve environment variables'ları kontrol edin</p>
          <Badge variant="default" className="text-lg px-4 py-2">
            🎉 Live: https://dolphinmanager.vercel.app
          </Badge>
        </div>

        {/* Overall Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {allChecksPass ? (
                <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
              )}
              Deploy Durumu
            </CardTitle>
            <CardDescription>
              {allChecksPass
                ? "✅ Tüm kontroller başarılı! Site canlı ve çalışıyor."
                : "⚠️ Bazı konfigürasyonlar eksik. Lütfen kontrol edin."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {checks.map((check, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {check.status ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className="font-medium">{check.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={check.status ? "default" : "destructive"}>{check.status ? "OK" : "FAIL"}</Badge>
                    {check.value && check.value !== "❌ Missing" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(check.value)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Etsy Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Etsy Developer Ayarları</CardTitle>
            <CardDescription>Etsy Developer Console'da yapmanız gereken ayarlar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Globe className="h-4 w-4" />
              <AlertDescription>
                <strong>Önemli:</strong> Etsy Developer Console'da callback URL'inizi güncelleyin.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Callback URL (Etsy'de güncelleyin):</label>
                <div className="flex items-center space-x-2 mt-1">
                  <code className="flex-1 p-2 bg-gray-100 rounded text-sm">
                    https://dolphin-app.vercel.app/api/etsy/callback
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard("https://dolphin-app.vercel.app/api/etsy/callback")}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Redirect URI (Etsy'de güncelleyin):</label>
                <div className="flex items-center space-x-2 mt-1">
                  <code className="flex-1 p-2 bg-gray-100 rounded text-sm">https://dolphin-app.vercel.app</code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard("https://dolphin-app.vercel.app")}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <Button asChild className="w-full">
              <a href="https://www.etsy.com/developers/your-apps" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Etsy Developer Console'u Aç
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Test Links */}
        <Card>
          <CardHeader>
            <CardTitle>Canlı Test Sayfaları</CardTitle>
            <CardDescription>Deploy sonrası test edebileceğiniz sayfalar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button asChild variant="outline">
                <a href="https://dolphinmanager.vercel.app/auth/register" target="_blank" rel="noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Kayıt Ol Sayfası
                </a>
              </Button>

              <Button asChild variant="outline">
                <a href="https://dolphinmanager.vercel.app/auth/login" target="_blank" rel="noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Giriş Yap Sayfası
                </a>
              </Button>

              <Button asChild variant="outline">
                <a href="https://dolphinmanager.vercel.app/onboarding" target="_blank" rel="noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Onboarding Sayfası
                </a>
              </Button>

              <Button asChild variant="outline">
                <a href="https://dolphinmanager.vercel.app/test-etsy" target="_blank" rel="noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Etsy Test Sayfası
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Success Message */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto h-12 w-12 bg-green-600 rounded-full flex items-center justify-center">
                <CheckCircle className="text-white h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-green-900">🎉 Site Başarıyla Canlı!</h3>
              <p className="text-green-700">
                Dolphin Manager artık <strong>https://dolphinmanager.vercel.app</strong> adresinde canlı!
              </p>
              <Button asChild className="bg-green-600 hover:bg-green-700">
                <a href="https://dolphinmanager.vercel.app" target="_blank" rel="noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Siteyi Ziyaret Et
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
