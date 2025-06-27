import { Metadata } from 'next';
import { StoreClientPage } from '@/components/StoreClientPage';
import { getAllUserStores } from '@/lib/firebase-admin';

export const metadata: Metadata = {
  title: 'Mağaza Yönetimi',
  description: 'Etsy mağazalarınızı yönetin',
};

export const dynamic = 'force-dynamic';

export default async function StoresPage() {
  const userId = process.env.MOCK_USER_ID || 'local-user-123';
  const stores = await getAllUserStores(userId);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <StoreClientPage initialStores={stores} />
    </div>
  );
}