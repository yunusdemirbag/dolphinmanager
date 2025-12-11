import { getAllUserStores } from '@/lib/firebase-admin';
import { StoreClientPage } from '@/components/StoreClientPage';
import AuthCheck from '../auth-check';

// Server Component
export default async function StoresPage() {
  const userId = process.env.MOCK_USER_ID || 'local-user-123';
  console.log("--- Mağazalar Sayfası ---");
  console.log("KULLANILAN KULLANICI ID:", userId);

  const stores = await getAllUserStores(userId);
  
  return (
    <AuthCheck>
      <StoreClientPage initialStores={stores} />
    </AuthCheck>
  );
}