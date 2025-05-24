"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertCircle, XCircle } from "lucide-react"

export default function TestEnvPage() {
  const [envStatus, setEnvStatus] = useState<any>({})

  useEffect(() => {
    // Test environment variables
    const envVars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_ETSY_CLIENT_ID: process.env.NEXT_PUBLIC_ETSY_CLIENT_ID,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    }

    const status = Object.entries(envVars).reduce((acc, [key, value]) => {
      acc[key] = {
        exists: !!value,
        value: value ? (key.includes("KEY") ? "***HIDDEN***" : value) : "NOT SET",
        status: value ? "success" : "error",
      }
      return acc
    }, {} as any)

    setEnvStatus(status)
  }, [])

  const allGood = Object.values(envStatus).every((env: any) => env.exists)

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold text-xl">D</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Environment Variables Test</h1>
          <p className="text-gray-600">Kontrol edin ki tüm environment variables doğru ayarlanmış</p>
        </div>

        {/* Overall Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {allGood ? (
                <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 mr-2 text-red-600" />
              )}
              Environment Variables Status
            </CardTitle>
            <CardDescription>
              {allGood ? "✅ Tüm environment variables doğru ayarlanmış!" : "❌ Bazı environment variables eksik!"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(envStatus).map(([key, env]: [string, any]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {env.status === "success" ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className="font-medium">{key}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={env.status === "success" ? "default" : "destructive"}>
                      {env.status === "success" ? "SET" : "MISSING"}
                    </Badge>
                    <code className="text-xs bg-gray-200 px-2 py-1 rounded">{env.value}</code>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {!allGood && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Eksik Environment Variables:</strong>
              <br />
              Lütfen .env.local dosyanızı kontrol edin ve eksik değişkenleri ekleyin. Vercel'de deploy ettiyseniz,
              Vercel dashboard'dan environment variables'ları ekleyin.
            </AlertDescription>
          </Alert>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Nasıl Düzeltilir?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Local Development:</h4>
              <p className="text-sm text-gray-600 mb-2">Proje root'unda .env.local dosyası oluşturun:</p>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                {`NEXT_PUBLIC_SUPABASE_URL=https://qbdzcmqcsnevzhpzdhkx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_ETSY_CLIENT_ID=vqxojc8ud4eyk1ovhj3u7vzn
NEXT_PUBLIC_APP_URL=http://localhost:3000`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium mb-2">Vercel Deployment:</h4>
              <p className="text-sm text-gray-600">
                Vercel Dashboard → Project Settings → Environment Variables'dan ekleyin.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
