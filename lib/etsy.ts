import { createClient } from '@/lib/supabase/server'

interface ShippingProfile {
  shipping_profile_id: number
  title: string
  min_processing_days: number
  max_processing_days: number
  origin_country_iso: string
  primary_cost: {
    amount: number
    divisor: number
    currency_code: string
  }
  secondary_cost: {
    amount: number
    divisor: number
    currency_code: string
  }
  destination_country_iso?: string
  destination_region?: string
  min_delivery_days: number
  max_delivery_days: number
}

class EtsyClient {
  private accessToken: string
  private shopId: string

  constructor(accessToken: string, shopId: string) {
    this.accessToken = accessToken
    this.shopId = shopId
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `https://openapi.etsy.com/v3${endpoint}`
    console.log('Making Etsy API request to:', url)

    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // API isteği için gerekli başlıkları hazırla
        const headers = {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_ETSY_API_KEY || '',
        };

        console.log('Request headers:', {
          'Authorization': 'Bearer ****' + this.accessToken.slice(-4),
          'x-api-key': headers['x-api-key'] ? 'Present' : 'Missing',
        });

        // API isteğini yap
        const response = await fetch(url, {
          ...options,
          headers,
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log('Raw response text:', responseText);

        // Rate limit aşıldıysa bekle ve tekrar dene
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '1');
          const delay = retryAfter * 1000 || baseDelay * attempt;
          console.log(`Rate limit exceeded. Waiting ${delay}ms before retry ${attempt}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Token geçersiz olduysa yenilemeyi dene
        if (response.status === 401) {
          console.log('Token expired or invalid. Attempting to refresh...');
          await this.refreshToken();
          continue;
        }

        if (!response.ok) {
          let errorMessage = 'Etsy API error';
          
          try {
            const errorJson = JSON.parse(responseText);
            errorMessage = errorJson.error || errorMessage;
          } catch (e) {
            errorMessage = responseText || errorMessage;
          }

          console.error('Etsy API error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorMessage,
            url,
            headers: Object.fromEntries(response.headers.entries())
          });

          throw new Error(errorMessage);
        }

        try {
          const data = JSON.parse(responseText);
          console.log('Parsed response data:', data);
          return data;
        } catch (e) {
          console.error('Failed to parse JSON response:', e);
          throw new Error('Invalid JSON response from Etsy API');
        }
      } catch (err: any) {
        const error = err as Error;
        console.error(`Request error (attempt ${attempt}/${maxRetries}):`, {
          url,
          error: error.message,
          cause: error.cause,
          stack: error.stack
        });

        // Son deneme değilse tekrar dene
        if (attempt < maxRetries) {
          const delay = baseDelay * attempt;
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }
  }

  private async refreshToken() {
    try {
      const response = await fetch('/api/etsy/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      this.accessToken = data.access_token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  }

  // Kargo profilleri
  async getShippingProfiles(): Promise<ShippingProfile[]> {
    try {
      console.log('Starting to fetch shipping profiles...');
      console.log('Shop ID being used:', this.shopId);
      
      // Önce aktif mağazayı kontrol et
      if (!this.shopId) {
        throw new Error('Shop ID is missing');
      }

      const endpoint = `/application/shops/${this.shopId}/shipping-profiles`;
      console.log('Making request to endpoint:', endpoint);
      
      const response = await this.request(endpoint);
      console.log('Raw API Response:', response);
      
      // Etsy API'den gelen yanıtı kontrol et
      if (!response || !response.results) {
        console.error('Invalid API response format:', response);
        throw new Error('Invalid API response format');
      }

      // Shipping profiles'ı doğru formata dönüştür
      const profiles = response.results.map((profile: any) => ({
        shipping_profile_id: profile.shipping_profile_id,
        title: profile.title,
        min_processing_days: profile.min_processing_days,
        max_processing_days: profile.max_processing_days,
        origin_country_iso: profile.origin_country_iso,
        primary_cost: {
          amount: profile.primary_cost?.amount || 0,
          divisor: profile.primary_cost?.divisor || 100,
          currency_code: profile.primary_cost?.currency_code || 'USD'
        },
        secondary_cost: {
          amount: profile.secondary_cost?.amount || 0,
          divisor: profile.secondary_cost?.divisor || 100,
          currency_code: profile.secondary_cost?.currency_code || 'USD'
        },
        destination_country_iso: profile.destination_country_iso,
        min_delivery_days: profile.min_delivery_days || 1,
        max_delivery_days: profile.max_delivery_days || 7
      }));

      console.log('Transformed shipping profiles:', profiles);
      return profiles;
    } catch (err: any) {
      const error = err as Error;
      console.error('Error in getShippingProfiles:', {
        name: error?.name || 'Unknown',
        message: error?.message || 'No message',
        stack: error?.stack,
        shopId: this.shopId,
        hasAccessToken: !!this.accessToken
      });
      throw error;
    }
  }
}

export async function getEtsyClient() {
  try {
    console.log('Getting Supabase client...');
    const supabase = await createClient();
    
    console.log('Getting user from Supabase...');
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('No user found in Supabase');
      throw new Error('Unauthorized');
    }

    console.log('Getting Etsy auth from Supabase...');
    const { data: etsyAuth, error: etsyAuthError } = await supabase
      .from('etsy_auth')
      .select('access_token, shop_id')
      .eq('user_id', user.id)
      .single();

    if (etsyAuthError) {
      console.error('Error fetching Etsy auth:', etsyAuthError);
      throw new Error('Failed to fetch Etsy authentication');
    }

    if (!etsyAuth) {
      console.error('No Etsy auth found for user');
      throw new Error('Etsy authentication not found');
    }

    console.log('Creating Etsy client with shop ID:', etsyAuth.shop_id);
    return new EtsyClient(etsyAuth.access_token, etsyAuth.shop_id);
  } catch (error) {
    console.error('Error in getEtsyClient:', error);
    throw error;
  }
}

export type { ShippingProfile } 