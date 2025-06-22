"use client"

import { usePathname, useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase/client"
import { useAuth } from "@/lib/auth/client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Home,
  LineChart,
  Package,
  Package2,
  PanelLeft,
  ShoppingCart,
  Users2,
} from "lucide-react"
import CurrentStoreNameBadge from "@/app/components/CurrentStoreNameBadge"

export default function Header() {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    try {
      await signOut(auth)
      await fetch('/api/auth/session', { method: 'DELETE' })
      router.push("/auth/login")
      router.refresh()
    } catch (error) {
      console.error("Çıkış yaparken hata oluştu:", error)
      router.push("/auth/login")
    }
  }
  
  const isAuthPage = pathname.startsWith('/auth')

  // Kullanıcı yoksa veya auth sayfasındaysa header'ı gösterme
  if (!user || isAuthPage) {
    return null;
  }

  // Bu noktadan sonra TypeScript user nesnesinin var olduğunu bilir.
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs">
          <nav className="grid gap-6 text-lg font-medium">
            <Link
              href="/dashboard"
              className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
            >
              <Package2 className="h-5 w-5 transition-all group-hover:scale-110" />
              <span className="sr-only">Dolphin Manager</span>
            </Link>
            <Link href="/dashboard" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
              <Home className="h-5 w-5" />
              Dashboard
            </Link>
            <Link href="/orders" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
              <ShoppingCart className="h-5 w-5" />
              Siparişler
            </Link>
            <Link href="/products" className="flex items-center gap-4 px-2.5 text-foreground">
              <Package className="h-5 w-5" />
              Ürünler
            </Link>
            <Link href="/customer-management" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
              <Users2 className="h-5 w-5" />
              Müşteriler
            </Link>
            <Link href="/analytics" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
              <LineChart className="h-5 w-5" />
              Analizler
            </Link>
          </nav>
        </SheetContent>
      </Sheet>
      
      <div className="relative ml-auto flex-1 md:grow-0">
        <CurrentStoreNameBadge />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="overflow-hidden rounded-full"
          >
            <Users2 className="h-5 w-5" />
            <span className="sr-only">Kullanıcı menüsünü aç</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push('/settings')}>Ayarlar</DropdownMenuItem>
          <DropdownMenuItem>Destek</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>Çıkış Yap</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
} 