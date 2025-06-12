"use client"

import { useState } from "react"
import { Button } from "../../components/ui/button"
import { 
  Home, 
  Package, 
  ShoppingBag, 
  BarChart3, 
  Bot, 
  DollarSign,
  Search,
  Store,
  Users,
  TrendingUp,
  Settings,
  LogOut,
  Sparkles,
  CreditCard
} from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { createClientSupabase } from "@/lib/supabase"

export function Sidebar({ currentStoreName }: { currentStoreName?: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
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

  const menuItems = [
    {
      section: "ANA MENÜ",
      items: [
        { icon: BarChart3, label: "Dashboard", path: "/dashboard" },
        { icon: Store, label: "Mağazalar", path: "/stores" },
        { icon: ShoppingBag, label: "Ürünler", path: "/products" },
        { icon: Package, label: "Siparişler", path: "/orders" },
        { icon: Sparkles, label: "Dolphin AI", path: "/dolphin-ai" },
        { icon: DollarSign, label: "Maliyetler", path: "/costs" },
        { icon: CreditCard, label: "Finans", path: "/finance" },
      ]
    },
    {
      section: "YÖNETİM",
      items: [
        { icon: Users, label: "Müşteri Yönetimi", path: "/customer-management" },
        { icon: TrendingUp, label: "Marketing", path: "/marketing" },
        { icon: Search, label: "SEO Optimizer", path: "/seo-optimizer" },
        { icon: Settings, label: "Ayarlar", path: "/settings" },
      ]
    }
  ]

  return (
    <div 
      className={`${isExpanded ? 'w-64' : 'w-16'} bg-white border-r border-gray-200 h-screen fixed left-0 top-0 z-40 flex flex-col transition-all duration-300 ease-in-out`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div 
          className="flex items-center space-x-3 cursor-pointer" 
          onClick={() => handleNavigation("/dashboard")}
        >
          <div className="w-8 h-8 bg-black rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">D</span>
          </div>
          {isExpanded && (
            <h1 className="text-xl font-bold text-black whitespace-nowrap">Dolphin Manager</h1>
          )}
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 overflow-y-auto py-4">
        {menuItems.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-6">
            {isExpanded && (
              <h3 className="px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {section.section}
              </h3>
            )}
            <nav className="space-y-1 px-3">
              {section.items.map((item, itemIndex) => {
                const Icon = item.icon
                const isActive = pathname === item.path
                return (
                  <button
                    key={itemIndex}
                    onClick={() => handleNavigation(item.path)}
                    className={`w-full flex items-center ${isExpanded ? 'px-3' : 'px-2 justify-center'} py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-gray-100 text-black border-r-2 border-black"
                        : "text-gray-600 hover:bg-gray-50 hover:text-black"
                    }`}
                    title={!isExpanded ? item.label : undefined}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? "text-black" : "text-gray-400"} ${isExpanded ? 'mr-3' : ''} flex-shrink-0`} />
                    {isExpanded && (
                      <span className="whitespace-nowrap">{item.label}</span>
                    )}
                  </button>
                )
              })}
            </nav>
            {/* Ayarlar'dan sonra mağaza adı */}
            {section.section === "YÖNETİM" && isExpanded && (
              <div className="mt-8 mb-2 flex flex-col items-start">
                {currentStoreName && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium mt-2 shadow-sm">
                    <Store className="w-4 h-4 mr-1 text-black" />
                    {currentStoreName}
                  </span>
                )}
              </div>
            )}
            {section.section === "YÖNETİM" && !isExpanded && (
              <div className="mt-4 flex flex-col items-center">
                {currentStoreName && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-[10px] font-medium mt-2 shadow-sm">
                    <Store className="w-3 h-3 mr-1 text-black" />
                    {currentStoreName.length > 10 ? currentStoreName.slice(0, 10) + '…' : currentStoreName}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <Button 
          variant="ghost" 
          className={`w-full ${isExpanded ? 'justify-start' : 'justify-center px-2'} text-gray-600 hover:text-black hover:bg-gray-50`}
          onClick={handleLogout}
          title={!isExpanded ? "Çıkış" : undefined}
        >
          <LogOut className={`h-5 w-5 ${isExpanded ? 'mr-3' : ''} flex-shrink-0`} />
          {isExpanded && "Çıkış"}
        </Button>
      </div>
    </div>
  )
} 