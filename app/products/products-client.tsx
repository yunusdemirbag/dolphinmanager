import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Product, ShippingProfile, EtsyProcessingProfile } from '@/types/product';
import { useRouter } from "next/navigation";
import { ProductFormModal } from "@/components/product/ProductFormModal";
import { ProductDeleteModal } from "@/components/product/ProductDeleteModal";
import { ProductFilters } from "@/components/product/ProductFilters";
import { QueueStatusIndicator } from "@/components/product/QueueStatusIndicator";

interface StoreDetails {
  shop_id: number;
  shop_name: string;
}

export function useProductsClient() {
  // Shipping Profiles State
  const [shippingProfiles, setShippingProfiles] = useState<ShippingProfile[]>([]);
  const [loadingShippingProfiles, setLoadingShippingProfiles] = useState(false);
  
  // Processing Profiles State
  const [processingProfiles, setProcessingProfiles] = useState<EtsyProcessingProfile[]>([]);
  const [loadingProcessingProfiles, setLoadingProcessingProfiles] = useState(false);
  
  const [storeDetails, setStoreDetails] = useState<StoreDetails | null>(null);

  // Fetch store details and shipping profiles
  const fetchStoreDetailsAndProfiles = async () => {
    try {
      setLoadingShippingProfiles(true);
      setLoadingProcessingProfiles(true);
      
      let storeInfo = null;
      
      try {
        // Önce mağaza bilgilerini al
        const storeResponse = await fetch('/api/etsy/stores', {
          headers: { 'Cache-Control': 'no-cache' },
          signal: AbortSignal.timeout(8000)
        });
        
        if (!storeResponse.ok) {
          console.warn(`Mağaza bilgileri alınamadı: ${storeResponse.status}`);
          // Hata olsa bile devam et, varsayılan değerlerle çalışacağız
        } else {
          const storeData = await storeResponse.json();
          if (storeData.stores && storeData.stores.length > 0) {
            const firstStore = storeData.stores[0];
            storeInfo = {
              shop_id: firstStore.shop_id,
              shop_name: firstStore.shop_name
            };
            setStoreDetails(storeInfo);
          } else {
            console.warn('Etsy mağaza bulunamadı, varsayılan ayarlar kullanılacak');
          }
        }
      } catch (storeError) {
        console.error('Mağaza bilgileri alınamadı:', storeError);
        // Hata olsa bile devam et
      }
      
      // Kargo profilleri - varsayılan profil oluştur
      try {
        const profilesResponse = await fetch(`/api/etsy/shipping-profiles`, {
          headers: { 'Cache-Control': 'no-cache' },
          signal: AbortSignal.timeout(8000)
        });
        
        if (!profilesResponse.ok) {
          throw new Error('Kargo profilleri yüklenirken bir hata oluştu');
        }

        const profilesData = await profilesResponse.json();
        console.log('Fetched shipping profiles:', profilesData);

        if (!profilesData.profiles || profilesData.profiles.length === 0) {
          console.warn('Etsy mağazanızda kargo profili bulunamadı');
          
          // Varsayılan profil oluştur
          const defaultProfile = {
            shipping_profile_id: 0,
            title: 'Varsayılan Kargo Profili',
            min_processing_days: 1,
            max_processing_days: 3,
            origin_country_iso: 'TR',
            destination_country_iso: 'TR',
            destination_region: 'local',
            primary_cost: 0,
            secondary_cost: 0,
            processing_time_unit: 'days'
          };
          setShippingProfiles([defaultProfile]);
        } else {
          setShippingProfiles(profilesData.profiles);
        }
      } catch (profilesError) {
        console.error('Kargo profilleri yüklenirken hata:', profilesError);
        // Hata durumunda varsayılan profil ekle
        const defaultProfile = {
          shipping_profile_id: 0,
          title: 'Varsayılan Kargo Profili',
          min_processing_days: 1,
          max_processing_days: 3,
          origin_country_iso: 'TR',
          destination_country_iso: 'TR',
          destination_region: 'local',
          primary_cost: 0,
          secondary_cost: 0,
          processing_time_unit: 'days'
        };
        setShippingProfiles([defaultProfile]);
      }
      
      // İşlem profilleri
      try {
        const processingProfilesResponse = await fetch(`/api/etsy/processing-profiles`, {
          headers: { 'Cache-Control': 'no-cache' },
          signal: AbortSignal.timeout(8000)
        });
        
        if (!processingProfilesResponse.ok) {
          throw new Error('İşlem profilleri yüklenirken bir hata oluştu');
        }
        
        const processingProfilesData = await processingProfilesResponse.json();
        console.log('Fetched processing profiles:', processingProfilesData);
        
        if (!processingProfilesData.profiles || processingProfilesData.profiles.length === 0) {
          console.warn('Etsy mağazanızda işlem profili bulunamadı.');
          // Varsayılan profil oluştur
          const defaultProfile = {
            processing_profile_id: 0,
            title: 'Varsayılan İşlem Profili',
            user_id: 0,
            min_processing_days: 1,
            max_processing_days: 3,
            processing_days_display_label: '1-3 gün',
            is_deleted: false
          };
          setProcessingProfiles([defaultProfile]);
        } else {
          setProcessingProfiles(processingProfilesData.profiles);
        }
      } catch (processingError) {
        console.error('İşlem profilleri yüklenirken hata:', processingError);
        
        // Varsayılan profil ekle
        const defaultProfile = {
          processing_profile_id: 0,
          title: 'Varsayılan İşlem Profili',
          user_id: 0,
          min_processing_days: 1,
          max_processing_days: 3,
          processing_days_display_label: '1-3 gün',
          is_deleted: false
        };
        setProcessingProfiles([defaultProfile]);
      }
    } catch (error) {
      console.error('Genel hata - fetchStoreDetailsAndProfiles:', error);
      
      // Genel hata - varsayılan değerler ayarla
      if (!storeDetails) {
        setStoreDetails({
          shop_id: 0,
          shop_name: 'Varsayılan Mağaza'
        });
      }
      
      if (shippingProfiles.length === 0) {
        setShippingProfiles([{
          shipping_profile_id: 0,
          title: 'Varsayılan Kargo Profili',
          min_processing_days: 1,
          max_processing_days: 3,
          origin_country_iso: 'TR',
          destination_country_iso: 'TR',
          destination_region: 'local',
          primary_cost: 0,
          secondary_cost: 0,
          processing_time_unit: 'days'
        }]);
      }
      
      if (processingProfiles.length === 0) {
        setProcessingProfiles([{
          processing_profile_id: 0,
          title: 'Varsayılan İşlem Profili',
          user_id: 0,
          min_processing_days: 1,
          max_processing_days: 3,
          processing_days_display_label: '1-3 gün',
          is_deleted: false
        }]);
      }
      
      toast.error('Mağaza ve profil bilgileri yüklenemedi, varsayılan ayarlar kullanılacak');
    } finally {
      setLoadingShippingProfiles(false);
      setLoadingProcessingProfiles(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchStoreDetailsAndProfiles();
  }, []);

  return {
    shippingProfiles,
    loadingShippingProfiles,
    processingProfiles,
    loadingProcessingProfiles,
    storeDetails,
    fetchStoreDetailsAndProfiles
  };
}

export default function ProductsClient() {
  // ... existing code ...

  return (
    <div className="py-6">
      {/* Kuyruk durumu göstergesi */}
      <QueueStatusIndicator />
      
      {/* ... existing code ... */}
    </div>
  );
} 