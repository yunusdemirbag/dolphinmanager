import { getConnectedStoreFromFirebaseAdmin, countProductsInFirebaseAdmin, EtsyStore } from '@/lib/firebase-sync';
import { StoreClientPage } from '@/components/StoreClientPage';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

// Server Component
export default async function StoresPage() {
  // Fetch data on the server
  // In a real app, this would come from the user's session
  const userId = process.env.MOCK_USER_ID || 'local-user-123';
  console.log("--- Mağazalar Sayfası ---");
  console.log("KULLANILAN KULLANICI ID:", userId);

  const store = await getConnectedStoreFromFirebaseAdmin(userId);
  
  console.log("BULUNAN MAĞAZA BİLGİSİ:", store);

  if (!store) {
    console.error("HATA: Bu kullanıcı ID'si için Firebase'de bağlı bir mağaza bulunamadı. Lütfen .env.local dosyasındaki MOCK_USER_ID'yi kontrol edin.");
  }

  let augmentedStore = null;
  if (store) {
    const productCountUserId = store.user_id || userId;
    console.log(`Ürün sayısı için kullanılacak ID: ${productCountUserId}`);
    const totalProducts = await countProductsInFirebaseAdmin(productCountUserId);
    console.log(`Bulunan ürün sayısı: ${totalProducts}`);

    augmentedStore = {
      ...store,
      total_products: totalProducts,
      active_listings: 0, // Placeholder
      monthly_sales: '0.00', // Placeholder
      connected_at: store.connected_at ? (typeof store.connected_at === 'string' ? store.connected_at : store.connected_at.toISOString?.() || store.connected_at.toString()) : null,
      last_sync_at: store.last_sync_at ? (typeof store.last_sync_at === 'string' ? store.last_sync_at : store.last_sync_at.toISOString?.() || store.last_sync_at.toString()) : null,
      last_activated_at: store.last_activated_at ? (typeof store.last_activated_at === 'string' ? store.last_activated_at : store.last_activated_at.toISOString?.() || store.last_activated_at.toString()) : null,
      last_token_refresh: store.last_token_refresh ? (typeof store.last_token_refresh === 'string' ? store.last_token_refresh : store.last_token_refresh.toISOString?.() || store.last_token_refresh.toString()) : null,
    };
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-black">Mağazalar</h1>
        <p className="text-gray-800">Bağlı Etsy mağazanızı yönetin</p>
      </div>
      <StoreClientPage store={augmentedStore} />
    </div>
  );
}