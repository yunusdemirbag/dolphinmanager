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
  const [loadingShippingProfiles, setLoadingShippingProfiles] = useState(true);
  
  // Processing Profiles State
  const [processingProfiles, setProcessingProfiles] = useState<EtsyProcessingProfile[]>([]);
  const [loadingProcessingProfiles, setLoadingProcessingProfiles] = useState(true);
  
  const [storeDetails, setStoreDetails] = useState<StoreDetails | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isEtsyConnected, setIsEtsyConnected] = useState(true);

  // Fetch store details and shipping profiles
  const fetchStoreDetailsAndProfiles = async () => {
    try {
      setLoadingShippingProfiles(true);
      setLoadingProcessingProfiles(true);
      setConnectionError(null);
      
      // Mağaza bilgilerini al
      const storeResponse = await fetch('/api/etsy/stores');
      const storeData = await storeResponse.json();
      
      // Etsy bağlantısı kontrolü
      if (storeResponse.status === 401 || (storeData.error && storeData.error.includes('Unauthorized'))) {
        setIsEtsyConnected(false);
        setConnectionError('Etsy hesabınıza bağlı değilsiniz. Lütfen önce Etsy hesabınızı bağlayın.');
        return;
      }
      
      if (!storeData.stores || storeData.stores.length === 0) {
        setIsEtsyConnected(false);
        setConnectionError('Etsy mağazanız bulunamadı. Lütfen Etsy hesabınızı bağlayın veya mağaza oluşturun.');
        return;
      }
      
      setStoreDetails({
        shop_id: storeData.stores[0].shop_id,
        shop_name: storeData.stores[0].shop_name
      });
      
      // Kargo profillerini al
      const shippingProfilesResponse = await fetch('/api/etsy/shipping-profiles');
      
      if (!shippingProfilesResponse.ok) {
        if (shippingProfilesResponse.status === 404) {
          console.warn('Mağaza için kargo profili bulunamadı');
          // Varsayılan profil ekle - ShippingProfile tipine uygun şekilde
          const defaultProfile: ShippingProfile = {
            shipping_profile_id: 0,
            title: 'Varsayılan Kargo Profili',
            user_id: storeData.stores[0].user_id || 0,
            min_processing_days: 1,
            max_processing_days: 3,
            processing_days_display_label: '1-3 gün',
            origin_country_iso: 'TR',
            is_deleted: false,
            shipping_carrier_id: 0,
            mail_class: 'None',
            min_delivery_days: 3,
            max_delivery_days: 5,
            destination_country_iso: 'TR',
            destination_region: 'EU',
            primary_cost: {
              amount: 1000,
              divisor: 100,
              currency_code: 'USD'
            },
            secondary_cost: {
              amount: 500,
              divisor: 100,
              currency_code: 'USD'
            }
          };
          setShippingProfiles([defaultProfile]);
        } else {
          console.error('Kargo profilleri alınamadı:', await shippingProfilesResponse.text());
          setConnectionError('Kargo profilleri yüklenirken bir sorun oluştu.');
        }
      } else {
        const shippingProfilesData = await shippingProfilesResponse.json();
        setShippingProfiles(shippingProfilesData.profiles || []);
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
      setConnectionError(error instanceof Error ? error.message : 'Profiller yüklenirken bir hata oluştu');
      setIsEtsyConnected(false);
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
    fetchStoreDetailsAndProfiles,
    connectionError,
    isEtsyConnected
  };
} 