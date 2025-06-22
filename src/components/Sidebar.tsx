"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  LineChart,
  Package,
  Package2,
  Settings,
  ShoppingCart,
  Users2,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function Sidebar() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname === path
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
      <TooltipProvider>
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
          <Link
            href="/dashboard"
            className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
          >
            <Package2 className="h-4 w-4 transition-all group-hover:scale-110" />
            <span className="sr-only">Dolphin Manager</span>
          </Link>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard"
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${isActive('/dashboard') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'} transition-colors hover:text-foreground md:h-8 md:w-8`}
              >
                <Home className="h-5 w-5" />
                <span className="sr-only">Dashboard</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Dashboard</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/orders"
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${isActive('/orders') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'} transition-colors hover:text-foreground md:h-8 md:w-8`}
              >
                <ShoppingCart className="h-5 w-5" />
                <span className="sr-only">Siparişler</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Siparişler</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/products"
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${isActive('/products') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'} transition-colors hover:text-foreground md:h-8 md:w-8`}
              >
                <Package className="h-5 w-5" />
                <span className="sr-only">Ürünler</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Ürünler</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/customer-management"
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${isActive('/customer-management') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'} transition-colors hover:text-foreground md:h-8 md:w-8`}
              >
                <Users2 className="h-5 w-5" />
                <span className="sr-only">Müşteriler</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Müşteriler</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/analytics"
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${isActive('/analytics') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'} transition-colors hover:text-foreground md:h-8 md:w-8`}
              >
                <LineChart className="h-5 w-5" />
                <span className="sr-only">Analizler</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Analizler</TooltipContent>
          </Tooltip>
        </nav>
        <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
              >
                <Settings className="h-5 w-5" />
                <span className="sr-only">Ayarlar</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Ayarlar</TooltipContent>
          </Tooltip>
        </nav>
      </TooltipProvider>
    </aside>
  )
} 