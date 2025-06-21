"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Filter, ArrowDownUp, ArrowUp, ArrowDown, LayoutGrid, List } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function ProductFilters({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  gridType,
  setGridType,
  totalCount,
  refreshing,
  onRefresh,
  onCreateNew
}: {
  searchTerm: string
  setSearchTerm: (value: string) => void
  filterStatus: string
  setFilterStatus: (value: string) => void
  sortBy: string
  setSortBy: (value: string) => void
  sortOrder: 'asc' | 'desc'
  setSortOrder: (value: 'asc' | 'desc') => void
  gridType: 'grid3' | 'grid4' | 'grid5' | 'list'
  setGridType: (value: 'grid3' | 'grid4' | 'grid5' | 'list') => void
  totalCount?: number
  refreshing?: boolean
  onRefresh?: () => void
  onCreateNew?: () => void
}) {
  return (
    <div className="space-y-4">
      {/* Tabs for quick filtering */}
      <Tabs 
        value={filterStatus === "draft" ? "draft" : filterStatus === "active" ? "active" : "all"} 
        onValueChange={(value) => setFilterStatus(value)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Tüm Ürünler</TabsTrigger>
          <TabsTrigger value="active">Aktif Ürünler</TabsTrigger>
          <TabsTrigger value="draft">Taslak Ürünler</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Ürün ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select
            value={sortBy}
            onValueChange={setSortBy}
          >
            <SelectTrigger className="w-[160px]">
              <ArrowDownUp className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Sıralama" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_timestamp">Eklenme Tarihi</SelectItem>
              <SelectItem value="title">İsim</SelectItem>
              <SelectItem value="price">Fiyat</SelectItem>
              <SelectItem value="quantity">Stok</SelectItem>
              <SelectItem value="views">Görüntülenme</SelectItem>
              <SelectItem value="sold">Satış</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="h-10 w-10"
          >
            {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          </Button>
          
          <div className="flex rounded-md border">
            <Button
              variant={gridType === 'grid3' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => onGridTypeChange('grid3')}
              className="h-10 w-10 rounded-none rounded-l-md"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={gridType === 'grid5' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => onGridTypeChange('grid5')}
              className="h-10 w-10 rounded-none"
            >
              <div className="grid grid-cols-2 gap-px w-4 h-4">
                <div className="bg-current rounded-sm" />
                <div className="bg-current rounded-sm" />
                <div className="bg-current rounded-sm" />
                <div className="bg-current rounded-sm" />
              </div>
            </Button>
            <Button
              variant={gridType === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => onGridTypeChange('list')}
              className="h-10 w-10 rounded-none rounded-r-md"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 