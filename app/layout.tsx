import * as React from "react"
import { Button } from "@/components/ui/button"
import { Plus, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import "./globals.css"

export const metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr">
      <body>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <header className="bg-white shadow-sm border-b sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <img src="/dolphin-logo.svg" alt="Dolphin Manager" className="w-6 h-6" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">Dolphin Manager</h1>
                </div>
                <div className="flex items-center space-x-4">
                  <Button variant="outline" size="sm">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Raporlar
                  </Button>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni Ürün
                  </Button>
                </div>
              </div>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  )
}
