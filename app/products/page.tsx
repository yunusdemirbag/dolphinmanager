// Import server-side functions and types
import { getConnectedStoreFromFirebaseAdmin, EtsyStore } from '@/lib/firebase-sync';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Store } from 'lucide-react';
import ProductsPageClient from '@/components/ProductsPageClient';
import Link from 'next/link';

// ASLA MOCK VERİ KULLANILMIYOR

async function getInitialProducts(userId: string) {
    initializeAdminApp();
    if (!adminDb) {
      console.error("Firebase Admin DB not initialized");
      return { products: [], nextCursor: null };
    }

    try {
      const productCount = await (await import('@/lib/firebase-sync')).countProductsInFirebaseAdmin(userId);

      if (productCount > 0) {
          console.log(`📦 Found ${productCount} products in Firebase for user ${userId}. Fetching from DB.`);
          const { getProductsFromFirebaseAdmin } = await import('@/lib/firebase-sync');
          return getProductsFromFirebaseAdmin(userId, 12, null);
      }

      console.log(`📦 No products found in Firebase for user ${userId}. Fetching from Etsy API.`);
      const store = await getConnectedStoreFromFirebaseAdmin(userId);
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

        if (allEtsyProducts.length > 0) {
            console.log(`🔄 Syncing ${allEtsyProducts.length} products to Firebase for user ${userId}...`);
            const { syncProductsToFirebaseAdmin } = await import('@/lib/firebase-sync');
            try {
              await syncProductsToFirebaseAdmin(userId, allEtsyProducts);
              console.log('✅ Sync complete.');
            } catch (error) {
              console.error('Error syncing products to Firebase:', error);
              // Senkronizasyon hatası olsa bile ürünleri göstermeye devam et
            }
        }

        const pageSize = 12;
        const firstPageProducts = allEtsyProducts.slice(0, pageSize);
        const nextCursor = allEtsyProducts.length > pageSize ? allEtsyProducts[pageSize - 1].listing_id : null;
        
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

// Server Component
export default async function ProductsPage() {
  const userId = process.env.MOCK_USER_ID || 'local-user-123'; // Gerçek kullanıcı ID'si .env.local dosyasından alınıyor
  
  // Fetch initial data on the server
  const store = await getConnectedStoreFromFirebaseAdmin(userId);
  const initialProductsData = await getInitialProducts(userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-black">Ürünler</h1>
        <p className="text-gray-600">Ürünlerinizi yönetin ve Etsy&apos;e yükleyin</p>
      </div>

      {/* Store Connection Status */}
      <Card className={`${store ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
        <CardContent className="p-4">
          {store ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <span className="font-medium text-green-800">
                    Etsy mağazası bağlı: {store.shop_name}
                  </span>
                  <p className="text-sm text-green-600">
                    Son senkronizasyon: {new Date(store.last_sync_at).toLocaleString('tr-TR')}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-green-600">ID: {store.shop_id}</span>
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

      {/* Pass initial data to the client component */}
      <ProductsPageClient 
        initialProducts={initialProductsData.products} 
        initialNextCursor={initialProductsData.nextCursor}
        userId={userId}
      />
    </div>
  );
}