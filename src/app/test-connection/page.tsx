"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"

export default function TestConnectionPage() {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const testConnection = async () => {
    setTesting(true)
    setResult(null)

    try {
      const response = await fetch("/api/test-connection")
      const data = await response.json()

      setResult({
        success: data.success,
        message: data.success ? "Supabase bağlantısı başarılı!" : data.error || "Bağlantı hatası",
      })
    } catch (error) {
      setResult({
        success: false,
        message: "Test sırasında hata oluştu",
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Supabase Bağlantı Testi</CardTitle>
          <CardDescription>Veritabanı bağlantınızı test edin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}

          <Button onClick={testConnection} disabled={testing} className="w-full">
            {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            Bağlantıyı Test Et
          </Button>

          <div className="text-sm text-gray-600 space-y-2">
            <p>✅ Environment variables ayarlandı</p>
            <p>✅ Supabase URL: qbdzcmqcsnevzhpzdhkx.supabase.co</p>
            <p>✅ API anahtarları eklendi</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
