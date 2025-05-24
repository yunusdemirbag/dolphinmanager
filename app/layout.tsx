"use client"

import * as React from "react"
import "./globals.css"
import { Header } from "./components/Header"

export const metadata = {
  title: "Dolphin Manager",
  description: "Etsy mağaza yönetim aracı",
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
          <Header />
          {children}
        </div>
      </body>
    </html>
  )
}
