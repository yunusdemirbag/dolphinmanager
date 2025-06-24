import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dolphin Manager",
  description: "Hiper-modern Etsy ürün yönetim sistemi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${inter.className} antialiased`} style={{backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }} suppressHydrationWarning={true}>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <main className="container mx-auto py-8 px-4">
            {children}
          </main>
          <Toaster />
        </div>
      </body>
    </html>
  );
}
