import * as React from "react"
import "./globals.css"
import SidebarWithStoreName from "./components/SidebarWithStoreName"
import { Toaster } from "@/components/ui/toaster"
import { Inter } from "next/font/google"
import ClientLayout from "@/components/ClientLayout"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Dolphin Manager",
  description: "Etsy mağaza yönetim aracı",
  generator: "v0.dev",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ClientLayout>
          <SidebarWithStoreName>
            {children}
          </SidebarWithStoreName>
        <Toaster />
        </ClientLayout>
      </body>
    </html>
  )
}
