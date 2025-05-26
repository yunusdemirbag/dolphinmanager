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
            <span className="font-medium truncate">{currentStore?.shop_name}</span>
          </div>
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
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
                {index === 0 && (
                  <Badge variant="outline" className="text-xs px-1 py-0 mt-0.5">
                    Ana
                  </Badge>
                )}
              </div>
            </div>
            {store.id === selectedStore && <CheckCircle className="w-4 h-4 text-green-600" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => (window.location.href = "/stores")} className="text-blue-600">
          <Settings className="w-4 h-4 mr-2" />
          Mağaza Ayarları
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
