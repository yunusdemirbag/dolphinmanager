import * as React from "react"
import "./globals.css"
import SidebarWithStoreName from "./components/SidebarWithStoreName"

export const metadata = {
  title: "Dolphin Manager",
  description: "Etsy mağaza yönetim aracı",
  generator: "v0.dev",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="bg-gray-50" suppressHydrationWarning>
        <SidebarWithStoreName />
        <main className="ml-16 md:ml-64 min-h-screen">{children}</main>
      </body>
    </html>
  )
}
