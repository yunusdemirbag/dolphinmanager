import * as React from "react"
import "./globals.css"
import SidebarWithStoreName from "./components/SidebarWithStoreName"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from 'sonner'
import { AuthProvider } from "@/contexts/AuthContext"

export const metadata = {
  title: "Dolphin Manager",
  description: "Etsy mağaza yönetim aracı",
  generator: "v0.dev",
}

// Kuyruk işlemcisini başlatma fonksiyonu
async function startQueueProcessor() {
  // Sadece sunucu tarafında çalıştığından emin ol
  if (typeof window !== 'undefined') {
    return; // Tarayıcı tarafında çalışıyorsa işlemi durdur
  }
  
  // Geliştirme ortamında çalışma kontrolü
  if (process.env.NODE_ENV === 'development') {
    console.log('Geliştirme ortamında kuyruk işlemcisi otomatik başlatılmıyor');
    return;
  }
  
  // APP_URL tanımlı değilse işlemi durdur
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    console.warn('NEXT_PUBLIC_APP_URL tanımlı değil, kuyruk işlemcisi başlatılamadı');
    return;
  }
  
  try {
    // Kuyruk işlemcisini başlat
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/etsy/queue-processor/start`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.QUEUE_PROCESSOR_API_KEY || ''
      }
    });
    
    if (!response.ok) {
      console.error('Kuyruk işlemcisi başlatılamadı:', await response.text());
    } else {
      console.log('Kuyruk işlemcisi başlatıldı');
    }
  } catch (error) {
    console.error('Kuyruk işlemcisi başlatılırken hata oluştu:', error);
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Kuyruk işlemcisini başlatma işlemini geçici olarak devre dışı bırakıyoruz
  // await startQueueProcessor();
  
  return (
    <html lang="tr">
      <body className="bg-gray-50" suppressHydrationWarning>
        <AuthProvider>
          <SidebarWithStoreName />
          <main className="ml-16 md:ml-64 min-h-screen px-4 md:px-8">{children}</main>
          <Toaster />
          <SonnerToaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  )
}
