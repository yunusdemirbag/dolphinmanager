import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Product, ShippingProfile, EtsyProcessingProfile } from '@/types/product';

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
      
      // Önce mağaza bilgilerini al
      const storeResponse = await fetch('/api/etsy/stores');
      if (!storeResponse.ok) {
        throw new Error(`Error fetching store details: ${storeResponse.status}`);
      }
      
      const storeData = await storeResponse.json();
      if (!storeData.stores || storeData.stores.length === 0) {
        throw new Error('No Etsy stores found');
      }

      const firstStore = storeData.stores[0];
      setStoreDetails({
        shop_id: firstStore.shop_id,
        shop_name: firstStore.shop_name
      });

      // Mağaza ID'si ile kargo profillerini al
      const profilesResponse = await fetch(`/api/etsy/shipping-profiles`);
      if (!profilesResponse.ok) {
        throw new Error('Kargo profilleri yüklenirken bir hata oluştu');
      }

      const profilesData = await profilesResponse.json();
      console.log('Fetched shipping profiles:', profilesData);

      if (!profilesData.profiles || profilesData.profiles.length === 0) {
        toast.error('Etsy mağazanızda kargo profili bulunamadı. Lütfen önce Etsy\'de bir kargo profili oluşturun.');
        // Devam et, diğer profilleri yine de yükleyelim
      } else {
        setShippingProfiles(profilesData.profiles);
      }
      
      // İşlem profillerini al
      try {
        const processingProfilesResponse = await fetch(`/api/etsy/processing-profiles`);
        
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
        console.error('Error fetching processing profiles:', processingError);
        toast.error('İşlem profilleri yüklenirken bir hata oluştu');
        
        // Hata durumunda varsayılan profil ekle
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
      console.error('Error in fetchStoreDetailsAndProfiles:', error);
      toast.error(error instanceof Error ? error.message : 'Profiller yüklenirken bir hata oluştu');
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