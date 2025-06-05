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
import { Store, ChevronDown, CheckCircle, Settings, Plus, BarChart2, ArrowUpDown, ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"

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
  const router = useRouter();
  const currentStore = stores.find((store) => store.id === selectedStore) || stores[0]

  if (stores.length === 0) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg text-sm">
        <Store className="w-4 h-4 text-gray-500" />
        <span className="text-gray-600">Mağaza bağlanmamış</span>
      </div>
    )
  }

  if (stores.length === 1) {
    return (
      <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
        <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center">
          <Store className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <div className="truncate">
          <p className="font-medium text-sm text-gray-800">{currentStore?.shop_name}</p>
          <p className="text-xs text-gray-500">Aktif Ürün: {currentStore?.listing_active_count || 0}</p>
        </div>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center justify-between w-full p-2 border-blue-200 hover:bg-blue-50 h-auto text-sm"
        >
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center">
              <Store className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div>
              <span className="font-medium truncate">{currentStore?.shop_name}</span>
              {currentStore?.listing_active_count && (
                <p className="text-xs text-gray-500">Aktif Ürün: {currentStore?.listing_active_count}</p>
              )}
            </div>
          </div>
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Mağazalarınız</span>
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
            className="flex items-center justify-between p-2 cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-blue-100 rounded-md flex items-center justify-center">
                <Store className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm">{store.shop_name}</p>
                <div className="flex items-center mt-0.5 space-x-1">
                  {index === 0 && (
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      Ana
                    </Badge>
                  )}
                  <span className="text-xs text-gray-500">Ürün: {store.listing_active_count || 0}</span>
                </div>
                <div className="flex items-center mt-0.5 space-x-1">
                  {store.review_count > 0 && (
                    <span className="text-xs text-gray-500">
                      ⭐ {store.review_average?.toFixed(1) || 0} ({store.review_count})
                    </span>
                  )}
                </div>
              </div>
            </div>
            {store.id === selectedStore && <CheckCircle className="w-4 h-4 text-green-600" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/analytics/stores")} className="text-blue-600">
          <ArrowUpDown className="w-4 h-4 mr-2" />
          Mağazaları Karşılaştır
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/stores")} className="text-blue-600">
          <Settings className="w-4 h-4 mr-2" />
          Mağaza Ayarları
        </DropdownMenuItem>
        {currentStore?.url && (
          <DropdownMenuItem 
            onClick={() => window.open(currentStore.url, '_blank')}
            className="text-emerald-600"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Etsy'de Görüntüle
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
