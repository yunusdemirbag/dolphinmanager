import * as React from "react"
import "./globals.css"
import { Sidebar } from "./components/Sidebar"

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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const settings = localStorage.getItem('dolphin-settings');
                if (settings) {
                  const { darkMode } = JSON.parse(settings);
                  if (darkMode) {
                    document.documentElement.classList.add('dark');
                  }
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="transition-colors duration-300" suppressHydrationWarning={true}>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
          <Sidebar />
          <div className="ml-16 transition-all duration-300">
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}
