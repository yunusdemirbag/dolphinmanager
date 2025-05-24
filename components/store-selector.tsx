"use client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Store, ChevronDown, CheckCircle, Settings, Plus } from "lucide-react"

interface StoreSelectorProps {
  stores: any[]
  selectedStore: string | null
  onStoreChange: (storeId: string) => void
  showAddStore?: boolean
}

export default function StoreSelector({
  stores,
  selectedStore,
  onStoreChange,
  showAddStore = false,
}: StoreSelectorProps) {
  const currentStore = stores.find((store) => store.id === selectedStore) || stores[0]

  if (stores.length === 0) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg">
        <Store className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-600">Mağaza bağlanmamış</span>
      </div>
    )
  }

  if (stores.length === 1) {
    return (
      <div className="flex items-center space-x-3 px-3 py-2 bg-orange-50 rounded-lg border border-orange-200">
        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
          <img src="/dolphin-logo.svg" alt="Store" className="w-5 h-5 opacity-70" />
        </div>
        <div>
          <p className="font-medium text-orange-900">{currentStore?.shop_name}</p>
          <p className="text-xs text-orange-600">{currentStore?.listing_active_count} ürün</p>
        </div>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center space-x-2 h-auto p-3 border-orange-200 hover:bg-orange-50"
        >
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
            <img src="/dolphin-logo.svg" alt="Store" className="w-5 h-5 opacity-70" />
          </div>
          <div className="text-left">
            <p className="font-medium text-sm">{currentStore?.shop_name}</p>
            <p className="text-xs text-gray-600">{currentStore?.listing_active_count} ürün</p>
          </div>
          <div className="flex items-center space-x-1">
            <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-0">
              {stores.length}
            </Badge>
            <ChevronDown className="w-4 h-4" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Mağazalarınız ({stores.length}/5)</span>
          {showAddStore && (
            <Button size="sm" variant="ghost" className="h-6 px-2">
              <Plus className="w-3 h-3" />
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {stores.map((store, index) => (
          <DropdownMenuItem
            key={store.id}
            onClick={() => onStoreChange(store.id)}
            className="flex items-center justify-between p-3 cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                {store.image_url ? (
                  <img
                    src={store.image_url || "/placeholder.svg"}
                    alt={store.shop_name}
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                ) : (
                  <img src="/dolphin-logo.svg" alt="Store" className="w-6 h-6 opacity-70" />
                )}
              </div>
              <div>
                <p className="font-medium">{store.shop_name}</p>
                <div className="flex items-center space-x-2 text-xs text-gray-600">
                  <span>{store.listing_active_count} ürün</span>
                  <span>•</span>
                  <span>{store.num_favorers} takipçi</span>
                  {index === 0 && (
                    <>
                      <span>•</span>
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        Ana
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {store.id === selectedStore && <CheckCircle className="w-4 h-4 text-green-600" />}
              <Badge
                variant="secondary"
                className={`text-xs ${store.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}
              >
                {store.is_active ? "Aktif" : "Pasif"}
              </Badge>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => (window.location.href = "/stores")} className="text-orange-600">
          <Settings className="w-4 h-4 mr-2" />
          Mağazaları Yönet
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
