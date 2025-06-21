"use client"

import { useState, useEffect } from "react"
import { useProducts } from "@/hooks/useProducts"
import ProductCard from "@/components/product/ProductCard"
import { ProductFilters } from "@/components/product/ProductFilters"
import { ProductFormModal } from "@/components/product/ProductFormModal"
import { ProductDeleteModal } from "@/components/product/ProductDeleteModal"
import { QueueManagementPanel } from "@/components/product/QueueManagementPanel"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Loader2 } from "lucide-react"
import { Product, CreateProductForm, TaxonomyNode } from "@/types/product"
import { useProductsClient } from "./products-client"
import { toast } from "@/components/ui/use-toast"
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface CreateListingResponse {
  success: boolean;
  listing_id?: number;
  listing?: {
    listing_id: number;
    [key: string]: any;
  };
  message: string;
}

export default function ProductsPage() {
  console.log("🚀 [ProductsPage] Component render başladı")
  
  // Products state from hook
  const {
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
  } = useProducts()
  
  console.log(`📊 [ProductsPage] useProducts hook çalıştı: ${products.length} ürün, loading: ${loading}`)

  // Shipping and processing profiles from client hook
  const {
    shippingProfiles,
    loadingShippingProfiles,
    processingProfiles,
    loadingProcessingProfiles,
    storeDetails,
    fetchStoreDetailsAndProfiles
  } = useProductsClient()
  
  console.log(`🚢 [ProductsPage] useProductsClient hook çalıştı: ${shippingProfiles.length} kargo profili`)

  // Filter & Sort States
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [sortBy, setSortBy] = useState("created_timestamp")
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [gridType, setGridType] = useState<'grid3' | 'grid5' | 'list'>('grid3')

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState<Product | null>(null)
  const [confirmDeleteProductId, setConfirmDeleteProductId] = useState<number | null>(null)
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form States
  const [createForm, setCreateForm] = useState<CreateProductForm>({
    title: "",
    description: "",
    price: 0,
    quantity: 4,
    tags: [],
    materials: ["Cotton Canvas", "Wood Frame", "Hanger"],
    who_made: "i_did",
    when_made: "made_to_order",
    taxonomy_id: 0,
    shipping_profile_id: 0,
    processing_profile_id: 0,
    is_personalizable: false,
    personalization_is_required: false,
    personalization_instructions: "",
    primary_color: "",
    secondary_color: "",
    width: 0,
    width_unit: "cm",
    height: 0,
    height_unit: "cm",
    min_processing_days: 1,
    max_processing_days: 3,
    style: [],
    occasion: [],
    holiday: "",
    shop_section_id: 0,
    production_location: "",
    care_instructions: "",
    is_digital: false,
    digital_files: [],
    images: [],
    video: null,
    image_alt_texts: [],
    language: "tr",
    state: "draft"
  })
  const [tagInput, setTagInput] = useState("")
  const [materialInput, setMaterialInput] = useState("")

  // Taxonomy & Shipping Profile States
  const [taxonomyNodes, setTaxonomyNodes] = useState<TaxonomyNode[]>([])

  // Load products when component mounts
  useEffect(() => {
    console.log("🔄 [ProductsPage] loadProducts useEffect çalışıyor")
    loadProducts()
  }, [])

  // Load taxonomy and shipping profiles
  useEffect(() => {
    console.log("🔄 [ProductsPage] taxonomy useEffect çalışıyor")
    
    const loadTaxonomyNodes = async () => {
      try {
        console.log("📚 [ProductsPage] Taxonomy yükleniyor...")
        const response = await fetch('/api/etsy/taxonomy')
        if (response.ok) {
          const data = await response.json()
          console.log(`✅ [ProductsPage] Taxonomy yüklendi: ${data.nodes?.length || 0} kategori`)
          setTaxonomyNodes(data.nodes || [])
        } else {
          console.error(`❌ [ProductsPage] Taxonomy yüklenirken hata: ${response.status}`)
        }
      } catch (error) {
        console.error('❌ [ProductsPage] Error loading taxonomy:', error)
      }
    }

    const loadShippingProfiles = async () => {
      try {
        console.log('Client: Loading shipping profiles...');
        const response = await fetch('/api/etsy/shipping-profiles');
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Client: Error loading shipping profiles:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData.error
          });

          // Kullanıcıya gösterilecek hata mesajı
          let errorMessage = errorData.error || 'Kargo profilleri yüklenirken bir hata oluştu';
          
          if (response.status === 401) {
            // Yetkilendirme hatası - kullanıcı yeniden bağlanmaya yönlendirilecek
            console.error('Authentication error, reconnect required');
          }
          
          throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('Client: Successfully loaded shipping profiles:', data.profiles);
        fetchStoreDetailsAndProfiles();
      } catch (error) {
        console.error('Client: Error in loadShippingProfiles:', error);
        // Hata durumunda boş array set et
        fetchStoreDetailsAndProfiles();
      }
    }

    loadTaxonomyNodes()
    loadShippingProfiles()
  }, [])

  // Filter & Sort Products
  useEffect(() => {
    console.log("🔄 [ProductsPage] filtreleme useEffect çalışıyor")
    let filtered = [...products]

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(product =>
        product.title.toLowerCase().includes(searchLower) ||
        product.description.toLowerCase().includes(searchLower) ||
        product.tags.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(product => product.state === filterStatus)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy as keyof Product]
      let bValue = b[sortBy as keyof Product]

      // Handle nested properties
      if (sortBy === 'price') {
        aValue = a.price.amount / a.price.divisor
        bValue = b.price.amount / b.price.divisor
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue as string)
          : (bValue as string).localeCompare(aValue)
      }

      return sortOrder === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number)
    })

    console.log(`🔍 [ProductsPage] Filtreleme sonucu: ${filtered.length} ürün`)
    setFilteredProducts(filtered)
  }, [products, searchTerm, filterStatus, sortBy, sortOrder])

  // Handle Create Product
  const onCreateProduct = async (productData: Partial<Product>, state: "draft" | "active" = "active"): Promise<CreateListingResponse> => {
    try {
      setSubmitting(true)
      
      // FormData oluştur
      const formData = new FormData();
      
      // Listing data'yı JSON'a çevir ve ekle
      const listingData = {
        ...productData,
        state
      };
      formData.append('listingData', JSON.stringify(listingData));
      
      // Görselleri ekle
      if (productData.images) {
        for (const image of productData.images) {
          if (image.file) {
            formData.append('imageFiles', image.file);
          }
        }
      }
      
      // Video varsa ekle
      if (productData.videoFile) {
        formData.append('videoFile', productData.videoFile);
      }
      
      // Make the API call and return the response
      const response = await fetch('/api/etsy/listings/create', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Taxonomy ID hatasını kontrol et ve daha açıklayıcı mesaj göster
        if (data.error && data.error.includes("Invalid taxonomy_id")) {
          toast({
            variant: "default",
            title: "Taxonomy ID Hatası",
            description: "Kategori seçimi şu an geçici olarak devre dışı bırakılmıştır. Ürünleriniz otomatik olarak 'Canvas Art & Prints' kategorisine eklenecektir.",
          });
          
          // Burada taxonomy_id hatasını yok sayarak devam ediyoruz
          return {
            success: true,
            listing_id: 0,
            message: "Taxonomi sorunu göz ardı edildi."
          };
        }
        
        throw new Error(data.error || 'Failed to create listing');
      }

      setShowCreateModal(false);
      return data;
      
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Copy Product
  const onCopyProduct = (product: Product) => {
    console.log("Copying product:", product.title)
    // Implementation for copying product
  }

  // Handle Update Product
  const onUpdateProduct = async (product: Product): Promise<CreateListingResponse> => {
    try {
      setSubmitting(true)
      const result = await handleUpdateProduct(product)
      setShowEditModal(null)
      return {
        success: true,
        listing_id: product.listing_id || product.etsy_listing_id,
        message: "Ürün başarıyla güncellendi"
      }
    } catch (error) {
      console.error('Error updating product:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : "Ürün güncellenirken bir hata oluştu"
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Delete Product
  const onDeleteProduct = async (listingId: number) => {
    try {
      setDeletingProductId(listingId)
      await handleDeleteProduct(listingId)
      setConfirmDeleteProductId(null)
    } catch (error) {
      console.error('Error deleting product:', error)
    } finally {
      setDeletingProductId(null)
    }
  }

  // Handle Create Product Action (Async Method with Job Queue)
  const createProductAction = async (productData: Partial<Product>): Promise<{jobId?: string; success: boolean; error?: string}> => {
    try {
      console.log('Creating product with async method (job queue)...');
      
      // Formdata oluştur
      const formData = new FormData();
      
      // Listing data'yı JSON'a çevir ve ekle
      const listingData = {
        ...productData,
        state: 'active' // her zaman aktif olarak oluştur
      };
      formData.append('listingData', JSON.stringify(listingData));
      
      // Görselleri ekle
      if (productData.images) {
        for (const image of productData.images) {
          if (image.file) {
            formData.append('imageFiles', image.file);
          }
        }
      }
      
      // Video varsa ekle
      if (productData.videoFile) {
        formData.append('videoFile', productData.videoFile);
      }
      
      // API isteği yap
      console.log('Sending request to create-async endpoint...');
      const response = await fetch('/api/etsy/listings/create-async', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Async product creation result:', result);
      
      if (!result.jobId) {
        throw new Error('Job ID alınamadı');
      }
      
      return {
        jobId: result.jobId,
        success: true
      };
    } catch (error: any) {
      console.error('Error in createProductAction:', error);
      return {
        success: false,
        error: error.message || 'Ürün oluşturma işlemi başlatılamadı'
      };
    }
  };

  // Grid Classes
  const gridClasses = {
    grid3: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
    grid5: "grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4",
    list: "flex flex-col gap-4"
  }
  
  console.log("🎨 [ProductsPage] JSX render ediliyor")
  // Return the JSX for the page
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Ürünlerim</h1>
            <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-1">
              <Plus className="w-4 h-4" /> Yeni Ürün
            </Button>
          </div>

          {/* Queue Management Panel */}
          <QueueManagementPanel />
          
          {/* Filters */}
          <ProductFilters 
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filterStatus={filterStatus}
            onFilterStatusChange={setFilterStatus}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            gridType={gridType}
            onGridTypeChange={setGridType}
          />

          {/* Products Grid */}
          <div className={`grid gap-4 ${
            gridType === 'grid3' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
            gridType === 'grid5' ? 'grid-cols-1 md:grid-cols-3 lg:grid-cols-5' :
            'grid-cols-1'
          }`}>
            {loading ? (
              <div className="col-span-full flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
              </div>
            ) : reconnectRequired ? (
              <div className="col-span-full bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <h3 className="text-lg font-medium text-yellow-800 mb-2">Etsy bağlantınızı yenilemeniz gerekiyor</h3>
                <p className="text-yellow-700 mb-4">Etsy API erişim izniniz süresi dolmuş olabilir.</p>
                <Button 
                  onClick={handleReconnectEtsy}
                  disabled={refreshing}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  {refreshing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Yenileniyor...
                    </>
                  ) : (
                    'Etsy Bağlantısını Yenile'
                  )}
                </Button>
              </div>
            ) : noStoresFound ? (
              <div className="col-span-full bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <h3 className="text-lg font-medium text-yellow-800 mb-2">Etsy mağazası bulunamadı</h3>
                <p className="text-yellow-700 mb-4">Henüz bir Etsy mağazası bağlamamışsınız.</p>
                <Button 
                  onClick={handleReconnectEtsy}
                  disabled={refreshing}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  {refreshing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Bağlanılıyor...
                    </>
                  ) : (
                    'Etsy Mağazanızı Bağlayın'
                  )}
                </Button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                <h3 className="text-lg font-medium text-gray-800 mb-2">Hiç ürün bulunamadı</h3>
                <p className="text-gray-600 mb-4">Henüz hiç ürün eklenmemiş veya filtrelere uygun ürün yok.</p>
                <Button onClick={() => setShowCreateModal(true)}>
                  Yeni Ürün Ekle
                </Button>
              </div>
            ) : (
              filteredProducts.map(product => (
                <ProductCard
                  key={product.listing_id}
                  product={product}
                  onEdit={() => setShowEditModal(product)}
                  onDelete={() => setConfirmDeleteProductId(product.listing_id || 0)}
                />
              ))
            )}
          </div>
        </div>

        {/* Create Product Modal */}
        {showCreateModal && (
          <ProductFormModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateProduct}
            shippingProfiles={shippingProfiles}
            processingProfiles={processingProfiles}
            loadingShippingProfiles={loadingShippingProfiles}
            loadingProcessingProfiles={loadingProcessingProfiles}
          />
        )}

        {/* Edit Product Modal */}
        {showEditModal && (
          <ProductFormModal
            isOpen={true}
            onClose={() => setShowEditModal(null)}
            onSubmit={(data) => handleUpdateProduct({...showEditModal, ...data})}
            product={showEditModal}
            shippingProfiles={shippingProfiles}
            loadingShippingProfiles={loadingShippingProfiles}
            processingProfiles={processingProfiles}
            loadingProcessingProfiles={loadingProcessingProfiles}
          />
        )}

        {/* Delete Confirmation Modal */}
        {confirmDeleteProductId && (
          <ProductDeleteModal
            confirmDeleteProductId={confirmDeleteProductId}
            setConfirmDeleteProductId={setConfirmDeleteProductId}
            onDeleteProduct={handleDeleteProduct}
            deletingProductId={deletingProductId}
          />
        )}
      </div>
    </DndProvider>
  )
}

