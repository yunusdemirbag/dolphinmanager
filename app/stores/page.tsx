import { getAllUserStores } from '@/lib/firebase-admin';
import { StoreClientPage } from '@/components/StoreClientPage';

// Server Component
export default async function StoresPage() {
  const userId = process.env.MOCK_USER_ID || 'local-user-123';
  console.log("--- Mağazalar Sayfası ---");
  console.log("KULLANILAN KULLANICI ID:", userId);

  const stores = await getAllUserStores(userId);
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-black">Mağazalar</h1>
        <p className="text-gray-800">Bağlı Etsy mağazanızı yönetin</p>
      </div>
      <StoreClientPage initialStores={stores} />
    </div>
  );
}