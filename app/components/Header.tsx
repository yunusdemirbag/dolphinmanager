"use client"

import { Button } from "@/components/ui/button"
import { Plus, BarChart3, LogOut, Package, ShoppingBag, Home } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { createClientSupabase } from "@/lib/supabase"

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientSupabase()
  
  const isOnboarding = pathname?.includes("/onboarding")
  const isAuth = pathname?.includes("/auth")

  if (isOnboarding || isAuth) return null

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center cursor-pointer" onClick={() => handleNavigation("/dashboard")}>
              <span className="text-white font-bold text-lg">D</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 cursor-pointer" onClick={() => handleNavigation("/dashboard")}>
              Dolphin Manager
            </h1>
          </div>
          
          {/* Navigation Menu */}
          <div className="hidden md:flex items-center space-x-2">
            <Button 
              variant={pathname === "/dashboard" ? "default" : "ghost"} 
              size="sm"
              onClick={() => handleNavigation("/dashboard")}
            >
              <Home className="w-4 h-4 mr-2" />
              Ana Sayfa
            </Button>
            <Button 
              variant={pathname === "/products" ? "default" : "ghost"} 
              size="sm"
              onClick={() => handleNavigation("/products")}
            >
              <Package className="w-4 h-4 mr-2" />
              Ürünler
            </Button>
            <Button 
              variant={pathname === "/orders" ? "default" : "ghost"} 
              size="sm"
              onClick={() => handleNavigation("/orders")}
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Siparişler
            </Button>
            <Button 
              variant={pathname === "/analytics" ? "default" : "ghost"} 
              size="sm"
              onClick={() => handleNavigation("/analytics")}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Analitikler
            </Button>
          </div>

          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleNavigation("/products/new")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Yeni Ürün
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Çıkış
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
} 