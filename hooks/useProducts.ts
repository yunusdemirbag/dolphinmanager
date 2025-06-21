"use client"

import { useState, useEffect, useCallback } from "react"
import { Product, CreateProductForm } from "@/types/product"
import { toast } from "@/components/ui/use-toast"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged, getIdToken } from "firebase/auth"
import { useRouter } from "next/navigation"
import { createClientFromBrowser } from "@/lib/supabase/client"

interface CreateListingResponse {
  success: boolean;
  listing_id?: number;
  listing?: {
    listing_id: number;
    [key: string]: any;
  };
  message: string;
}

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
  
  // Firebase authentication
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const loadProducts = async (page = currentPage) => {
    setLoading(true)
    setCurrentPage(page)
    setNoStoresFound(false)
    setError(null)
    
    try {
      // Firebase auth token'ını al
      const user = auth.currentUser
      
      if (!user) {
        console.log('Firebase auth token bulunamadı')
        
        // Kullanıcı oturum açmamış, Etsy bağlantısı gerektiğini göster
        setNoStoresFound(true)
        setEtsyConnected(false)
        setProducts([])
        setLoading(false)
        return
      }

      try {
        const token = await getIdToken(user)
        
        const params = new URLSearchParams({
          page: page.toString(),
          limit: pageSize.toString(),
          skip_cache: 'true',
        })
        
        const response = await fetch(`/api/etsy/listings?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
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
          setProducts([])
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
            setProducts([])
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
            setProducts([])
          } else {
            toast({
              title: "Ürünler yüklenemedi",
              description: errorMessage,
              variant: "destructive"
            })
            setProducts([])
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
            setProducts([])
          } else {
            toast({
              title: "Ürün bulunamadı",
              description: "Mağazanızda hiç ürün bulunamadı veya veri alınamadı.",
              variant: "destructive"
            })
            setProducts([])
          }
        }
      } catch (fetchError: any) {
        console.error('Ürünleri getirme hatası:', fetchError)
        setError(`Ürünler yüklenirken hata oluştu: ${fetchError.message}`)
        setProducts([])
      }
    } catch (authError: any) {
      console.error('Auth hatası:', authError)
      setError(`Kimlik doğrulama hatası: ${authError.message}`)
      setProducts([])
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

  const handleCreateProduct = async (productData: Partial<Product>, state: "draft" | "active" = "active"): Promise<CreateListingResponse> => {
    try {
      const response = await fetch('/api/etsy/listings/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...productData,
          state
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create listing');
      }

      // Refresh the products list
      loadProducts();
      
      return data;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
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

  // Firebase auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setAuthLoading(false)
      
      if (user) {
        loadProducts()
      } else {
        setLoading(false)
        // Kullanıcıyı login sayfasına yönlendirmeyi kaldırıyoruz
        // Middleware zaten gerekirse yönlendirme yapacak
        // router.push('/auth/login') - Bu satırı kaldırdık
      }
    })
    
    return () => unsubscribe()
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

function mockProducts(): Product[] {
  return [
    {
      listing_id: 1001,
      title: "Modern Soyut Kanvas Tablo - Mavi Tonlar",
      description: "Modern ev dekorasyonu için şık ve zarif soyut kanvas tablo. Mavi tonların hakim olduğu bu tablo, oturma odanız veya yatak odanız için mükemmel bir seçim.",
      price: {
        amount: 24900,
        divisor: 100,
        currency_code: "TRY"
      },
      quantity: 4,
      taxonomy_id: 1027,
      state: "active",
      shipping_profile_id: 1,
      has_variations: false,
      tags: ["kanvas", "tablo", "mavi", "dekorasyon", "duvar"],
      images: [
        {
          url: "/placeholder.jpg",
          url_570xN: "/placeholder.jpg"
        }
      ]
    },
    {
      listing_id: 1002,
      title: "Minimalist Geometrik Duvar Sanatı - Siyah Beyaz",
      description: "Minimalist tarzda geometrik desenli duvar sanatı. Siyah ve beyaz renklerin uyumu ile modern mekanlar için ideal.",
      price: {
        amount: 19900,
        divisor: 100,
        currency_code: "TRY"
      },
      quantity: 4,
      taxonomy_id: 1027,
      state: "active",
      shipping_profile_id: 1,
      has_variations: false,
      tags: ["geometrik", "duvar", "sanat", "siyah", "beyaz", "minimalist"],
      images: [
        {
          url: "/placeholder.jpg",
          url_570xN: "/placeholder.jpg"
        }
      ]
    }
  ];
} 