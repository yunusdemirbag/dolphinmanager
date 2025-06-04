"use client"

import { useState, useEffect, useCallback } from "react"
import { Product, CreateProductForm } from "@/types/product"
import { toast } from "@/components/ui/use-toast"

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize] = useState(100)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [etsyConnected, setEtsyConnected] = useState(true)
  const [reconnectRequired, setReconnectRequired] = useState(false)
  const [noStoresFound, setNoStoresFound] = useState(false)
  const [currentStore, setCurrentStore] = useState<{ shop_name: string; shop_id: number } | null>(null)

  const loadProducts = async (page = currentPage) => {
    try {
      setLoading(true)
      setCurrentPage(page)
      setNoStoresFound(false)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        skip_cache: 'true',
      })
      
      const response = await fetch(`/api/etsy/listings?${params}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      
      if (response.status === 401) {
        setEtsyConnected(false)
        setReconnectRequired(true)
        toast({
          title: "Etsy bağlantısı gerekiyor",
          description: "Oturum süresi dolmuş. Etsy mağazanıza yeniden bağlanmanız gerekiyor.",
          variant: "destructive"
        })
        return
      }
      
      if (!response.ok) {
        let errorMessage = "Bilinmeyen bir hata oluştu"
        try {
          const textResponse = await response.text()
          try {
            const errorData = JSON.parse(textResponse)
            errorMessage = errorData.error || errorData.details || textResponse
          } catch {
            errorMessage = textResponse || `API error: ${response.status} ${response.statusText}`
          }
        } catch (e) {
          errorMessage = `API error: ${response.status} ${response.statusText}`
        }
        
        if (errorMessage === "No stores found") {
          setNoStoresFound(true)
          setEtsyConnected(false)
          toast({
            title: "Etsy mağazası bulunamadı",
            description: "Henüz Etsy mağazanızı bağlamamışsınız veya bağlantı kopmuş.",
            variant: "destructive"
          })
          return
        }
        
        if (errorMessage.toLowerCase().includes('token') || 
            errorMessage.toLowerCase().includes('connect') || 
            errorMessage.toLowerCase().includes('auth')) {
          setReconnectRequired(true)
          setEtsyConnected(false)
          toast({
            title: "Etsy bağlantısı gerekiyor",
            description: "Bağlantı süresi dolmuş. Etsy mağazanıza yeniden bağlanmanız gerekiyor.",
            variant: "destructive"
          })
        } else {
          toast({
            title: "Ürünler yüklenemedi",
            description: errorMessage,
            variant: "destructive"
          })
        }
        return
      }
      
      const data = await response.json()
      
      if (data.listings && Array.isArray(data.listings)) {
        setProducts(data.listings)
        setTotalPages(data.total_pages || 1)
        setTotalCount(data.count || 0)
        
        if (data.shop_id) {
          setCurrentStore(prev => ({
            shop_id: data.shop_id,
            shop_name: prev?.shop_name || `Mağaza #${data.shop_id}`
          }))
          
          if (!currentStore?.shop_name || currentStore.shop_name.includes('#')) {
            fetchStoreDetails(data.shop_id)
          }
        }
        
        setReconnectRequired(false)
        setEtsyConnected(true)
      } else {
        if (data.error && typeof data.error === 'string' && 
            (data.error.toLowerCase().includes('token') || 
             data.error.toLowerCase().includes('auth') || 
             data.error.toLowerCase().includes('connect'))) {
          setReconnectRequired(true)
          setEtsyConnected(false)
          toast({
            title: "Etsy bağlantısı gerekiyor",
            description: "Etsy mağazanıza yeniden bağlanmanız gerekiyor.",
            variant: "destructive"
          })
        } else {
          toast({
            title: "Ürün bulunamadı",
            description: "Mağazanızda hiç ürün bulunamadı veya veri alınamadı.",
            variant: "destructive"
          })
        }
      }
    } catch (error) {
      console.error("Error loading products:", error)
      toast({
        title: "Hata",
        description: "Ürünler yüklenirken bir hata oluştu",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStoreDetails = async (shopId: number) => {
    try {
      const response = await fetch('/api/etsy/stores', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      if (!response.ok) {
        console.error("Error fetching store details:", response.status)
        return
      }
      
      const data = await response.json()
      
      if (data.stores && Array.isArray(data.stores) && data.stores.length > 0) {
        const matchingStore = data.stores.find((store: any) => 
          store.shop_id === shopId || parseInt(store.shop_id) === shopId
        )
        
        if (matchingStore) {
          setCurrentStore({
            shop_id: matchingStore.shop_id,
            shop_name: matchingStore.shop_name || `Mağaza #${matchingStore.shop_id}`
          })
        }
      }
    } catch (error) {
      console.error("Failed to fetch store details:", error)
    }
  }

  const handleReconnectEtsy = async () => {
    try {
      setRefreshing(true)
      
      const res = await fetch('/api/etsy/auth-url')
      
      if (!res.ok) {
        throw new Error(`Bağlantı URL'si alınamadı: ${res.status}`)
      }
      
      const data = await res.json()
      
      if (data.url) {
        toast({
          title: "Etsy bağlantısı yenileniyor",
          description: "Etsy sayfasına yönlendiriliyorsunuz. Lütfen Etsy hesabınıza izin verin.",
          variant: "default",
        })
        
        setTimeout(() => {
          window.location.href = data.url
        }, 1500)
      } else {
        throw new Error(data.error || "Bağlantı URL'si alınamadı")
      }
    } catch (error) {
      console.error("Auth URL error:", error)
      
      toast({
        title: "Bağlantı Hatası",
        description: error instanceof Error ? error.message : "Bağlantı başlatılırken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.",
        variant: "destructive",
      })
    } finally {
      setRefreshing(false)
    }
  }

  const handleCreateProduct = async (form: CreateProductForm) => {
    try {
      const response = await fetch("/api/etsy/listings/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          price: form.price && {
            amount: Math.round((form.price as number) * 100),
            divisor: 100,
            currency_code: "USD"
          }
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create product")
      }

      const data = await response.json()
      
      toast({
        title: "Başarılı!",
        description: "Ürün başarıyla oluşturuldu",
      })

      await loadProducts(1)
      return data.listing
    } catch (error) {
      console.error("Error creating product:", error)
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Ürün oluşturulamadı",
        variant: "destructive",
      })
      throw error
    }
  }

  const handleUpdateProduct = async (product: Product) => {
    try {
      const response = await fetch(`/api/etsy/listings/${product.listing_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify(product)
      })

      if (!response.ok) {
        throw new Error("Failed to update product")
      }

      toast({
        title: "Başarılı",
        description: "Ürün başarıyla güncellendi.",
        variant: "default",
      })

      await loadProducts(currentPage)
    } catch (error) {
      console.error("Update product error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update product",
        variant: "destructive",
      })
      throw error
    }
  }

  const handleDeleteProduct = async (listingId: number) => {
    try {
      const response = await fetch(`/api/etsy/listings/${listingId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error("Failed to delete product")
      }

      toast({
        title: "Başarılı",
        description: "Ürün başarıyla silindi",
        variant: "default",
      })

      setProducts(prevProducts => prevProducts.filter(p => p.listing_id !== listingId))
      setFilteredProducts(prevFiltered => prevFiltered.filter(p => p.listing_id !== listingId))
    } catch (error) {
      console.error("Delete product error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete product",
        variant: "destructive",
      })
      throw error
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  return {
    products,
    filteredProducts,
    loading,
    currentPage,
    totalPages,
    totalCount,
    pageSize,
    refreshing,
    lastRefresh,
    etsyConnected,
    reconnectRequired,
    noStoresFound,
    currentStore,
    loadProducts,
    handleReconnectEtsy,
    handleCreateProduct,
    handleUpdateProduct,
    handleDeleteProduct,
    setFilteredProducts
  }
} 