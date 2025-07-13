// Import server-side functions and types
import { getConnectedStoreFromFirebaseAdmin, EtsyStore } from '@/lib/firebase-sync';
import { adminDb, initializeAdminApp, getAllUserStores } from '@/lib/firebase-admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Store } from 'lucide-react';
import ProductsPageClient from '@/components/ProductsPageClient';
import Link from 'next/link';
import AuthCheck from '../auth-check';

// ASLA MOCK VERİ KULLANILMIYOR

async function getInitialProducts(userId: string) {
    try {
      initializeAdminApp();
      if (!adminDb) {
        console.error("Firebase Admin DB not initialized");
        return { products: [], nextCursor: null };
      }

      const productCount = await (await import('@/lib/firebase-sync')).countProductsInFirebaseAdmin(userId);

      if (productCount > 0) {
          console.log(`📦 Found ${productCount} products in Firebase for user ${userId}. Fetching from DB.`);
          const { getProductsFromFirebaseAdmin } = await import('@/lib/firebase-sync');
          const result = await getProductsFromFirebaseAdmin(userId, 12, null);
          
          // Ensure the result always has safe array structures
          return {
            products: Array.isArray(result.products) ? result.products.map(product => ({
              ...product,
              tags: Array.isArray(product.tags) ? product.tags : [],
              images: Array.isArray(product.images) ? product.images : [],
              variations: Array.isArray(product.variations) ? product.variations : []
            })) : [],
            nextCursor: result.nextCursor || null
          };
      }

      console.log(`📦 No products found in Firebase for user ${userId}. Fetching from Etsy API.`);
      const stores = await getAllUserStores(userId);
      const store = stores.find(s => s.is_active && s.is_connected);
      if (!store) {
          console.error('No active Etsy store connected for this user.');
          return { products: [], nextCursor: null };
      }

      try {
        const apiKeyDoc = await adminDb.collection('etsy_api_keys').doc(String(store.shop_id)).get();
        if (!apiKeyDoc.exists) {
            console.error('API keys for the store not found.');
            return { products: [], nextCursor: null };
        }
        const { api_key: apiKey, access_token: accessToken } = apiKeyDoc.data()!;

        if (!apiKey || !accessToken) {
            console.error('Incomplete API credentials for the store.');
            return { products: [], nextCursor: null };
        }
        
        const { fetchAllEtsyListings } = await import('@/lib/etsy-api');
        const allEtsyProducts = await fetchAllEtsyListings(String(store.shop_id), apiKey, accessToken);
        
        // Ensure allEtsyProducts is always an array with safe structures
        const products = Array.isArray(allEtsyProducts) ? allEtsyProducts.map(product => ({
          ...product,
          tags: Array.isArray(product.tags) ? product.tags : [],
          images: Array.isArray(product.images) ? product.images : [],
          variations: Array.isArray(product.variations) ? product.variations : []
        })) : [];

        if (products.length > 0) {
            console.log(`🔄 Syncing ${products.length} products to Firebase for user ${userId}...`);
            const { syncProductsToFirebaseAdmin } = await import('@/lib/firebase-sync');
            try {
              await syncProductsToFirebaseAdmin(userId, products);
              console.log('✅ Sync complete.');
            } catch (error) {
              console.error('Error syncing products to Firebase:', error);
              // Senkronizasyon hatası olsa bile ürünleri göstermeye devam et
            }
        }

        const pageSize = 12;
        const firstPageProducts = products.slice(0, pageSize);
        const nextCursor = products.length > pageSize && products[pageSize - 1] ? products[pageSize - 1].listing_id : null;
        
        return { products: firstPageProducts, nextCursor };
      } catch (error) {
        console.error('Error fetching products from Etsy API:', error);
        return { products: [], nextCursor: null };
      }
    } catch (error) {
      console.error('Error in getInitialProducts:', error);
      return { products: [], nextCursor: null };
    }
}

// Force dynamic rendering to avoid static generation errors
export const dynamic = 'force-dynamic';

// Server Component
export default async function ProductsPage() {
  const userId = process.env.MOCK_USER_ID || 'local-user-123'; // Gerçek kullanıcı ID'si .env.local dosyasından alınıyor
  
  // Fetch initial data on the server - YENİ MULTİ-STORE SİSTEMİ
  const allUserStores = await getAllUserStores(userId);
  
  // Sadece bağlı mağazaları al (mağazalar sayfası ile tutarlı)
  const connectedStores = allUserStores.filter(s => s.is_connected !== false && !s.disconnected_at);
  const activeStore = connectedStores.find(s => s.is_active);
  const initialProductsData = await getInitialProducts(userId);

  return (
    <AuthCheck>
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-black">Ürünler</h1>
        <p className="text-gray-800">Ürünlerinizi yönetin ve Etsy&apos;e yükleyin</p>
      </div>

      {/* Store Connection Status - YENİ MULTİ-STORE SİSTEMİ */}
      <Card className={`${activeStore ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
        <CardContent className="p-4">
          {activeStore ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <span className="font-medium text-green-800">
                    Aktif mağaza: {activeStore.shop_name}
                  </span>
                  <p className="text-sm text-green-600">
                    Son senkronizasyon: {activeStore.last_sync_at ? (() => {
                      try {
                        const date = new Date(activeStore.last_sync_at);
                        return isNaN(date.getTime()) ? 'Geçersiz tarih' : date.toLocaleString('tr-TR');
                      } catch {
                        return 'Geçersiz tarih';
                      }
                    })() : 'Henüz yok'}
                  </p>
                  {connectedStores.length > 1 && (
                    <p className="text-xs text-green-600">
                      Toplam {connectedStores.length} mağaza bağlı
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-green-600">ID: {activeStore.shop_id}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-orange-800">Etsy mağazası bağlı değil</span>
              </div>
              <Button asChild size="sm">
                <Link href="/stores">
                  <Store className="w-4 h-4 mr-2" /> Mağaza Bağla
                </Link>
                </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pass initial data to the client component - YENİ MULTİ-STORE SİSTEMİ */}
      <ProductsPageClient 
        initialProducts={initialProductsData.products} 
        initialNextCursor={initialProductsData.nextCursor}
        store={activeStore ? {
          ...activeStore,
          connected_at: activeStore.connected_at ? (typeof activeStore.connected_at === 'string' ? activeStore.connected_at : (() => {
            try {
              const date = new Date(activeStore.connected_at);
              return isNaN(date.getTime()) ? activeStore.connected_at.toString() : date.toISOString();
            } catch {
              return activeStore.connected_at.toString();
            }
          })()) : null,
          last_sync_at: activeStore.last_sync_at ? (typeof activeStore.last_sync_at === 'string' ? activeStore.last_sync_at : (() => {
            try {
              const date = new Date(activeStore.last_sync_at);
              return isNaN(date.getTime()) ? activeStore.last_sync_at.toString() : date.toISOString();
            } catch {
              return activeStore.last_sync_at.toString();
            }
          })()) : null,
          last_activated_at: activeStore.last_activated_at ? (typeof activeStore.last_activated_at === 'string' ? activeStore.last_activated_at : (() => {
            try {
              const date = new Date(activeStore.last_activated_at);
              return isNaN(date.getTime()) ? activeStore.last_activated_at.toString() : date.toISOString();
            } catch {
              return activeStore.last_activated_at.toString();
            }
          })()) : null,
          last_token_refresh: activeStore.last_token_refresh ? (typeof activeStore.last_token_refresh === 'string' ? activeStore.last_token_refresh : (() => {
            try {
              const date = new Date(activeStore.last_token_refresh);
              return isNaN(date.getTime()) ? activeStore.last_token_refresh.toString() : date.toISOString();
            } catch {
              return activeStore.last_token_refresh.toString();
            }
          })()) : null,
        } : null}
        userId={userId}
      />
    </div>
    </AuthCheck>
  );
}